"use server";

import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, isNull, ne } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  exercises,
  planWorkouts,
  plans,
  users,
  workoutExerciseEntries,
  workoutSessions,
  workoutTemplateExercises,
  workoutTemplates,
} from "@/db/schema";
import { requireUser } from "@/features/auth/session";
import { coerceTimeZone, getTodayDateKey } from "@/lib/date";

import { syncPlanCompletionState } from "./core";
import {
  createPlanSchema,
  planIdSchema,
  planWorkoutMutationSchema,
  startPlanSchema,
  updatePlanDetailsSchema,
  updateTimeZoneSchema,
  upsertPlanWorkoutSchema,
} from "./validation";
import {
  getWeekOneCutoffWeekday,
  getPlanWorkoutScheduledDate,
  isPlanWorkoutEditable,
} from "./utils";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getValidationMessage(error: { issues?: Array<{ message: string }> }) {
  return error.issues?.[0]?.message ?? "Invalid input.";
}

function getOptionalWeekNumber(
  formData: FormData,
  key: string,
  maxWeekNumber?: number,
) {
  const rawValue = getStringValue(formData, key);

  if (!rawValue) {
    return undefined;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return undefined;
  }

  if (maxWeekNumber && parsedValue > maxWeekNumber) {
    return undefined;
  }

  return parsedValue;
}

function redirectToPlansHub({
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
  redirect(queryString ? `/plans?${queryString}` : "/plans");
}

function redirectToPlan(
  planId: string,
  {
    conflictPlanWorkoutId,
    error,
    resumeSessionId,
    success,
    week,
  }: {
    conflictPlanWorkoutId?: string;
    error?: string;
    resumeSessionId?: string;
    success?: string;
    week?: number;
  } = {},
): never {
  const searchParams = new URLSearchParams();

  if (error) {
    searchParams.set("error", error);
  }

  if (success) {
    searchParams.set("success", success);
  }

  if (resumeSessionId) {
    searchParams.set("resumeSessionId", resumeSessionId);
  }

  if (conflictPlanWorkoutId) {
    searchParams.set("conflictPlanWorkoutId", conflictPlanWorkoutId);
  }

  if (week) {
    searchParams.set("week", String(week));
  }

  const queryString = searchParams.toString();
  redirect(queryString ? `/plans/${planId}?${queryString}` : `/plans/${planId}`);
}

async function requirePlanRecord(userId: string, planId: string) {
  const [plan] = await db
    .select({
      durationWeeks: plans.durationWeeks,
      goal: plans.goal,
      id: plans.id,
      name: plans.name,
      startDate: plans.startDate,
      status: plans.status,
      userId: plans.userId,
    })
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .limit(1);

  return plan ?? null;
}

async function requirePlanWorkoutRecord(planId: string, planWorkoutId: string) {
  const [planWorkout] = await db
    .select({
      id: planWorkouts.id,
      linkedWorkoutSessionId: planWorkouts.linkedWorkoutSessionId,
      planId: planWorkouts.planId,
      state: planWorkouts.state,
      weekNumber: planWorkouts.weekNumber,
      weekday: planWorkouts.weekday,
      workoutTemplateId: planWorkouts.workoutTemplateId,
    })
    .from(planWorkouts)
    .where(
      and(
        eq(planWorkouts.id, planWorkoutId),
        eq(planWorkouts.planId, planId),
      ),
    )
    .limit(1);

  return planWorkout ?? null;
}

async function requireTemplateRecord(userId: string, templateId: string) {
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

  return template ?? null;
}

async function getActivePlanForUser(userId: string, exceptPlanId?: string) {
  const conditions = [eq(plans.userId, userId), eq(plans.status, "active")];
  const filteredConditions = exceptPlanId
    ? [...conditions, ne(plans.id, exceptPlanId)]
    : conditions;

  const [plan] = await db
    .select({
      id: plans.id,
    })
    .from(plans)
    .where(and(...filteredConditions))
    .limit(1);

  return plan ?? null;
}

export async function updateUserTimeZoneAction(timeZoneValue: string) {
  const user = await requireUser();
  const parsedInput = updateTimeZoneSchema.safeParse({
    timeZone: timeZoneValue,
  });

  if (!parsedInput.success) {
    return;
  }

  const nextTimeZone = coerceTimeZone(parsedInput.data.timeZone);

  if (nextTimeZone === user.timeZone) {
    return;
  }

  await db
    .update(users)
    .set({
      timeZone: nextTimeZone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/", "layout");
}

export async function createPlanAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = createPlanSchema.safeParse({
    durationWeeks: getStringValue(formData, "durationWeeks"),
    goal: getStringValue(formData, "goal"),
    name: getStringValue(formData, "name"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const [plan] = await db
    .insert(plans)
    .values({
      durationWeeks: parsedInput.data.durationWeeks,
      goal: parsedInput.data.goal,
      id: randomUUID(),
      name: parsedInput.data.name,
      userId: user.id,
    })
    .returning({
      id: plans.id,
    });

  revalidatePath("/plans");
  redirectToPlan(plan.id, { success: "Plan created. Add workouts week by week." });
}

export async function updatePlanDetailsAction(formData: FormData) {
  const user = await requireUser();
  const returnWeek = getOptionalWeekNumber(formData, "returnWeek");
  const parsedInput = updatePlanDetailsSchema.safeParse({
    durationWeeks: getStringValue(formData, "durationWeeks"),
    goal: getStringValue(formData, "goal"),
    name: getStringValue(formData, "name"),
    planId: getStringValue(formData, "planId"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const plan = await requirePlanRecord(user.id, parsedInput.data.planId);

  if (!plan) {
    redirectToPlansHub({ error: "Plan no longer exists." });
  }

  if (plan.status === "completed" || plan.status === "archived") {
    redirectToPlan(plan.id, { error: "This plan is read-only.", week: returnWeek });
  }

  const highestWeek = await db
    .select({
      weekNumber: planWorkouts.weekNumber,
    })
    .from(planWorkouts)
    .where(eq(planWorkouts.planId, plan.id))
    .orderBy(desc(planWorkouts.weekNumber))
    .limit(1);

  if ((highestWeek[0]?.weekNumber ?? 0) > parsedInput.data.durationWeeks) {
    redirectToPlan(plan.id, {
      error: "Remove workouts from the later weeks before shortening this plan.",
      week: returnWeek,
    });
  }

  await db
    .update(plans)
    .set({
      durationWeeks: parsedInput.data.durationWeeks,
      goal: parsedInput.data.goal,
      name: parsedInput.data.name,
      updatedAt: new Date(),
    })
    .where(eq(plans.id, plan.id));

  revalidatePath("/plans");
  revalidatePath(`/plans/${plan.id}`);
  redirectToPlan(plan.id, { success: "Plan details updated.", week: returnWeek });
}

export async function deletePlanAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = planIdSchema.safeParse({
    planId: getStringValue(formData, "planId"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const plan = await requirePlanRecord(user.id, parsedInput.data.planId);

  if (!plan) {
    redirectToPlansHub({ error: "Plan no longer exists." });
  }

  if (plan.status !== "draft") {
    redirectToPlan(plan.id, { error: "Only draft plans can be deleted." });
  }

  await db.delete(plans).where(eq(plans.id, plan.id));

  revalidatePath("/plans");
  redirectToPlansHub({ success: `Deleted ${plan.name}.` });
}

export async function duplicatePlanAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = planIdSchema.safeParse({
    planId: getStringValue(formData, "planId"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const plan = await requirePlanRecord(user.id, parsedInput.data.planId);

  if (!plan) {
    redirectToPlansHub({ error: "Plan no longer exists." });
  }

  const workouts = await db
    .select({
      weekNumber: planWorkouts.weekNumber,
      weekday: planWorkouts.weekday,
      workoutTemplateId: planWorkouts.workoutTemplateId,
    })
    .from(planWorkouts)
    .where(eq(planWorkouts.planId, plan.id))
    .orderBy(asc(planWorkouts.weekNumber), asc(planWorkouts.weekday));

  const nextPlanId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(plans).values({
      durationWeeks: plan.durationWeeks,
      goal: plan.goal,
      id: nextPlanId,
      name: `${plan.name} copy`,
      userId: user.id,
    });

    if (workouts.length > 0) {
      await tx.insert(planWorkouts).values(
        workouts.map((workout) => ({
          id: randomUUID(),
          planId: nextPlanId,
          weekNumber: workout.weekNumber,
          weekday: workout.weekday,
          workoutTemplateId: workout.workoutTemplateId,
        })),
      );
    }
  });

  revalidatePath("/plans");
  redirectToPlan(nextPlanId, { success: "Plan duplicated as a new draft." });
}

export async function upsertPlanWorkoutAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = upsertPlanWorkoutSchema.safeParse({
    existingPlanWorkoutId: getStringValue(formData, "existingPlanWorkoutId"),
    planId: getStringValue(formData, "planId"),
    weekNumber: getStringValue(formData, "weekNumber"),
    weekday: getStringValue(formData, "weekday"),
    workoutTemplateId: getStringValue(formData, "workoutTemplateId"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const plan = await requirePlanRecord(user.id, parsedInput.data.planId);

  const returnWeek = getOptionalWeekNumber(
    formData,
    "returnWeek",
    plan?.durationWeeks,
  );

  if (!plan) {
    redirectToPlansHub({ error: "Plan no longer exists." });
  }

  if (plan.status === "completed" || plan.status === "archived") {
    redirectToPlan(plan.id, { error: "This plan is read-only.", week: returnWeek });
  }

  if (parsedInput.data.weekNumber > plan.durationWeeks) {
    redirectToPlan(plan.id, { error: "Choose a week inside this plan.", week: returnWeek });
  }

  const template = await requireTemplateRecord(
    user.id,
    parsedInput.data.workoutTemplateId,
  );

  if (!template) {
    redirectToPlan(plan.id, {
      error: "Choose a workout template you own.",
      week: returnWeek,
    });
  }

  const conflictConditions = [
    eq(planWorkouts.planId, plan.id),
    eq(planWorkouts.weekNumber, parsedInput.data.weekNumber),
    eq(planWorkouts.weekday, parsedInput.data.weekday),
  ];
  const scopedConflictConditions = parsedInput.data.existingPlanWorkoutId
    ? [...conflictConditions, ne(planWorkouts.id, parsedInput.data.existingPlanWorkoutId)]
    : conflictConditions;
  const conflictingWorkout = await db
    .select({
      id: planWorkouts.id,
    })
    .from(planWorkouts)
    .where(and(...scopedConflictConditions))
    .limit(1);

  if (conflictingWorkout[0]) {
    redirectToPlan(plan.id, {
      error: "That day already has a workout. Pick another slot.",
      week: returnWeek,
    });
  }

  const todayDateKey = getTodayDateKey(user.timeZone);

  if (plan.status === "active" && plan.startDate) {
    const startDate = plan.startDate;
    const scheduledDate = getPlanWorkoutScheduledDate(
      startDate,
      parsedInput.data.weekNumber,
      parsedInput.data.weekday,
    );

    if (scheduledDate < todayDateKey) {
      redirectToPlan(plan.id, {
        error: "Past plan days cannot be changed.",
        week: returnWeek,
      });
    }
  }

  if (parsedInput.data.existingPlanWorkoutId) {
    const existingWorkout = await requirePlanWorkoutRecord(
      plan.id,
      parsedInput.data.existingPlanWorkoutId,
    );

    if (!existingWorkout) {
      redirectToPlan(plan.id, {
        error: "Planned workout no longer exists.",
        week: returnWeek,
      });
    }

    if (plan.status === "active" && plan.startDate) {
      const startDate = plan.startDate;
      const existingScheduledDate = getPlanWorkoutScheduledDate(
        startDate,
        existingWorkout.weekNumber,
        existingWorkout.weekday,
      );

      if (
        !isPlanWorkoutEditable(
          existingWorkout.state,
          existingScheduledDate,
          todayDateKey,
        )
      ) {
        redirectToPlan(plan.id, {
          error: "That workout can no longer be changed.",
          week: returnWeek,
        });
      }
    }

    await db
      .update(planWorkouts)
      .set({
        updatedAt: new Date(),
        weekNumber: parsedInput.data.weekNumber,
        weekday: parsedInput.data.weekday,
        workoutTemplateId: parsedInput.data.workoutTemplateId,
      })
      .where(eq(planWorkouts.id, existingWorkout.id));

    revalidatePath("/plans");
    revalidatePath(`/plans/${plan.id}`);
    refresh();
    return;
  }

  await db.insert(planWorkouts).values({
    id: randomUUID(),
    planId: plan.id,
    weekNumber: parsedInput.data.weekNumber,
    weekday: parsedInput.data.weekday,
    workoutTemplateId: parsedInput.data.workoutTemplateId,
  });

  revalidatePath("/plans");
  revalidatePath(`/plans/${plan.id}`);
  refresh();
  return;
}

export async function removePlanWorkoutAction(formData: FormData) {
  const user = await requireUser();
  const returnWeek = getOptionalWeekNumber(formData, "returnWeek");
  const parsedInput = planWorkoutMutationSchema.safeParse({
    planId: getStringValue(formData, "planId"),
    planWorkoutId: getStringValue(formData, "planWorkoutId"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const plan = await requirePlanRecord(user.id, parsedInput.data.planId);

  if (!plan) {
    redirectToPlansHub({ error: "Plan no longer exists." });
  }

  const planWorkout = await requirePlanWorkoutRecord(
    plan.id,
    parsedInput.data.planWorkoutId,
  );

  if (!planWorkout) {
    redirectToPlan(plan.id, {
      error: "Planned workout no longer exists.",
      week: returnWeek,
    });
  }

  if (plan.status === "completed" || plan.status === "archived") {
    redirectToPlan(plan.id, {
      error: "This plan is read-only.",
      week: returnWeek ?? planWorkout.weekNumber,
    });
  }

  if (plan.status === "active" && plan.startDate) {
    const startDate = plan.startDate;
    const todayDateKey = getTodayDateKey(user.timeZone);
    const scheduledDate = getPlanWorkoutScheduledDate(
      startDate,
      planWorkout.weekNumber,
      planWorkout.weekday,
    );

    if (!isPlanWorkoutEditable(planWorkout.state, scheduledDate, todayDateKey)) {
      redirectToPlan(plan.id, {
        error: "That workout can no longer be removed.",
        week: returnWeek ?? planWorkout.weekNumber,
      });
    }
  }

  await db.delete(planWorkouts).where(eq(planWorkouts.id, planWorkout.id));

  revalidatePath("/plans");
  revalidatePath(`/plans/${plan.id}`);
  refresh();
  return;
}

export async function startPlanAction(formData: FormData) {
  const user = await requireUser();
  const returnWeek = getOptionalWeekNumber(formData, "returnWeek");
  const parsedInput = startPlanSchema.safeParse({
    planId: getStringValue(formData, "planId"),
    startDate: getStringValue(formData, "startDate"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const plan = await requirePlanRecord(user.id, parsedInput.data.planId);

  if (!plan) {
    redirectToPlansHub({ error: "Plan no longer exists." });
  }

  if (plan.status !== "draft") {
    redirectToPlan(plan.id, {
      error: "Only draft plans can be started.",
      week: returnWeek,
    });
  }

  const activePlan = await getActivePlanForUser(user.id, plan.id);

  if (activePlan) {
    redirectToPlan(plan.id, {
      error: "Finish or archive your current active plan before starting another one.",
      week: returnWeek,
    });
  }

  const workouts = await db
    .select({
      id: planWorkouts.id,
      weekNumber: planWorkouts.weekNumber,
      weekday: planWorkouts.weekday,
    })
    .from(planWorkouts)
    .where(eq(planWorkouts.planId, plan.id))
    .orderBy(asc(planWorkouts.weekNumber), asc(planWorkouts.weekday));

  if (workouts.length === 0) {
    redirectToPlan(plan.id, {
      error: "Add at least one workout before starting this plan.",
      week: returnWeek,
    });
  }

  const cutoffWeekday = getWeekOneCutoffWeekday(parsedInput.data.startDate);
  const weekOneWorkoutIdsToDelete = workouts
    .filter(
      (workout) => workout.weekNumber === 1 && workout.weekday < cutoffWeekday,
    )
    .map((workout) => workout.id);

  if (weekOneWorkoutIdsToDelete.length === workouts.length) {
    redirectToPlan(plan.id, {
      error: "This start date would remove every scheduled workout in week one. Add a later week or choose an earlier start date.",
      week: returnWeek,
    });
  }

  await db.transaction(async (tx) => {
    if (weekOneWorkoutIdsToDelete.length > 0) {
      for (const planWorkoutId of weekOneWorkoutIdsToDelete) {
        await tx.delete(planWorkouts).where(eq(planWorkouts.id, planWorkoutId));
      }
    }

    await tx
      .update(plans)
      .set({
        archivedAt: null,
        completedAt: null,
        startDate: parsedInput.data.startDate,
        startedAt: new Date(),
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(plans.id, plan.id));
  });

  revalidatePath("/");
  revalidatePath("/plans");
  revalidatePath(`/plans/${plan.id}`);
  redirectToPlan(plan.id, { success: "Plan started.", week: returnWeek });
}

export async function archivePlanAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = planIdSchema.safeParse({
    planId: getStringValue(formData, "planId"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const plan = await requirePlanRecord(user.id, parsedInput.data.planId);

  if (!plan) {
    redirectToPlansHub({ error: "Plan no longer exists." });
  }

  if (plan.status !== "active" && plan.status !== "completed") {
    redirectToPlan(plan.id, { error: "Only active or completed plans can be archived." });
  }

  await db
    .update(plans)
    .set({
      archivedAt: new Date(),
      status: "archived",
      updatedAt: new Date(),
    })
    .where(eq(plans.id, plan.id));

  revalidatePath("/");
  revalidatePath("/plans");
  revalidatePath(`/plans/${plan.id}`);
  redirectToPlansHub({ success: `${plan.name} was archived.` });
}

export async function skipPlanWorkoutAction(formData: FormData) {
  const user = await requireUser();
  const returnWeek = getOptionalWeekNumber(formData, "returnWeek");
  const parsedInput = planWorkoutMutationSchema.safeParse({
    planId: getStringValue(formData, "planId"),
    planWorkoutId: getStringValue(formData, "planWorkoutId"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const plan = await requirePlanRecord(user.id, parsedInput.data.planId);

  if (!plan || plan.status !== "active" || !plan.startDate) {
    redirectToPlansHub({ error: "Active plan no longer exists." });
  }

  const startDate = plan.startDate;

  const planWorkout = await requirePlanWorkoutRecord(
    plan.id,
    parsedInput.data.planWorkoutId,
  );

  if (!planWorkout) {
    redirectToPlan(plan.id, {
      error: "Planned workout no longer exists.",
      week: returnWeek,
    });
  }

  const todayDateKey = getTodayDateKey(user.timeZone);
  const scheduledDate = getPlanWorkoutScheduledDate(
    startDate,
    planWorkout.weekNumber,
    planWorkout.weekday,
  );

  if (!isPlanWorkoutEditable(planWorkout.state, scheduledDate, todayDateKey)) {
    redirectToPlan(plan.id, {
      error: "That workout can no longer be skipped.",
      week: returnWeek ?? planWorkout.weekNumber,
    });
  }

  await db
    .update(planWorkouts)
    .set({
      linkedWorkoutSessionId: null,
      skippedAt: new Date(),
      state: "skipped",
      updatedAt: new Date(),
    })
    .where(eq(planWorkouts.id, planWorkout.id));

  await syncPlanCompletionState(db, {
    planId: plan.id,
    timeZone: user.timeZone,
  });

  revalidatePath("/");
  revalidatePath("/plans");
  revalidatePath(`/plans/${plan.id}`);
  refresh();
  return;
}

export async function unskipPlanWorkoutAction(formData: FormData) {
  const user = await requireUser();
  const returnWeek = getOptionalWeekNumber(formData, "returnWeek");
  const parsedInput = planWorkoutMutationSchema.safeParse({
    planId: getStringValue(formData, "planId"),
    planWorkoutId: getStringValue(formData, "planWorkoutId"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const plan = await requirePlanRecord(user.id, parsedInput.data.planId);

  if (!plan || plan.status !== "active" || !plan.startDate) {
    redirectToPlansHub({ error: "Active plan no longer exists." });
  }

  const startDate = plan.startDate;

  const planWorkout = await requirePlanWorkoutRecord(
    plan.id,
    parsedInput.data.planWorkoutId,
  );

  if (!planWorkout) {
    redirectToPlan(plan.id, {
      error: "Planned workout no longer exists.",
      week: returnWeek,
    });
  }

  const todayDateKey = getTodayDateKey(user.timeZone);
  const scheduledDate = getPlanWorkoutScheduledDate(
    startDate,
    planWorkout.weekNumber,
    planWorkout.weekday,
  );

  if (planWorkout.state !== "skipped" || scheduledDate < todayDateKey) {
    redirectToPlan(plan.id, {
      error: "That workout can no longer be restored.",
      week: returnWeek ?? planWorkout.weekNumber,
    });
  }

  await db
    .update(planWorkouts)
    .set({
      skippedAt: null,
      state: "planned",
      updatedAt: new Date(),
    })
    .where(eq(planWorkouts.id, planWorkout.id));

  revalidatePath("/");
  revalidatePath("/plans");
  revalidatePath(`/plans/${plan.id}`);
  refresh();
  return;
}

export async function startPlannedWorkoutAction(formData: FormData) {
  const user = await requireUser();
  const returnWeek = getOptionalWeekNumber(formData, "returnWeek");
  const parsedInput = planWorkoutMutationSchema.safeParse({
    planId: getStringValue(formData, "planId"),
    planWorkoutId: getStringValue(formData, "planWorkoutId"),
  });

  if (!parsedInput.success) {
    redirectToPlansHub({ error: getValidationMessage(parsedInput.error) });
  }

  const plan = await requirePlanRecord(user.id, parsedInput.data.planId);

  if (!plan || plan.status !== "active" || !plan.startDate) {
    redirectToPlansHub({ error: "Active plan no longer exists." });
  }

  const startDate = plan.startDate;

  const planWorkout = await requirePlanWorkoutRecord(
    plan.id,
    parsedInput.data.planWorkoutId,
  );

  if (!planWorkout) {
    redirectToPlan(plan.id, {
      error: "Planned workout no longer exists.",
      week: returnWeek,
    });
  }

  const todayDateKey = getTodayDateKey(user.timeZone);
  const scheduledDate = getPlanWorkoutScheduledDate(
    startDate,
    planWorkout.weekNumber,
    planWorkout.weekday,
  );

  if (scheduledDate !== todayDateKey || planWorkout.state !== "planned") {
    redirectToPlan(plan.id, {
      error: "You can only start a planned workout on its scheduled day.",
      week: returnWeek ?? planWorkout.weekNumber,
    });
  }

  const [existingOpenSession] = await db
    .select({
      id: workoutSessions.id,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, user.id),
        isNull(workoutSessions.completedAt),
      ),
    )
    .limit(1);

  if (existingOpenSession) {
    redirectToPlan(plan.id, {
      conflictPlanWorkoutId: planWorkout.id,
      error: "Finish or resume your current workout before starting this plan day.",
      resumeSessionId: existingOpenSession.id,
      week: returnWeek ?? planWorkout.weekNumber,
    });
  }

  const templateExercises = await db
    .select({
      exerciseCategory: exercises.category,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      defaultUnit: exercises.defaultUnit,
      sortOrder: workoutTemplateExercises.sortOrder,
    })
    .from(workoutTemplateExercises)
    .innerJoin(
      exercises,
      eq(workoutTemplateExercises.exerciseId, exercises.id),
    )
    .where(eq(workoutTemplateExercises.workoutTemplateId, planWorkout.workoutTemplateId))
    .orderBy(asc(workoutTemplateExercises.sortOrder));

  if (templateExercises.length === 0) {
    redirectToPlan(plan.id, {
      error: "This template no longer has any exercises.",
      week: returnWeek ?? planWorkout.weekNumber,
    });
  }

  const sessionId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(workoutSessions).values({
      activeEntrySortOrder: templateExercises[0].sortOrder,
      id: sessionId,
      performedOn: todayDateKey,
      planId: plan.id,
      planWorkoutId: planWorkout.id,
      userId: user.id,
    });

    await tx.insert(workoutExerciseEntries).values(
      templateExercises.map((exercise) => ({
        exerciseCategorySnapshot: exercise.exerciseCategory,
        exerciseId: exercise.exerciseId,
        exerciseNameSnapshot: exercise.exerciseName,
        id: randomUUID(),
        sortOrder: exercise.sortOrder,
        unitSnapshot: exercise.defaultUnit,
        workoutSessionId: sessionId,
      })),
    );
  });

  revalidatePath("/");
  revalidatePath("/plans");
  revalidatePath(`/plans/${plan.id}`);
  redirect(`/workouts/${sessionId}`);
}
