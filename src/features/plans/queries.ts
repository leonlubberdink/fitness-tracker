import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { planWorkouts, plans, workoutTemplates } from "@/db/schema";
import { getWorkoutTemplatesForUser } from "@/features/workout-templates/queries";
import { coerceTimeZone, getTodayDateKey } from "@/lib/date";

import { syncPlanCompletionState } from "./core";
import {
  buildPlanProgress,
  formatPlanDateLabel,
  formatPlanDateLong,
  getDerivedPlanWorkoutState,
  getPlanCurrentWeek,
  getPlanWeekdayLabel,
  getPlanWorkoutScheduledDate,
  isPlanWorkoutEditable,
} from "./utils";

type PlanRow = {
  archivedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  durationWeeks: number;
  goal: string;
  id: string;
  name: string;
  startDate: string | null;
  startedAt: Date | null;
  status: "active" | "archived" | "completed" | "draft";
  updatedAt: Date;
};

type PlanWorkoutRow = {
  completedAt: Date | null;
  id: string;
  linkedWorkoutSessionId: string | null;
  planId: string;
  state: "completed" | "planned" | "skipped";
  templateName: string;
  weekNumber: number;
  weekday: number;
  workoutTemplateId: string;
};

function createWeekShell(durationWeeks: number) {
  return Array.from({ length: durationWeeks }, (_, index) => ({
    completedCount: 0,
    resolvedCount: 0,
    skippedCount: 0,
    totalCount: 0,
    weekNumber: index + 1,
    workouts: [] as Array<{
      canEdit: boolean;
      canStart: boolean;
      completedAt: Date | null;
      displayDateLabel: string | null;
      effectiveState: "completed" | "missed" | "planned" | "skipped" | "today" | "upcoming";
      id: string;
      linkedWorkoutSessionId: string | null;
      persistedState: "completed" | "planned" | "skipped";
      scheduledDate: string | null;
      templateName: string;
      weekNumber: number;
      weekday: number;
      weekdayLabel: string;
      workoutTemplateId: string;
    }>,
  }));
}

function buildPlanRecord(
  plan: PlanRow,
  workouts: PlanWorkoutRow[],
  timeZone: string,
) {
  const todayDateKey = getTodayDateKey(timeZone);
  const weeks = createWeekShell(plan.durationWeeks);
  const progressWorkouts: Array<{
    scheduledDate: string;
    state: "completed" | "planned" | "skipped";
  }> = [];
  const scheduledWorkouts = workouts
    .map((workout) => {
      const scheduledDate = plan.startDate
        ? getPlanWorkoutScheduledDate(
            plan.startDate,
            workout.weekNumber,
            workout.weekday,
          )
        : null;
      const effectiveState = scheduledDate
        ? getDerivedPlanWorkoutState(workout.state, scheduledDate, todayDateKey)
        : "planned";
      const canEdit =
        plan.status === "draft" ||
        (plan.status === "active" &&
          scheduledDate !== null &&
          isPlanWorkoutEditable(workout.state, scheduledDate, todayDateKey));
      const canStart =
        plan.status === "active" &&
        scheduledDate !== null &&
        workout.state === "planned" &&
        scheduledDate === todayDateKey;

      if (scheduledDate) {
        progressWorkouts.push({
          scheduledDate,
          state: workout.state,
        });
      }

      return {
        ...workout,
        canEdit,
        canStart,
        displayDateLabel: scheduledDate
          ? formatPlanDateLabel(scheduledDate, timeZone)
          : null,
        effectiveState,
        persistedState: workout.state,
        scheduledDate,
        weekdayLabel: getPlanWeekdayLabel(workout.weekday),
      };
    })
    .sort((left, right) => {
      if (left.weekNumber !== right.weekNumber) {
        return left.weekNumber - right.weekNumber;
      }

      return left.weekday - right.weekday;
    });

  for (const workout of scheduledWorkouts) {
    const week = weeks[workout.weekNumber - 1];

    if (!week) {
      continue;
    }

    week.totalCount += 1;

    if (workout.effectiveState === "completed") {
      week.completedCount += 1;
      week.resolvedCount += 1;
    } else if (
      workout.effectiveState === "missed" ||
      workout.effectiveState === "skipped"
    ) {
      week.resolvedCount += 1;

      if (workout.effectiveState === "skipped") {
        week.skippedCount += 1;
      }
    }

    week.workouts.push(workout);
  }

  const progress = plan.startDate
    ? buildPlanProgress(progressWorkouts, todayDateKey)
    : {
        completed: 0,
        missed: 0,
        remaining: workouts.length,
        resolved: 0,
        skipped: 0,
        total: workouts.length,
      };
  const currentWeekNumber =
    plan.startDate && plan.status !== "draft"
      ? getPlanCurrentWeek(plan.startDate, todayDateKey, plan.durationWeeks)
      : 1;
  const todayWorkout =
    scheduledWorkouts.find((workout) => workout.scheduledDate === todayDateKey) ??
    null;
  const nextWorkout =
    scheduledWorkouts.find(
      (workout) =>
        workout.persistedState === "planned" &&
        workout.scheduledDate !== null &&
        workout.scheduledDate >= todayDateKey,
    ) ?? null;

  return {
    ...plan,
    currentWeekNumber,
    nextWorkout,
    progress,
    startDateLabel:
      plan.startDate && plan.status !== "draft"
        ? formatPlanDateLong(plan.startDate, timeZone)
        : null,
    timeZone,
    todayWorkout,
    totalWorkouts: workouts.length,
    weeks,
  };
}

async function getPlanRowsForUser(userId: string) {
  return db
    .select({
      archivedAt: plans.archivedAt,
      completedAt: plans.completedAt,
      createdAt: plans.createdAt,
      durationWeeks: plans.durationWeeks,
      goal: plans.goal,
      id: plans.id,
      name: plans.name,
      startDate: plans.startDate,
      startedAt: plans.startedAt,
      status: plans.status,
      updatedAt: plans.updatedAt,
    })
    .from(plans)
    .where(eq(plans.userId, userId))
    .orderBy(
      desc(plans.updatedAt),
      desc(plans.createdAt),
      asc(plans.name),
    );
}

async function getPlanWorkoutRows(planIds: string[]) {
  if (planIds.length === 0) {
    return [];
  }

  return db
    .select({
      completedAt: planWorkouts.completedAt,
      id: planWorkouts.id,
      linkedWorkoutSessionId: planWorkouts.linkedWorkoutSessionId,
      planId: planWorkouts.planId,
      state: planWorkouts.state,
      templateName: workoutTemplates.name,
      weekNumber: planWorkouts.weekNumber,
      weekday: planWorkouts.weekday,
      workoutTemplateId: planWorkouts.workoutTemplateId,
    })
    .from(planWorkouts)
    .innerJoin(
      workoutTemplates,
      eq(planWorkouts.workoutTemplateId, workoutTemplates.id),
    )
    .where(inArray(planWorkouts.planId, planIds))
    .orderBy(asc(planWorkouts.weekNumber), asc(planWorkouts.weekday));
}

async function syncActivePlansForUser(userId: string, timeZone: string) {
  const activePlans = await db
    .select({ id: plans.id })
    .from(plans)
    .where(and(eq(plans.userId, userId), eq(plans.status, "active")));

  for (const activePlan of activePlans) {
    await syncPlanCompletionState(db, {
      planId: activePlan.id,
      timeZone,
    });
  }
}

export async function getPlansPageData(userId: string, timeZoneInput: string) {
  const timeZone = coerceTimeZone(timeZoneInput);
  await syncActivePlansForUser(userId, timeZone);

  const planRows = await getPlanRowsForUser(userId);
  const planIds = planRows.map((plan) => plan.id);
  const workoutRows = await getPlanWorkoutRows(planIds);
  const workoutsByPlanId = new Map<string, PlanWorkoutRow[]>();

  for (const planId of planIds) {
    workoutsByPlanId.set(planId, []);
  }

  for (const workout of workoutRows) {
    const planWorkoutList = workoutsByPlanId.get(workout.planId);

    if (planWorkoutList) {
      planWorkoutList.push(workout);
    }
  }

  const planRecords = planRows.map((plan) =>
    buildPlanRecord(plan, workoutsByPlanId.get(plan.id) ?? [], timeZone),
  );

  return {
    activePlan:
      planRecords.find((plan) => plan.status === "active") ?? null,
    draftPlans: planRecords.filter((plan) => plan.status === "draft"),
    pastPlans: planRecords.filter(
      (plan) => plan.status === "completed" || plan.status === "archived",
    ),
    timeZone,
  };
}

export async function getPlanByIdForUser(
  userId: string,
  planId: string,
  timeZoneInput: string,
) {
  const timeZone = coerceTimeZone(timeZoneInput);
  await syncActivePlansForUser(userId, timeZone);

  const [plan] = await db
    .select({
      archivedAt: plans.archivedAt,
      completedAt: plans.completedAt,
      createdAt: plans.createdAt,
      durationWeeks: plans.durationWeeks,
      goal: plans.goal,
      id: plans.id,
      name: plans.name,
      startDate: plans.startDate,
      startedAt: plans.startedAt,
      status: plans.status,
      updatedAt: plans.updatedAt,
    })
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .limit(1);

  if (!plan) {
    return null;
  }

  const [workouts, templateOptions] = await Promise.all([
    db
      .select({
        completedAt: planWorkouts.completedAt,
        id: planWorkouts.id,
        linkedWorkoutSessionId: planWorkouts.linkedWorkoutSessionId,
        planId: planWorkouts.planId,
        state: planWorkouts.state,
        templateName: workoutTemplates.name,
        weekNumber: planWorkouts.weekNumber,
        weekday: planWorkouts.weekday,
        workoutTemplateId: planWorkouts.workoutTemplateId,
      })
      .from(planWorkouts)
      .innerJoin(
        workoutTemplates,
        eq(planWorkouts.workoutTemplateId, workoutTemplates.id),
      )
      .where(eq(planWorkouts.planId, plan.id))
      .orderBy(asc(planWorkouts.weekNumber), asc(planWorkouts.weekday)),
    plan.status === "draft" || plan.status === "active"
      ? getWorkoutTemplatesForUser(userId)
      : Promise.resolve([]),
  ]);

  return {
    ...buildPlanRecord(plan, workouts, timeZone),
    templateOptions: templateOptions.map((template) => ({
      exerciseCount: template.exerciseCount,
      id: template.id,
      isReadyToStart: template.isReadyToStart,
      name: template.name,
    })),
  };
}

export async function requirePlanByIdForUser(
  userId: string,
  planId: string,
  timeZone: string,
) {
  const plan = await getPlanByIdForUser(userId, planId, timeZone);

  if (!plan) {
    notFound();
  }

  return plan;
}
