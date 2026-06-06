"use server";

import { randomUUID } from "node:crypto";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  sql,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  exercises,
  plans,
  planWorkouts,
  workoutExerciseEntries,
  workoutSessions,
  workoutTemplateExercises,
  workoutTemplates,
} from "@/db/schema";
import { requireUser } from "@/features/auth/session";
import { formatStoredExerciseCategories } from "@/features/exercises/categories";
import { logInfo } from "@/lib/logger";

import {
  addTemplateExerciseSchema,
  createTemplateSchema,
  moveTemplateExerciseSchema,
  reorderTemplateExercisesSchema,
  saveWorkoutAsTemplateSchema,
  startTemplateSchema,
  templateExerciseMutationSchema,
  updateTemplateDetailsSchema,
  templateIdSchema,
} from "./validation";

type WorkoutTemplateExerciseSource = {
  exerciseId: string | null;
  sortOrder: number;
};

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStringListValue(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function getValidationMessage(error: { issues?: Array<{ message: string }> }) {
  return error.issues?.[0]?.message ?? "Invalid input.";
}

function redirectToWorkoutHub({
  error,
  success,
}: {
  error?: string;
  success?: string;
} = {}): never {
  const searchParams = new URLSearchParams();

  if (error) {
    searchParams.set("error", error);
  }

  if (success) {
    searchParams.set("success", success);
  }

  const queryString = searchParams.toString();
  redirect(queryString ? `/workouts?${queryString}` : "/workouts");
}

function redirectToTemplateEditor(
  templateId: string,
  {
    error,
    success,
  }: {
    error?: string;
    success?: string;
  } = {},
): never {
  const searchParams = new URLSearchParams();

  if (error) {
    searchParams.set("error", error);
  }

  if (success) {
    searchParams.set("success", success);
  }

  const queryString = searchParams.toString();
  redirect(
    queryString
      ? `/workouts/templates/${templateId}?${queryString}`
      : `/workouts/templates/${templateId}`,
  );
}

function redirectToWorkoutSession(
  sessionId: string,
  {
    error,
    success,
  }: {
    error?: string;
    success?: string;
  } = {},
): never {
  const searchParams = new URLSearchParams();

  if (error) {
    searchParams.set("error", error);
  }

  if (success) {
    searchParams.set("success", success);
  }

  const queryString = searchParams.toString();
  redirect(
    queryString
      ? `/workouts/${sessionId}?${queryString}`
      : `/workouts/${sessionId}`,
  );
}

function redirectToHistory({
  error,
  success,
}: {
  error?: string;
  success?: string;
} = {}): never {
  const searchParams = new URLSearchParams();

  if (error) {
    searchParams.set("error", error);
  }

  if (success) {
    searchParams.set("success", success);
  }

  const queryString = searchParams.toString();
  redirect(queryString ? `/history?${queryString}` : "/history");
}

async function requireTemplateForUser(userId: string, templateId: string) {
  const [template] = await db
    .select({
      id: workoutTemplates.id,
      name: workoutTemplates.name,
      description: workoutTemplates.description,
    })
    .from(workoutTemplates)
    .where(
      and(
        eq(workoutTemplates.id, templateId),
        eq(workoutTemplates.userId, userId),
      ),
    )
    .limit(1);

  return template ?? null;
}

async function findTemplateByName(
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

  const [template] = await db
    .select({
      id: workoutTemplates.id,
    })
    .from(workoutTemplates)
    .where(and(...conditions))
    .limit(1);

  return template ?? null;
}

function validateTemplateExerciseSources(
  exerciseSources: WorkoutTemplateExerciseSource[],
) {
  if (exerciseSources.length === 0) {
    return "Add at least one exercise before saving a workout template.";
  }

  const exerciseIds = exerciseSources.map((source) => source.exerciseId);

  if (exerciseIds.some((exerciseId) => exerciseId === null)) {
    return "This workout includes an exercise that no longer exists. Remove it before saving as a template.";
  }

  const uniqueExerciseIds = new Set(exerciseIds);

  if (uniqueExerciseIds.size !== exerciseIds.length) {
    return "Templates cannot include the same exercise more than once.";
  }

  return null;
}

async function createTemplateFromExerciseSources({
  userId,
  name,
  description,
  exerciseSources,
}: {
  userId: string;
  name: string;
  description?: string | null;
  exerciseSources: WorkoutTemplateExerciseSource[];
}) {
  const sourceError = validateTemplateExerciseSources(exerciseSources);

  if (sourceError) {
    return {
      error: sourceError,
      templateId: null,
    };
  }

  const existingTemplate = await findTemplateByName(userId, name);

  if (existingTemplate) {
    return {
      error: "A workout template with that name already exists.",
      templateId: null,
    };
  }

  const templateId = randomUUID();
  const sortedSources = [...exerciseSources].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );

  await db.transaction(async (tx) => {
    await tx.insert(workoutTemplates).values({
      id: templateId,
      userId,
      name,
      description: description?.trim() ? description.trim() : null,
    });

    await tx.insert(workoutTemplateExercises).values(
      sortedSources.map((source, index) => ({
        id: randomUUID(),
        workoutTemplateId: templateId,
        exerciseId: source.exerciseId as string,
        sortOrder: index + 1,
      })),
    );
  });

  return {
    error: null,
    templateId,
  };
}

export async function createWorkoutTemplateAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = createTemplateSchema.safeParse({
    name: getStringValue(formData, "name"),
  });

  if (!parsedInput.success) {
    redirectToWorkoutHub({ error: getValidationMessage(parsedInput.error) });
  }

  const { name } = parsedInput.data;
  const existingTemplate = await findTemplateByName(user.id, name);

  if (existingTemplate) {
    redirectToWorkoutHub({
      error: "A workout template with that name already exists.",
    });
  }

  const [template] = await db
    .insert(workoutTemplates)
    .values({
      id: randomUUID(),
      userId: user.id,
      name,
    })
    .returning({
      id: workoutTemplates.id,
    });

  revalidatePath("/workouts");
  redirectToTemplateEditor(template.id, {
    success: "Template created. Add exercises before starting it.",
  });
}

export async function updateWorkoutTemplateDetailsAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = updateTemplateDetailsSchema.safeParse({
    templateId: getStringValue(formData, "templateId"),
    name: getStringValue(formData, "name"),
    description: getStringValue(formData, "description"),
  });

  if (!parsedInput.success) {
    redirectToWorkoutHub({ error: getValidationMessage(parsedInput.error) });
  }

  const { description, templateId, name } = parsedInput.data;
  const template = await requireTemplateForUser(user.id, templateId);

  if (!template) {
    redirectToWorkoutHub({ error: "Workout template no longer exists." });
  }

  const existingTemplate = await findTemplateByName(user.id, name, templateId);

  if (existingTemplate) {
    redirectToTemplateEditor(templateId, {
      error: "A workout template with that name already exists.",
    });
  }

  await db
    .update(workoutTemplates)
    .set({
      description: description.trim() ? description : null,
      name,
      updatedAt: new Date(),
    })
    .where(eq(workoutTemplates.id, templateId));

  revalidatePath("/workouts");
  revalidatePath(`/workouts/templates/${templateId}`);
  redirectToTemplateEditor(templateId, { success: "Template details saved." });
}

export async function deleteWorkoutTemplateAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = templateIdSchema.safeParse({
    templateId: getStringValue(formData, "templateId"),
  });

  if (!parsedInput.success) {
    redirectToWorkoutHub({ error: getValidationMessage(parsedInput.error) });
  }

  const { templateId } = parsedInput.data;
  const template = await requireTemplateForUser(user.id, templateId);

  if (!template) {
    redirectToWorkoutHub({ error: "Workout template no longer exists." });
  }

  const [planReference] = await db
    .select({
      planId: plans.id,
      planStatus: plans.status,
      planName: plans.name,
    })
    .from(planWorkouts)
    .innerJoin(plans, eq(planWorkouts.planId, plans.id))
    .where(
      and(
        eq(planWorkouts.workoutTemplateId, templateId),
        eq(plans.userId, user.id),
      ),
    )
    .limit(1);

  if (planReference) {
    redirectToWorkoutHub({
      error: `Remove ${template.name} from ${planReference.planName} before deleting the template.`,
    });
  }

  await db.delete(workoutTemplates).where(eq(workoutTemplates.id, templateId));

  revalidatePath("/workouts");
  redirectToWorkoutHub({ success: `Deleted ${template.name}.` });
}

export async function addTemplateExerciseAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = addTemplateExerciseSchema.safeParse({
    templateId: getStringValue(formData, "templateId"),
    exerciseId: getStringValue(formData, "exerciseId"),
  });

  if (!parsedInput.success) {
    redirectToWorkoutHub({ error: getValidationMessage(parsedInput.error) });
  }

  const { templateId, exerciseId } = parsedInput.data;
  const template = await requireTemplateForUser(user.id, templateId);

  if (!template) {
    redirectToWorkoutHub({ error: "Workout template no longer exists." });
  }

  const [exercise] = await db
    .select({
      id: exercises.id,
      name: exercises.name,
    })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, user.id)))
    .limit(1);

  if (!exercise) {
    redirectToTemplateEditor(templateId, {
      error: "Choose an exercise from your library.",
    });
  }

  const [existingTemplateExercise] = await db
    .select({
      id: workoutTemplateExercises.id,
    })
    .from(workoutTemplateExercises)
    .where(
      and(
        eq(workoutTemplateExercises.workoutTemplateId, templateId),
        eq(workoutTemplateExercises.exerciseId, exercise.id),
      ),
    )
    .limit(1);

  if (existingTemplateExercise) {
    redirectToTemplateEditor(templateId, {
      error: `${exercise.name} is already in this template.`,
    });
  }

  const [lastTemplateExercise] = await db
    .select({
      sortOrder: workoutTemplateExercises.sortOrder,
    })
    .from(workoutTemplateExercises)
    .where(eq(workoutTemplateExercises.workoutTemplateId, templateId))
    .orderBy(desc(workoutTemplateExercises.sortOrder))
    .limit(1);

  await db.transaction(async (tx) => {
    await tx.insert(workoutTemplateExercises).values({
      id: randomUUID(),
      workoutTemplateId: templateId,
      exerciseId: exercise.id,
      sortOrder: (lastTemplateExercise?.sortOrder ?? 0) + 1,
    });

    await tx
      .update(workoutTemplates)
      .set({ updatedAt: new Date() })
      .where(eq(workoutTemplates.id, templateId));
  });

  revalidatePath("/workouts");
  revalidatePath(`/workouts/templates/${templateId}`);
  redirectToTemplateEditor(templateId);
}

export async function removeTemplateExerciseAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = templateExerciseMutationSchema.safeParse({
    templateId: getStringValue(formData, "templateId"),
    templateExerciseId: getStringValue(formData, "templateExerciseId"),
  });

  if (!parsedInput.success) {
    redirectToWorkoutHub({ error: getValidationMessage(parsedInput.error) });
  }

  const { templateId, templateExerciseId } = parsedInput.data;
  const template = await requireTemplateForUser(user.id, templateId);

  if (!template) {
    redirectToWorkoutHub({ error: "Workout template no longer exists." });
  }

  const [templateExercise] = await db
    .select({
      id: workoutTemplateExercises.id,
    })
    .from(workoutTemplateExercises)
    .where(
      and(
        eq(workoutTemplateExercises.id, templateExerciseId),
        eq(workoutTemplateExercises.workoutTemplateId, templateId),
      ),
    )
    .limit(1);

  if (!templateExercise) {
    redirectToTemplateEditor(templateId, {
      error: "Template exercise no longer exists.",
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(workoutTemplateExercises)
      .where(eq(workoutTemplateExercises.id, templateExerciseId));

    const remainingExercises = await tx
      .select({
        id: workoutTemplateExercises.id,
        sortOrder: workoutTemplateExercises.sortOrder,
      })
      .from(workoutTemplateExercises)
      .where(eq(workoutTemplateExercises.workoutTemplateId, templateId))
      .orderBy(asc(workoutTemplateExercises.sortOrder));

    for (const [index, exercise] of remainingExercises.entries()) {
      const nextSortOrder = index + 1;

      if (exercise.sortOrder === nextSortOrder) {
        continue;
      }

      await tx
        .update(workoutTemplateExercises)
        .set({ sortOrder: nextSortOrder })
        .where(eq(workoutTemplateExercises.id, exercise.id));
    }

    await tx
      .update(workoutTemplates)
      .set({ updatedAt: new Date() })
      .where(eq(workoutTemplates.id, templateId));
  });

  revalidatePath("/workouts");
  revalidatePath(`/workouts/templates/${templateId}`);
  redirectToTemplateEditor(templateId);
}

export async function moveTemplateExerciseAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = moveTemplateExerciseSchema.safeParse({
    templateId: getStringValue(formData, "templateId"),
    templateExerciseId: getStringValue(formData, "templateExerciseId"),
    direction: getStringValue(formData, "direction"),
  });

  if (!parsedInput.success) {
    redirectToWorkoutHub({ error: getValidationMessage(parsedInput.error) });
  }

  const { templateId, templateExerciseId, direction } = parsedInput.data;
  const template = await requireTemplateForUser(user.id, templateId);

  if (!template) {
    redirectToWorkoutHub({ error: "Workout template no longer exists." });
  }

  const [templateExercise] = await db
    .select({
      id: workoutTemplateExercises.id,
      sortOrder: workoutTemplateExercises.sortOrder,
    })
    .from(workoutTemplateExercises)
    .where(
      and(
        eq(workoutTemplateExercises.id, templateExerciseId),
        eq(workoutTemplateExercises.workoutTemplateId, templateId),
      ),
    )
    .limit(1);

  if (!templateExercise) {
    redirectToTemplateEditor(templateId, {
      error: "Template exercise no longer exists.",
    });
  }

  const [neighbor] = await db
    .select({
      id: workoutTemplateExercises.id,
      sortOrder: workoutTemplateExercises.sortOrder,
    })
    .from(workoutTemplateExercises)
    .where(
      and(
        eq(workoutTemplateExercises.workoutTemplateId, templateId),
        direction === "up"
          ? lt(workoutTemplateExercises.sortOrder, templateExercise.sortOrder)
          : gt(workoutTemplateExercises.sortOrder, templateExercise.sortOrder),
      ),
    )
    .orderBy(
      direction === "up"
        ? desc(workoutTemplateExercises.sortOrder)
        : asc(workoutTemplateExercises.sortOrder),
    )
    .limit(1);

  if (!neighbor) {
    redirectToTemplateEditor(templateId);
  }

  await db.transaction(async (tx) => {
    const temporarySortOrder = -templateExercise.sortOrder;

    await tx
      .update(workoutTemplateExercises)
      .set({ sortOrder: temporarySortOrder })
      .where(eq(workoutTemplateExercises.id, templateExercise.id));

    await tx
      .update(workoutTemplateExercises)
      .set({ sortOrder: templateExercise.sortOrder })
      .where(eq(workoutTemplateExercises.id, neighbor.id));

    await tx
      .update(workoutTemplateExercises)
      .set({ sortOrder: neighbor.sortOrder })
      .where(eq(workoutTemplateExercises.id, templateExercise.id));

    await tx
      .update(workoutTemplates)
      .set({ updatedAt: new Date() })
      .where(eq(workoutTemplates.id, templateId));
  });

  revalidatePath("/workouts");
  revalidatePath(`/workouts/templates/${templateId}`);
  redirectToTemplateEditor(templateId);
}

export async function reorderTemplateExercisesAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = reorderTemplateExercisesSchema.safeParse({
    templateId: getStringValue(formData, "templateId"),
    templateExerciseIds: getStringListValue(formData, "templateExerciseId"),
  });

  if (!parsedInput.success) {
    redirectToWorkoutHub({ error: getValidationMessage(parsedInput.error) });
  }

  const { templateId, templateExerciseIds } = parsedInput.data;
  const template = await requireTemplateForUser(user.id, templateId);

  if (!template) {
    redirectToWorkoutHub({ error: "Workout template no longer exists." });
  }

  const exercises = await db
    .select({
      id: workoutTemplateExercises.id,
      sortOrder: workoutTemplateExercises.sortOrder,
    })
    .from(workoutTemplateExercises)
    .where(eq(workoutTemplateExercises.workoutTemplateId, templateId))
    .orderBy(asc(workoutTemplateExercises.sortOrder));

  if (exercises.length !== templateExerciseIds.length) {
    redirectToTemplateEditor(templateId, {
      error: "Refresh the page and try reordering again.",
    });
  }

  const exerciseIds = new Set(exercises.map((exercise) => exercise.id));

  if (templateExerciseIds.some((exerciseId) => !exerciseIds.has(exerciseId))) {
    redirectToTemplateEditor(templateId, {
      error: "Refresh the page and try reordering again.",
    });
  }

  await db.transaction(async (tx) => {
    for (const exercise of exercises) {
      await tx
        .update(workoutTemplateExercises)
        .set({ sortOrder: -exercise.sortOrder })
        .where(eq(workoutTemplateExercises.id, exercise.id));
    }

    for (const [index, exerciseId] of templateExerciseIds.entries()) {
      await tx
        .update(workoutTemplateExercises)
        .set({ sortOrder: index + 1 })
        .where(eq(workoutTemplateExercises.id, exerciseId));
    }

    await tx
      .update(workoutTemplates)
      .set({ updatedAt: new Date() })
      .where(eq(workoutTemplates.id, templateId));
  });

  revalidatePath("/workouts");
  revalidatePath(`/workouts/templates/${templateId}`);
  redirectToTemplateEditor(templateId);
}

export async function startWorkoutFromTemplateAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = startTemplateSchema.safeParse({
    templateId: getStringValue(formData, "templateId"),
  });

  if (!parsedInput.success) {
    redirectToWorkoutHub({ error: getValidationMessage(parsedInput.error) });
  }

  const { templateId } = parsedInput.data;
  const existingOpenSession = await db
    .select({
      id: workoutSessions.id,
    })
    .from(workoutSessions)
    .where(
      and(eq(workoutSessions.userId, user.id), isNull(workoutSessions.completedAt)),
    )
    .limit(1);

  if (existingOpenSession[0]) {
    redirect(`/workouts/${existingOpenSession[0].id}`);
  }

  const template = await requireTemplateForUser(user.id, templateId);

  if (!template) {
    redirectToWorkoutHub({ error: "Workout template no longer exists." });
  }

  const templateExercises = await db
    .select({
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      exerciseCategory: exercises.category,
      defaultUnit: exercises.defaultUnit,
      sortOrder: workoutTemplateExercises.sortOrder,
    })
    .from(workoutTemplateExercises)
    .innerJoin(
      exercises,
      eq(workoutTemplateExercises.exerciseId, exercises.id),
    )
    .where(eq(workoutTemplateExercises.workoutTemplateId, templateId))
    .orderBy(asc(workoutTemplateExercises.sortOrder));

  if (templateExercises.length === 0) {
    redirectToTemplateEditor(templateId, {
      error: "Add at least one exercise before starting this workout.",
    });
  }

  const sessionId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(workoutSessions).values({
      id: sessionId,
      userId: user.id,
      performedOn: getTodayDateString(),
      activeEntrySortOrder: templateExercises[0].sortOrder,
      workoutTemplateId: templateId,
    });

    await tx.insert(workoutExerciseEntries).values(
      templateExercises.map((templateExercise) => ({
        id: randomUUID(),
        workoutSessionId: sessionId,
        exerciseId: templateExercise.exerciseId,
        exerciseNameSnapshot: templateExercise.exerciseName,
        exerciseCategorySnapshot: formatStoredExerciseCategories(
          templateExercise.exerciseCategory,
        ),
        unitSnapshot: templateExercise.defaultUnit,
        sortOrder: templateExercise.sortOrder,
      })),
    );
  });

  logInfo("workout.session.started_from_template", {
    userId: user.id,
    templateId,
    sessionId,
  });

  revalidatePath("/");
  revalidatePath("/workouts");
  redirect(`/workouts/${sessionId}`);
}

async function getSessionExerciseSourcesForTemplate({
  userId,
  sessionId,
  completed,
}: {
  userId: string;
  sessionId: string;
  completed: boolean;
}) {
  const [session] = await db
    .select({
      id: workoutSessions.id,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.userId, userId),
        completed
          ? isNotNull(workoutSessions.completedAt)
          : isNull(workoutSessions.completedAt),
      ),
    )
    .limit(1);

  if (!session) {
    return null;
  }

  const entries = await db
    .select({
      exerciseId: workoutExerciseEntries.exerciseId,
      sortOrder: workoutExerciseEntries.sortOrder,
    })
    .from(workoutExerciseEntries)
    .where(eq(workoutExerciseEntries.workoutSessionId, sessionId))
    .orderBy(asc(workoutExerciseEntries.sortOrder));

  return entries;
}

export async function saveActiveWorkoutAsTemplateAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = saveWorkoutAsTemplateSchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
    name: getStringValue(formData, "name"),
  });

  if (!parsedInput.success) {
    const sessionId = getStringValue(formData, "sessionId");
    if (sessionId) {
      redirectToWorkoutSession(sessionId, {
        error: getValidationMessage(parsedInput.error),
      });
    }

    redirectToWorkoutHub({ error: getValidationMessage(parsedInput.error) });
  }

  const { sessionId, name } = parsedInput.data;
  const exerciseSources = await getSessionExerciseSourcesForTemplate({
    userId: user.id,
    sessionId,
    completed: false,
  });

  if (!exerciseSources) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout session no longer exists or is already completed.",
    });
  }

  const result = await createTemplateFromExerciseSources({
    userId: user.id,
    name,
    description: null,
    exerciseSources,
  });

  if (result.error) {
    redirectToWorkoutSession(sessionId, { error: result.error });
  }

  revalidatePath("/workouts");
  revalidatePath(`/workouts/${sessionId}`);
  redirectToWorkoutSession(sessionId, {
    success: "Saved as a workout template.",
  });
}

export async function saveCompletedWorkoutAsTemplateAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = saveWorkoutAsTemplateSchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
    name: getStringValue(formData, "name"),
  });

  if (!parsedInput.success) {
    redirectToHistory({ error: getValidationMessage(parsedInput.error) });
  }

  const { sessionId, name } = parsedInput.data;
  const exerciseSources = await getSessionExerciseSourcesForTemplate({
    userId: user.id,
    sessionId,
    completed: true,
  });

  if (!exerciseSources) {
    redirectToHistory({ error: "Completed workout no longer exists." });
  }

  const sourceError = validateTemplateExerciseSources(exerciseSources);

  if (sourceError) {
    redirectToHistory({ error: sourceError });
  }

  const exerciseIds = [
    ...new Set(
      exerciseSources
        .map((source) => source.exerciseId)
        .filter((exerciseId): exerciseId is string => exerciseId !== null),
    ),
  ];

  if (exerciseIds.length > 0) {
    const currentExercises = await db
      .select({
        id: exercises.id,
      })
      .from(exercises)
      .where(
        and(eq(exercises.userId, user.id), inArray(exercises.id, exerciseIds)),
      );

    if (currentExercises.length !== exerciseIds.length) {
      redirectToHistory({
        error:
          "This workout includes an exercise that no longer exists. It cannot become a template.",
      });
    }
  }

  const result = await createTemplateFromExerciseSources({
    userId: user.id,
    name,
    description: null,
    exerciseSources,
  });

  if (result.error) {
    redirectToHistory({ error: result.error });
  }

  revalidatePath("/workouts");
  revalidatePath("/history");
  redirectToHistory({ success: "Workout saved as a template." });
}
