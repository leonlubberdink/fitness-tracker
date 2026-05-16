import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import {
  exercises,
  healthCoachChangeProposals,
  planWorkouts,
  plans,
  users,
  workoutTemplateExercises,
  workoutTemplates,
} from "@/db/schema";
import { formatExerciseCategories, normalizeExerciseCategories } from "@/features/exercises/categories";
import { getPlanWeekLongLabel, getPlanWorkoutScheduledDate, isPlanWorkoutEditable } from "@/features/plans/utils";
import { EXERCISE_UNITS } from "@/lib/exercise-units";
import { getTodayDateKey } from "@/lib/date";

type ProposalKind =
  | "exercise_create"
  | "exercise_update"
  | "workout_template_create"
  | "workout_template_update"
  | "plan_create"
  | "plan_update"
  | "plan_workout_upsert";

type ProposalDiff = {
  changes: Array<{
    after: string | null;
    before: string | null;
    label: string;
  }>;
  details?: string[];
};

type ProposalCreationResult = {
  id: string;
  kind: ProposalKind;
  summary: string;
  title: string;
};

type ProposalApplyResult = {
  entityId: string;
  path: string;
  successMessage: string;
};

const uuidField = (message: string) => z.string().trim().uuid(message);

const exerciseNameField = z
  .string()
  .trim()
  .min(1, "Exercise name is required.")
  .max(120, "Exercise name must be 120 characters or less.");

const exerciseCategoryField = z
  .string()
  .trim()
  .min(1, "Add at least one category.")
  .refine(
    (value) => normalizeExerciseCategories(value).length > 0,
    "Add at least one category.",
  );

const exerciseNoteField = z
  .string()
  .trim()
  .max(1000, "Note must be 1000 characters or less.")
  .optional()
  .transform((value) => value ?? "");

const exerciseDefaultUnitField = z.enum(EXERCISE_UNITS);

const positiveIntegerField = (label: string) =>
  z
    .number({
      error: `${label} must be a number.`,
    })
    .int(`${label} must be a whole number.`)
    .positive(`${label} must be greater than zero.`);

const templateNameField = z
  .string()
  .trim()
  .min(1, "Template name is required.")
  .max(80, "Template name must be 80 characters or less.");

const planNameField = z
  .string()
  .trim()
  .min(1, "Plan name is required.")
  .max(80, "Plan name must be 80 characters or less.");

const planGoalField = z
  .string()
  .trim()
  .min(1, "Plan goal is required.")
  .max(160, "Plan goal must be 160 characters or less.");

const weekdayField = z
  .number({
    error: "Weekday must be a number.",
  })
  .int("Weekday must be a whole number.")
  .min(1, "Weekday must be between 1 and 7.")
  .max(7, "Weekday must be between 1 and 7.");

const exerciseCreateProposalSchema = z.object({
  defaultUnit: exerciseDefaultUnitField,
  category: exerciseCategoryField,
  name: exerciseNameField,
  note: exerciseNoteField,
});

const exerciseUpdateProposalSchema = exerciseCreateProposalSchema.extend({
  exerciseId: uuidField("Invalid exercise."),
});

const templateCreateProposalSchema = z.object({
  exerciseIds: z
    .array(uuidField("Invalid exercise."))
    .min(1, "Add at least one exercise.")
    .refine(
      (exerciseIds) => new Set(exerciseIds).size === exerciseIds.length,
      "Template exercises must be unique.",
    ),
  name: templateNameField,
});

const templateUpdateProposalSchema = z
  .object({
    exerciseIds: z
      .array(uuidField("Invalid exercise."))
      .min(1, "Add at least one exercise.")
      .refine(
        (exerciseIds) => new Set(exerciseIds).size === exerciseIds.length,
        "Template exercises must be unique.",
      )
      .optional(),
    name: templateNameField.optional(),
    templateId: uuidField("Invalid workout template."),
  })
  .refine(
    (value) => value.name !== undefined || value.exerciseIds !== undefined,
    "Provide a name change or a new exercise order.",
  );

const planWorkoutDraftSchema = z.object({
  weekday: weekdayField,
  weekNumber: positiveIntegerField("Week number"),
  workoutTemplateId: uuidField("Invalid workout template."),
});

const planCreateProposalSchema = z
  .object({
    durationWeeks: positiveIntegerField("Duration weeks").max(
      52,
      "Plan length must be 52 weeks or less.",
    ),
    goal: planGoalField,
    name: planNameField,
    workouts: z.array(planWorkoutDraftSchema).max(366).optional(),
  })
  .superRefine((value, context) => {
    const seenSlots = new Set<string>();

    for (const [index, workout] of (value.workouts ?? []).entries()) {
      if (workout.weekNumber > value.durationWeeks) {
        context.addIssue({
          code: "custom",
          message: "Workout week cannot exceed the plan duration.",
          path: ["workouts", index, "weekNumber"],
        });
      }

      const slotKey = `${workout.weekNumber}:${workout.weekday}`;

      if (seenSlots.has(slotKey)) {
        context.addIssue({
          code: "custom",
          message: "Each plan day can only have one workout.",
          path: ["workouts", index, "weekday"],
        });
      }

      seenSlots.add(slotKey);
    }
  });

const planUpdateProposalSchema = z
  .object({
    durationWeeks: positiveIntegerField("Duration weeks")
      .max(52, "Plan length must be 52 weeks or less.")
      .optional(),
    goal: planGoalField.optional(),
    name: planNameField.optional(),
    planId: uuidField("Invalid plan."),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.goal !== undefined ||
      value.durationWeeks !== undefined,
    "Provide at least one plan field to update.",
  );

const planWorkoutUpsertProposalSchema = z.object({
  existingPlanWorkoutId: uuidField("Invalid planned workout.").optional(),
  planId: uuidField("Invalid plan."),
  weekday: weekdayField,
  weekNumber: positiveIntegerField("Week number"),
  workoutTemplateId: uuidField("Invalid workout template."),
});

function createDiffChange(
  label: string,
  before: string | null | undefined,
  after: string | null | undefined,
) {
  return {
    after: after ?? null,
    before: before ?? null,
    label,
  };
}

function normalizeCategoriesForStorage(value: string) {
  return formatExerciseCategories(normalizeExerciseCategories(value));
}

function getOptionalNoteValue(value: string) {
  return value.trim() || null;
}

function formatWeekday(weekday: number) {
  return getPlanWeekLongLabel(weekday);
}

function formatPlanWorkoutDetail(workout: {
  templateName: string;
  weekNumber: number;
  weekday: number;
}) {
  return `Week ${workout.weekNumber} · ${formatWeekday(workout.weekday)} · ${workout.templateName}`;
}

async function ensureExerciseIdsForUser(userId: string, exerciseIds: string[]) {
  if (exerciseIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: exercises.id,
      name: exercises.name,
    })
    .from(exercises)
    .where(and(eq(exercises.userId, userId), inArray(exercises.id, exerciseIds)));

  if (rows.length !== exerciseIds.length) {
    throw new Error("One or more exercises no longer exist in your library.");
  }

  const rowMap = new Map(rows.map((row) => [row.id, row]));
  return exerciseIds.map((exerciseId) => rowMap.get(exerciseId) as (typeof rows)[number]);
}

async function ensureTemplateIdsForUser(
  userId: string,
  templateIds: string[],
) {
  if (templateIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: workoutTemplates.id,
      name: workoutTemplates.name,
    })
    .from(workoutTemplates)
    .where(
      and(
        eq(workoutTemplates.userId, userId),
        inArray(workoutTemplates.id, templateIds),
      ),
    );

  if (rows.length !== templateIds.length) {
    throw new Error("One or more workout templates no longer exist.");
  }

  const rowMap = new Map(rows.map((row) => [row.id, row]));
  return templateIds.map((templateId) => rowMap.get(templateId) as (typeof rows)[number]);
}

async function requirePlanForUser(userId: string, planId: string) {
  const [plan] = await db
    .select({
      durationWeeks: plans.durationWeeks,
      goal: plans.goal,
      id: plans.id,
      name: plans.name,
      startDate: plans.startDate,
      status: plans.status,
    })
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .limit(1);

  if (!plan) {
    throw new Error("That plan no longer exists.");
  }

  return plan;
}

async function requireTemplateForUser(userId: string, templateId: string) {
  const [template] = await db
    .select({
      id: workoutTemplates.id,
      name: workoutTemplates.name,
    })
    .from(workoutTemplates)
    .where(
      and(
        eq(workoutTemplates.id, templateId),
        eq(workoutTemplates.userId, userId),
      ),
    )
    .limit(1);

  if (!template) {
    throw new Error("That workout template no longer exists.");
  }

  return template;
}

async function requireExerciseForUser(userId: string, exerciseId: string) {
  const [exercise] = await db
    .select({
      category: exercises.category,
      defaultUnit: exercises.defaultUnit,
      id: exercises.id,
      name: exercises.name,
      note: exercises.note,
    })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
    .limit(1);

  if (!exercise) {
    throw new Error("That exercise no longer exists.");
  }

  return exercise;
}

async function requirePlanWorkoutForPlan(planId: string, planWorkoutId: string) {
  const [planWorkout] = await db
    .select({
      id: planWorkouts.id,
      state: planWorkouts.state,
      weekNumber: planWorkouts.weekNumber,
      weekday: planWorkouts.weekday,
    })
    .from(planWorkouts)
    .where(
      and(eq(planWorkouts.id, planWorkoutId), eq(planWorkouts.planId, planId)),
    )
    .limit(1);

  if (!planWorkout) {
    throw new Error("That planned workout no longer exists.");
  }

  return planWorkout;
}

async function getUserTimeZone(userId: string) {
  const [user] = await db
    .select({
      timeZone: users.timeZone,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.timeZone ?? "UTC";
}

async function ensureNoExerciseNameConflict(
  userId: string,
  name: string,
  exceptExerciseId?: string,
) {
  const conditions = [
    eq(exercises.userId, userId),
    sql`lower(${exercises.name}) = ${name.toLowerCase()}`,
  ];

  if (exceptExerciseId) {
    conditions.push(ne(exercises.id, exceptExerciseId));
  }

  const [existingExercise] = await db
    .select({
      id: exercises.id,
    })
    .from(exercises)
    .where(and(...conditions))
    .limit(1);

  if (existingExercise) {
    throw new Error("An exercise with that name already exists.");
  }
}

async function ensureNoTemplateNameConflict(
  userId: string,
  name: string,
  exceptTemplateId?: string,
) {
  const conditions = [
    eq(workoutTemplates.userId, userId),
    sql`lower(${workoutTemplates.name}) = ${name.toLowerCase()}`,
  ];

  if (exceptTemplateId) {
    conditions.push(ne(workoutTemplates.id, exceptTemplateId));
  }

  const [existingTemplate] = await db
    .select({
      id: workoutTemplates.id,
    })
    .from(workoutTemplates)
    .where(and(...conditions))
    .limit(1);

  if (existingTemplate) {
    throw new Error("A workout template with that name already exists.");
  }
}

async function insertProposal({
  conversationId,
  diff,
  kind,
  payload,
  summary,
  title,
  userId,
}: {
  conversationId: string;
  diff: ProposalDiff;
  kind: ProposalKind;
  payload: Record<string, unknown>;
  summary: string;
  title: string;
  userId: string;
}) {
  const proposalId = randomUUID();

  await db.insert(healthCoachChangeProposals).values({
    conversationId,
    diff,
    id: proposalId,
    kind,
    payload,
    summary,
    title,
    userId,
  });

  return proposalId;
}

export async function createExerciseCreateProposal({
  conversationId,
  input,
  userId,
}: {
  conversationId: string;
  input: unknown;
  userId: string;
}): Promise<ProposalCreationResult> {
  const parsedInput = exerciseCreateProposalSchema.parse(input);
  await ensureNoExerciseNameConflict(userId, parsedInput.name);

  const formattedCategory = normalizeCategoriesForStorage(parsedInput.category);
  const proposalId = await insertProposal({
    conversationId,
    diff: {
      changes: [
        createDiffChange("Name", null, parsedInput.name),
        createDiffChange("Categories", null, formattedCategory),
        createDiffChange("Default unit", null, parsedInput.defaultUnit),
        createDiffChange("Note", null, getOptionalNoteValue(parsedInput.note)),
      ],
    },
    kind: "exercise_create",
    payload: {
      ...parsedInput,
      category: formattedCategory,
      note: parsedInput.note.trim(),
    },
    summary: `Create exercise "${parsedInput.name}".`,
    title: "Create exercise",
    userId,
  });

  return {
    id: proposalId,
    kind: "exercise_create",
    summary: `Create exercise "${parsedInput.name}".`,
    title: "Create exercise",
  };
}

export async function createExerciseUpdateProposal({
  conversationId,
  input,
  userId,
}: {
  conversationId: string;
  input: unknown;
  userId: string;
}): Promise<ProposalCreationResult> {
  const parsedInput = exerciseUpdateProposalSchema.parse(input);
  const existingExercise = await requireExerciseForUser(userId, parsedInput.exerciseId);
  await ensureNoExerciseNameConflict(userId, parsedInput.name, parsedInput.exerciseId);

  const formattedCategory = normalizeCategoriesForStorage(parsedInput.category);
  const proposalId = await insertProposal({
    conversationId,
    diff: {
      changes: [
        createDiffChange("Name", existingExercise.name, parsedInput.name),
        createDiffChange("Categories", existingExercise.category, formattedCategory),
        createDiffChange(
          "Default unit",
          existingExercise.defaultUnit,
          parsedInput.defaultUnit,
        ),
        createDiffChange(
          "Note",
          existingExercise.note,
          getOptionalNoteValue(parsedInput.note),
        ),
      ],
    },
    kind: "exercise_update",
    payload: {
      ...parsedInput,
      category: formattedCategory,
      note: parsedInput.note.trim(),
    },
    summary: `Update exercise "${existingExercise.name}".`,
    title: "Update exercise",
    userId,
  });

  return {
    id: proposalId,
    kind: "exercise_update",
    summary: `Update exercise "${existingExercise.name}".`,
    title: "Update exercise",
  };
}

export async function createWorkoutTemplateCreateProposal({
  conversationId,
  input,
  userId,
}: {
  conversationId: string;
  input: unknown;
  userId: string;
}): Promise<ProposalCreationResult> {
  const parsedInput = templateCreateProposalSchema.parse(input);
  await ensureNoTemplateNameConflict(userId, parsedInput.name);
  const templateExercises = await ensureExerciseIdsForUser(userId, parsedInput.exerciseIds);

  const proposalId = await insertProposal({
    conversationId,
    diff: {
      changes: [
        createDiffChange("Name", null, parsedInput.name),
      ],
      details: templateExercises.map((exercise, index) => `${index + 1}. ${exercise.name}`),
    },
    kind: "workout_template_create",
    payload: parsedInput,
    summary: `Create workout template "${parsedInput.name}".`,
    title: "Create workout template",
    userId,
  });

  return {
    id: proposalId,
    kind: "workout_template_create",
    summary: `Create workout template "${parsedInput.name}".`,
    title: "Create workout template",
  };
}

export async function createWorkoutTemplateUpdateProposal({
  conversationId,
  input,
  userId,
}: {
  conversationId: string;
  input: unknown;
  userId: string;
}): Promise<ProposalCreationResult> {
  const parsedInput = templateUpdateProposalSchema.parse(input);
  const existingTemplate = await requireTemplateForUser(userId, parsedInput.templateId);

  if (parsedInput.name) {
    await ensureNoTemplateNameConflict(
      userId,
      parsedInput.name,
      parsedInput.templateId,
    );
  }

  const currentExercises = await db
    .select({
      exerciseId: workoutTemplateExercises.exerciseId,
      exerciseName: exercises.name,
      sortOrder: workoutTemplateExercises.sortOrder,
    })
    .from(workoutTemplateExercises)
    .innerJoin(exercises, eq(workoutTemplateExercises.exerciseId, exercises.id))
    .where(eq(workoutTemplateExercises.workoutTemplateId, parsedInput.templateId))
    .orderBy(asc(workoutTemplateExercises.sortOrder));

  const nextExercises = parsedInput.exerciseIds
    ? await ensureExerciseIdsForUser(userId, parsedInput.exerciseIds)
    : null;

  const proposalId = await insertProposal({
    conversationId,
    diff: {
      changes: [
        createDiffChange(
          "Name",
          existingTemplate.name,
          parsedInput.name ?? existingTemplate.name,
        ),
      ],
      details: parsedInput.exerciseIds
        ? [
            "Current order:",
            ...currentExercises.map(
              (exercise, index) => `${index + 1}. ${exercise.exerciseName}`,
            ),
            "Proposed order:",
            ...nextExercises!.map((exercise, index) => `${index + 1}. ${exercise.name}`),
          ]
        : undefined,
    },
    kind: "workout_template_update",
    payload: parsedInput,
    summary: `Update workout template "${existingTemplate.name}".`,
    title: "Update workout template",
    userId,
  });

  return {
    id: proposalId,
    kind: "workout_template_update",
    summary: `Update workout template "${existingTemplate.name}".`,
    title: "Update workout template",
  };
}

export async function createPlanCreateProposal({
  conversationId,
  input,
  userId,
}: {
  conversationId: string;
  input: unknown;
  userId: string;
}): Promise<ProposalCreationResult> {
  const parsedInput = planCreateProposalSchema.parse(input);
  const templateRows = await ensureTemplateIdsForUser(
    userId,
    (parsedInput.workouts ?? []).map((workout) => workout.workoutTemplateId),
  );
  const templateNameById = new Map(
    templateRows.map((template) => [template.id, template.name]),
  );

  const proposalId = await insertProposal({
    conversationId,
    diff: {
      changes: [
        createDiffChange("Name", null, parsedInput.name),
        createDiffChange("Goal", null, parsedInput.goal),
        createDiffChange("Duration", null, `${parsedInput.durationWeeks} weeks`),
      ],
      details:
        parsedInput.workouts && parsedInput.workouts.length > 0
          ? parsedInput.workouts
              .slice()
              .sort((left, right) =>
                left.weekNumber === right.weekNumber
                  ? left.weekday - right.weekday
                  : left.weekNumber - right.weekNumber,
              )
              .map((workout) =>
                formatPlanWorkoutDetail({
                  templateName:
                    templateNameById.get(workout.workoutTemplateId) ??
                    workout.workoutTemplateId,
                  weekNumber: workout.weekNumber,
                  weekday: workout.weekday,
                }),
              )
          : ["No scheduled workouts yet."],
    },
    kind: "plan_create",
    payload: {
      ...parsedInput,
      workouts: parsedInput.workouts ?? [],
    },
    summary: `Create plan "${parsedInput.name}".`,
    title: "Create plan",
    userId,
  });

  return {
    id: proposalId,
    kind: "plan_create",
    summary: `Create plan "${parsedInput.name}".`,
    title: "Create plan",
  };
}

export async function createPlanUpdateProposal({
  conversationId,
  input,
  userId,
}: {
  conversationId: string;
  input: unknown;
  userId: string;
}): Promise<ProposalCreationResult> {
  const parsedInput = planUpdateProposalSchema.parse(input);
  const existingPlan = await requirePlanForUser(userId, parsedInput.planId);

  if (existingPlan.status === "completed" || existingPlan.status === "archived") {
    throw new Error("That plan is read-only.");
  }

  if (
    parsedInput.durationWeeks !== undefined &&
    parsedInput.durationWeeks < existingPlan.durationWeeks
  ) {
    const [highestWeek] = await db
      .select({
        weekNumber: planWorkouts.weekNumber,
      })
      .from(planWorkouts)
      .where(eq(planWorkouts.planId, existingPlan.id))
      .orderBy(desc(planWorkouts.weekNumber))
      .limit(1);

    if ((highestWeek?.weekNumber ?? 0) > parsedInput.durationWeeks) {
      throw new Error(
        "Remove workouts from the later weeks before shortening this plan.",
      );
    }
  }

  const proposalId = await insertProposal({
    conversationId,
    diff: {
      changes: [
        createDiffChange("Name", existingPlan.name, parsedInput.name ?? existingPlan.name),
        createDiffChange("Goal", existingPlan.goal, parsedInput.goal ?? existingPlan.goal),
        createDiffChange(
          "Duration",
          `${existingPlan.durationWeeks} weeks`,
          `${parsedInput.durationWeeks ?? existingPlan.durationWeeks} weeks`,
        ),
      ],
    },
    kind: "plan_update",
    payload: parsedInput,
    summary: `Update plan "${existingPlan.name}".`,
    title: "Update plan",
    userId,
  });

  return {
    id: proposalId,
    kind: "plan_update",
    summary: `Update plan "${existingPlan.name}".`,
    title: "Update plan",
  };
}

export async function createPlanWorkoutUpsertProposal({
  conversationId,
  input,
  userId,
}: {
  conversationId: string;
  input: unknown;
  userId: string;
}): Promise<ProposalCreationResult> {
  const parsedInput = planWorkoutUpsertProposalSchema.parse(input);
  const plan = await requirePlanForUser(userId, parsedInput.planId);

  if (plan.status === "completed" || plan.status === "archived") {
    throw new Error("That plan is read-only.");
  }

  if (parsedInput.weekNumber > plan.durationWeeks) {
    throw new Error("Choose a week inside this plan.");
  }

  const template = await requireTemplateForUser(userId, parsedInput.workoutTemplateId);
  const scopedConditions = [
    eq(planWorkouts.planId, plan.id),
    eq(planWorkouts.weekNumber, parsedInput.weekNumber),
    eq(planWorkouts.weekday, parsedInput.weekday),
  ];

  if (parsedInput.existingPlanWorkoutId) {
    scopedConditions.push(ne(planWorkouts.id, parsedInput.existingPlanWorkoutId));
  }

  const [conflict] = await db
    .select({
      id: planWorkouts.id,
    })
    .from(planWorkouts)
    .where(and(...scopedConditions))
    .limit(1);

  if (conflict) {
    throw new Error("That plan day already has a workout.");
  }

  let existingPlanWorkout:
    | {
        id: string;
        state: "completed" | "planned" | "skipped";
        weekNumber: number;
        weekday: number;
      }
    | null = null;

  const todayDateKey = getTodayDateKey(await getUserTimeZone(userId));

  if (parsedInput.existingPlanWorkoutId) {
    existingPlanWorkout = await requirePlanWorkoutForPlan(
      plan.id,
      parsedInput.existingPlanWorkoutId,
    );

    if (plan.status === "active" && plan.startDate) {
      const existingScheduledDate = getPlanWorkoutScheduledDate(
        plan.startDate,
        existingPlanWorkout.weekNumber,
        existingPlanWorkout.weekday,
      );

      if (
        !isPlanWorkoutEditable(
          existingPlanWorkout.state,
          existingScheduledDate,
          todayDateKey,
        )
      ) {
        throw new Error("That planned workout can no longer be changed.");
      }
    }
  }

  if (plan.status === "active" && plan.startDate) {
    const scheduledDate = getPlanWorkoutScheduledDate(
      plan.startDate,
      parsedInput.weekNumber,
      parsedInput.weekday,
    );

    if (scheduledDate < todayDateKey) {
      throw new Error("Past plan days cannot be changed.");
    }
  }

  const proposalId = await insertProposal({
    conversationId,
    diff: {
      changes: [
        createDiffChange(
          "Week",
          existingPlanWorkout ? `Week ${existingPlanWorkout.weekNumber}` : null,
          `Week ${parsedInput.weekNumber}`,
        ),
        createDiffChange(
          "Weekday",
          existingPlanWorkout ? formatWeekday(existingPlanWorkout.weekday) : null,
          formatWeekday(parsedInput.weekday),
        ),
        createDiffChange("Template", null, template.name),
      ],
    },
    kind: "plan_workout_upsert",
    payload: parsedInput,
    summary: existingPlanWorkout
      ? `Update a scheduled workout in "${plan.name}".`
      : `Add a scheduled workout to "${plan.name}".`,
    title: existingPlanWorkout ? "Update scheduled workout" : "Add scheduled workout",
    userId,
  });

  return {
    id: proposalId,
    kind: "plan_workout_upsert",
    summary: existingPlanWorkout
      ? `Update a scheduled workout in "${plan.name}".`
      : `Add a scheduled workout to "${plan.name}".`,
    title: existingPlanWorkout ? "Update scheduled workout" : "Add scheduled workout",
  };
}

export async function applyHealthCoachProposal({
  proposalId,
  userId,
}: {
  proposalId: string;
  userId: string;
}): Promise<ProposalApplyResult> {
  const [proposal] = await db
    .select({
      id: healthCoachChangeProposals.id,
      kind: healthCoachChangeProposals.kind,
      payload: healthCoachChangeProposals.payload,
      status: healthCoachChangeProposals.status,
    })
    .from(healthCoachChangeProposals)
    .where(
      and(
        eq(healthCoachChangeProposals.id, proposalId),
        eq(healthCoachChangeProposals.userId, userId),
      ),
    )
    .limit(1);

  if (!proposal) {
    throw new Error("That coach proposal no longer exists.");
  }

  if (proposal.status !== "pending" && proposal.status !== "approved") {
    throw new Error("That coach proposal can no longer be applied.");
  }

  const now = new Date();

  switch (proposal.kind) {
    case "exercise_create": {
      const parsedInput = exerciseCreateProposalSchema.parse(proposal.payload);
      await ensureNoExerciseNameConflict(userId, parsedInput.name);
      const exerciseId = randomUUID();

      await db.insert(exercises).values({
        category: normalizeCategoriesForStorage(parsedInput.category),
        defaultUnit: parsedInput.defaultUnit,
        id: exerciseId,
        name: parsedInput.name,
        note: getOptionalNoteValue(parsedInput.note),
        userId,
      });

      await db
        .update(healthCoachChangeProposals)
        .set({
          appliedAt: now,
          applyResult: {
            entityId: exerciseId,
            path: "/exercises",
          },
          status: "applied",
          updatedAt: now,
        })
        .where(eq(healthCoachChangeProposals.id, proposal.id));

      return {
        entityId: exerciseId,
        path: "/exercises",
        successMessage: `Created exercise "${parsedInput.name}".`,
      };
    }

    case "exercise_update": {
      const parsedInput = exerciseUpdateProposalSchema.parse(proposal.payload);
      await requireExerciseForUser(userId, parsedInput.exerciseId);
      await ensureNoExerciseNameConflict(userId, parsedInput.name, parsedInput.exerciseId);

      await db
        .update(exercises)
        .set({
          category: normalizeCategoriesForStorage(parsedInput.category),
          defaultUnit: parsedInput.defaultUnit,
          name: parsedInput.name,
          note: getOptionalNoteValue(parsedInput.note),
          updatedAt: now,
        })
        .where(and(eq(exercises.id, parsedInput.exerciseId), eq(exercises.userId, userId)));

      await db
        .update(healthCoachChangeProposals)
        .set({
          appliedAt: now,
          applyResult: {
            entityId: parsedInput.exerciseId,
            path: "/exercises",
          },
          status: "applied",
          updatedAt: now,
        })
        .where(eq(healthCoachChangeProposals.id, proposal.id));

      return {
        entityId: parsedInput.exerciseId,
        path: "/exercises",
        successMessage: `Updated exercise "${parsedInput.name}".`,
      };
    }

    case "workout_template_create": {
      const parsedInput = templateCreateProposalSchema.parse(proposal.payload);
      await ensureNoTemplateNameConflict(userId, parsedInput.name);
      const templateExercises = await ensureExerciseIdsForUser(userId, parsedInput.exerciseIds);
      const templateId = randomUUID();

      await db.transaction(async (tx) => {
        await tx.insert(workoutTemplates).values({
          id: templateId,
          name: parsedInput.name,
          userId,
        });

        await tx.insert(workoutTemplateExercises).values(
          templateExercises.map((exercise, index) => ({
            exerciseId: exercise.id,
            id: randomUUID(),
            sortOrder: index + 1,
            workoutTemplateId: templateId,
          })),
        );
      });

      await db
        .update(healthCoachChangeProposals)
        .set({
          appliedAt: now,
          applyResult: {
            entityId: templateId,
            path: `/workouts/templates/${templateId}`,
          },
          status: "applied",
          updatedAt: now,
        })
        .where(eq(healthCoachChangeProposals.id, proposal.id));

      return {
        entityId: templateId,
        path: `/workouts/templates/${templateId}`,
        successMessage: `Created workout template "${parsedInput.name}".`,
      };
    }

    case "workout_template_update": {
      const parsedInput = templateUpdateProposalSchema.parse(proposal.payload);
      await requireTemplateForUser(userId, parsedInput.templateId);

      if (parsedInput.name) {
        await ensureNoTemplateNameConflict(userId, parsedInput.name, parsedInput.templateId);
      }

      const templateExercises = parsedInput.exerciseIds
        ? await ensureExerciseIdsForUser(userId, parsedInput.exerciseIds)
        : null;

      await db.transaction(async (tx) => {
        if (parsedInput.name) {
          await tx
            .update(workoutTemplates)
            .set({
              name: parsedInput.name,
              updatedAt: now,
            })
            .where(
              and(
                eq(workoutTemplates.id, parsedInput.templateId),
                eq(workoutTemplates.userId, userId),
              ),
            );
        } else {
          await tx
            .update(workoutTemplates)
            .set({
              updatedAt: now,
            })
            .where(
              and(
                eq(workoutTemplates.id, parsedInput.templateId),
                eq(workoutTemplates.userId, userId),
              ),
            );
        }

        if (templateExercises) {
          await tx
            .delete(workoutTemplateExercises)
            .where(eq(workoutTemplateExercises.workoutTemplateId, parsedInput.templateId));

          await tx.insert(workoutTemplateExercises).values(
            templateExercises.map((exercise, index) => ({
              exerciseId: exercise.id,
              id: randomUUID(),
              sortOrder: index + 1,
              workoutTemplateId: parsedInput.templateId,
            })),
          );
        }
      });

      await db
        .update(healthCoachChangeProposals)
        .set({
          appliedAt: now,
          applyResult: {
            entityId: parsedInput.templateId,
            path: `/workouts/templates/${parsedInput.templateId}`,
          },
          status: "applied",
          updatedAt: now,
        })
        .where(eq(healthCoachChangeProposals.id, proposal.id));

      return {
        entityId: parsedInput.templateId,
        path: `/workouts/templates/${parsedInput.templateId}`,
        successMessage: "Updated workout template.",
      };
    }

    case "plan_create": {
      const parsedInput = planCreateProposalSchema.parse(proposal.payload);
      const workouts = parsedInput.workouts ?? [];
      await ensureTemplateIdsForUser(
        userId,
        workouts.map((workout) => workout.workoutTemplateId),
      );
      const planId = randomUUID();

      await db.transaction(async (tx) => {
        await tx.insert(plans).values({
          durationWeeks: parsedInput.durationWeeks,
          goal: parsedInput.goal,
          id: planId,
          name: parsedInput.name,
          userId,
        });

        if (workouts.length > 0) {
          await tx.insert(planWorkouts).values(
            workouts.map((workout) => ({
              id: randomUUID(),
              planId,
              weekNumber: workout.weekNumber,
              weekday: workout.weekday,
              workoutTemplateId: workout.workoutTemplateId,
            })),
          );
        }
      });

      await db
        .update(healthCoachChangeProposals)
        .set({
          appliedAt: now,
          applyResult: {
            entityId: planId,
            path: `/plans/${planId}`,
          },
          status: "applied",
          updatedAt: now,
        })
        .where(eq(healthCoachChangeProposals.id, proposal.id));

      return {
        entityId: planId,
        path: `/plans/${planId}`,
        successMessage: `Created plan "${parsedInput.name}".`,
      };
    }

    case "plan_update": {
      const parsedInput = planUpdateProposalSchema.parse(proposal.payload);
      const existingPlan = await requirePlanForUser(userId, parsedInput.planId);

      if (existingPlan.status === "completed" || existingPlan.status === "archived") {
        throw new Error("That plan is read-only.");
      }

      if (
        parsedInput.durationWeeks !== undefined &&
        parsedInput.durationWeeks < existingPlan.durationWeeks
      ) {
        const [highestWeek] = await db
          .select({
            weekNumber: planWorkouts.weekNumber,
          })
          .from(planWorkouts)
          .where(eq(planWorkouts.planId, existingPlan.id))
          .orderBy(desc(planWorkouts.weekNumber))
          .limit(1);

        if ((highestWeek?.weekNumber ?? 0) > parsedInput.durationWeeks) {
          throw new Error(
            "Remove workouts from the later weeks before shortening this plan.",
          );
        }
      }

      await db
        .update(plans)
        .set({
          durationWeeks: parsedInput.durationWeeks ?? existingPlan.durationWeeks,
          goal: parsedInput.goal ?? existingPlan.goal,
          name: parsedInput.name ?? existingPlan.name,
          updatedAt: now,
        })
        .where(and(eq(plans.id, existingPlan.id), eq(plans.userId, userId)));

      await db
        .update(healthCoachChangeProposals)
        .set({
          appliedAt: now,
          applyResult: {
            entityId: existingPlan.id,
            path: `/plans/${existingPlan.id}`,
          },
          status: "applied",
          updatedAt: now,
        })
        .where(eq(healthCoachChangeProposals.id, proposal.id));

      return {
        entityId: existingPlan.id,
        path: `/plans/${existingPlan.id}`,
        successMessage: `Updated plan "${parsedInput.name ?? existingPlan.name}".`,
      };
    }

    case "plan_workout_upsert": {
      const parsedInput = planWorkoutUpsertProposalSchema.parse(proposal.payload);
      const plan = await requirePlanForUser(userId, parsedInput.planId);

      if (plan.status === "completed" || plan.status === "archived") {
        throw new Error("That plan is read-only.");
      }

      if (parsedInput.weekNumber > plan.durationWeeks) {
        throw new Error("Choose a week inside this plan.");
      }

      await requireTemplateForUser(userId, parsedInput.workoutTemplateId);

      const scopedConditions = [
        eq(planWorkouts.planId, plan.id),
        eq(planWorkouts.weekNumber, parsedInput.weekNumber),
        eq(planWorkouts.weekday, parsedInput.weekday),
      ];

      if (parsedInput.existingPlanWorkoutId) {
        scopedConditions.push(ne(planWorkouts.id, parsedInput.existingPlanWorkoutId));
      }

      const [conflict] = await db
        .select({
          id: planWorkouts.id,
        })
        .from(planWorkouts)
        .where(and(...scopedConditions))
        .limit(1);

      if (conflict) {
        throw new Error("That plan day already has a workout.");
      }

      const todayDateKey = getTodayDateKey(await getUserTimeZone(userId));

      if (parsedInput.existingPlanWorkoutId) {
        const existingPlanWorkout = await requirePlanWorkoutForPlan(
          plan.id,
          parsedInput.existingPlanWorkoutId,
        );

        if (plan.status === "active" && plan.startDate) {
          const existingScheduledDate = getPlanWorkoutScheduledDate(
            plan.startDate,
            existingPlanWorkout.weekNumber,
            existingPlanWorkout.weekday,
          );

          if (
            !isPlanWorkoutEditable(
              existingPlanWorkout.state,
              existingScheduledDate,
              todayDateKey,
            )
          ) {
            throw new Error("That planned workout can no longer be changed.");
          }
        }

        await db
          .update(planWorkouts)
          .set({
            updatedAt: now,
            weekNumber: parsedInput.weekNumber,
            weekday: parsedInput.weekday,
            workoutTemplateId: parsedInput.workoutTemplateId,
          })
          .where(eq(planWorkouts.id, existingPlanWorkout.id));

        await db
          .update(healthCoachChangeProposals)
          .set({
            appliedAt: now,
            applyResult: {
              entityId: existingPlanWorkout.id,
              path: `/plans/${plan.id}`,
            },
            status: "applied",
            updatedAt: now,
          })
          .where(eq(healthCoachChangeProposals.id, proposal.id));

        return {
          entityId: existingPlanWorkout.id,
          path: `/plans/${plan.id}`,
          successMessage: `Updated a scheduled workout in "${plan.name}".`,
        };
      }

      if (plan.status === "active" && plan.startDate) {
        const scheduledDate = getPlanWorkoutScheduledDate(
          plan.startDate,
          parsedInput.weekNumber,
          parsedInput.weekday,
        );

        if (scheduledDate < todayDateKey) {
          throw new Error("Past plan days cannot be changed.");
        }
      }

      const planWorkoutId = randomUUID();

      await db.insert(planWorkouts).values({
        id: planWorkoutId,
        planId: plan.id,
        weekNumber: parsedInput.weekNumber,
        weekday: parsedInput.weekday,
        workoutTemplateId: parsedInput.workoutTemplateId,
      });

      await db
        .update(healthCoachChangeProposals)
        .set({
          appliedAt: now,
          applyResult: {
            entityId: planWorkoutId,
            path: `/plans/${plan.id}`,
          },
          status: "applied",
          updatedAt: now,
        })
        .where(eq(healthCoachChangeProposals.id, proposal.id));

      return {
        entityId: planWorkoutId,
        path: `/plans/${plan.id}`,
        successMessage: `Added a scheduled workout to "${plan.name}".`,
      };
    }
  }
}
