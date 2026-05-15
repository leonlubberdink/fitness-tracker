import {
  compareDateKeys,
  formatDateForDisplay,
  getDateKeyDifferenceInDays,
  getScheduledDateKey,
  getStartOfWeekDateKey,
  getWeekdayFromDateKey,
} from "@/lib/date";

export const PLAN_STATUS_LABELS = {
  active: "Active",
  archived: "Archived",
  completed: "Completed",
  draft: "Draft",
} as const;

export const PLAN_WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

export type PersistedPlanWorkoutState = "completed" | "planned" | "skipped";
export type DerivedPlanWorkoutState =
  | PersistedPlanWorkoutState
  | "missed"
  | "today"
  | "upcoming";

export type PlanWorkoutScheduleInput = {
  completedAt: Date | null;
  id: string;
  linkedWorkoutSessionId: string | null;
  state: PersistedPlanWorkoutState;
  templateName: string;
  weekNumber: number;
  weekday: number;
  workoutTemplateId: string;
};

export function getPlanWeekdayLabel(weekday: number) {
  return (
    PLAN_WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.label ??
    `Day ${weekday}`
  );
}

export function getPlanWeekLongLabel(weekday: number) {
  return formatDateForDisplay(getScheduledDateKey("2025-01-06", 1, weekday), "UTC", {
    weekday: "long",
  });
}

export function getPlanWorkoutScheduledDate(
  startDate: string,
  weekNumber: number,
  weekday: number,
) {
  return getScheduledDateKey(startDate, weekNumber, weekday);
}

export function getDerivedPlanWorkoutState(
  persistedState: PersistedPlanWorkoutState,
  scheduledDate: string,
  todayDateKey: string,
): DerivedPlanWorkoutState {
  if (persistedState === "completed" || persistedState === "skipped") {
    return persistedState;
  }

  const comparison = compareDateKeys(scheduledDate, todayDateKey);

  if (comparison < 0) {
    return "missed";
  }

  if (comparison === 0) {
    return "today";
  }

  return "upcoming";
}

export function isPlanWorkoutEditable(
  persistedState: PersistedPlanWorkoutState,
  scheduledDate: string,
  todayDateKey: string,
) {
  return (
    persistedState === "planned" &&
    compareDateKeys(scheduledDate, todayDateKey) >= 0
  );
}

export function isPlanWorkoutResolved(
  persistedState: PersistedPlanWorkoutState,
  scheduledDate: string,
  todayDateKey: string,
) {
  return (
    persistedState !== "planned" ||
    compareDateKeys(scheduledDate, todayDateKey) < 0
  );
}

export function getPlanCurrentWeek(
  startDate: string,
  todayDateKey: string,
  durationWeeks: number,
) {
  const startWeek = getStartOfWeekDateKey(startDate);
  const todayWeek = getStartOfWeekDateKey(todayDateKey);
  const weekOffset = Math.floor(getDateKeyDifferenceInDays(todayWeek, startWeek) / 7);
  return Math.min(durationWeeks, Math.max(1, weekOffset + 1));
}

export function formatPlanDateLabel(dateKey: string, timeZone: string) {
  return formatDateForDisplay(dateKey, timeZone, {
    day: "numeric",
    month: "short",
  });
}

export function formatPlanDateLong(dateKey: string, timeZone: string) {
  return formatDateForDisplay(dateKey, timeZone, {
    dateStyle: "full",
  });
}

export function getWeekOneCutoffWeekday(startDate: string) {
  return getWeekdayFromDateKey(startDate);
}

export function buildPlanProgress(
  workouts: Array<{
    scheduledDate: string;
    state: PersistedPlanWorkoutState;
  }>,
  todayDateKey: string,
) {
  let completed = 0;
  let skipped = 0;
  let missed = 0;
  let remaining = 0;

  for (const workout of workouts) {
    const derivedState = getDerivedPlanWorkoutState(
      workout.state,
      workout.scheduledDate,
      todayDateKey,
    );

    if (derivedState === "completed") {
      completed += 1;
      continue;
    }

    if (derivedState === "skipped") {
      skipped += 1;
      continue;
    }

    if (derivedState === "missed") {
      missed += 1;
      continue;
    }

    remaining += 1;
  }

  return {
    completed,
    missed,
    remaining,
    resolved: completed + skipped + missed,
    skipped,
    total: workouts.length,
  };
}

export function getPlanCompletionState(
  workouts: Array<{
    scheduledDate: string;
    state: PersistedPlanWorkoutState;
  }>,
  todayDateKey: string,
) {
  return workouts.every((workout) =>
    isPlanWorkoutResolved(workout.state, workout.scheduledDate, todayDateKey),
  );
}
