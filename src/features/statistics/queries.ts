import { and, asc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db/client";
import {
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { formatStoredExerciseCategories } from "@/features/exercises/categories";
import {
  formatExerciseMetricValue,
  type ExerciseUnit,
} from "@/lib/exercise-units";

export const STATISTICS_RANGE_KEYS = ["30d", "12w", "all"] as const;

export type StatisticsRangeKey = (typeof STATISTICS_RANGE_KEYS)[number];

type StatisticsRow = {
  sessionId: string;
  performedOn: string;
  startedAt: Date;
  completedAt: Date;
  entryId: string;
  exerciseId: string | null;
  exerciseNameSnapshot: string;
  exerciseCategorySnapshot: string;
  unitSnapshot: ExerciseUnit;
  sortOrder: number;
  setId: string;
  setNumber: number;
  reps: number;
  weight: number;
};

type StatisticsSession = {
  sessionId: string;
  performedOn: string;
  startedAt: Date;
  completedAt: Date;
  records: StatisticsRow[];
};

type StatisticsWindow = {
  comparisonLabel: string | null;
  end: string;
  label: string;
  previousEnd: string | null;
  previousStart: string | null;
  start: string | null;
};

export type StatisticsSummaryMetric = {
  delta: {
    comparisonLabel: string;
    currentValue: number;
    previousValue: number;
    value: number;
  } | null;
  value: number;
};

export type StatisticsRangeSummary = {
  label: string;
  sets: StatisticsSummaryMetric;
  volumeKg: StatisticsSummaryMetric;
  workouts: StatisticsSummaryMetric;
};

export type StatisticsWeeklyTrendPoint = {
  shortLabel: string;
  volumeKg: number;
  weekStart: string;
  workoutCount: number;
};

export type StatisticsExerciseOption = {
  category: string;
  key: string;
  label: string;
  sessionCount: number;
  unit: ExerciseUnit;
};

export type StatisticsExerciseSessionDetail = {
  bestSetLabel: string;
  chartValue: number;
  performedOn: string;
  sessionId: string;
  totalSets: number;
  volumeKg: number | null;
};

export type StatisticsExerciseProgression = {
  category: string;
  chartHelpText: string;
  chartMetric: "duration" | "load" | "reps";
  chartMetricLabel: string;
  details: StatisticsExerciseSessionDetail[];
  exerciseKey: string;
  exerciseLabel: string;
  points: Array<{
    performedOn: string;
    sessionId: string;
    shortLabel: string;
    tooltipLabel: string;
    value: number;
  }>;
  unit: ExerciseUnit;
};

export type StatisticsPageData = {
  exerciseOptions: StatisticsExerciseOption[];
  hasCompletedWorkouts: boolean;
  selectedExercise: StatisticsExerciseProgression | null;
  summary: StatisticsRangeSummary;
  weeklyTrend: StatisticsWeeklyTrendPoint[];
};

function padNumber(value: number) {
  return String(value).padStart(2, "0");
}

function toUtcDateOnly(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(value: Date) {
  return `${value.getUTCFullYear()}-${padNumber(value.getUTCMonth() + 1)}-${padNumber(value.getUTCDate())}`;
}

function addUtcDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function getTodayDateKey() {
  return formatDateKey(toUtcDateOnly(new Date()));
}

function getStatisticsWindow(rangeKey: StatisticsRangeKey): StatisticsWindow {
  const today = parseDateKey(getTodayDateKey());

  if (rangeKey === "all") {
    return {
      comparisonLabel: null,
      end: formatDateKey(today),
      label: "All time",
      previousEnd: null,
      previousStart: null,
      start: null,
    };
  }

  const dayCount = rangeKey === "30d" ? 30 : 84;
  const currentStart = addUtcDays(today, -(dayCount - 1));
  const previousEnd = addUtcDays(currentStart, -1);
  const previousStart = addUtcDays(previousEnd, -(dayCount - 1));

  return {
    comparisonLabel: rangeKey === "30d" ? "vs previous 30 days" : "vs previous 12 weeks",
    end: formatDateKey(today),
    label: rangeKey === "30d" ? "Last 30 days" : "Last 12 weeks",
    previousEnd: formatDateKey(previousEnd),
    previousStart: formatDateKey(previousStart),
    start: formatDateKey(currentStart),
  };
}

function isWithinWindow(dateKey: string, start: string | null, end: string | null) {
  if (start && dateKey < start) {
    return false;
  }

  if (end && dateKey > end) {
    return false;
  }

  return true;
}

function startOfUtcWeek(value: Date) {
  const day = value.getUTCDay();
  const difference = day === 0 ? -6 : 1 - day;
  return addUtcDays(value, difference);
}

function formatWeekLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(parseDateKey(value));
}

function formatExercisePointLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(parseDateKey(value));
}

function getExerciseSelectionKey(record: Pick<StatisticsRow, "exerciseId" | "exerciseNameSnapshot">) {
  return record.exerciseId ?? `snapshot:${record.exerciseNameSnapshot.trim().toLowerCase()}`;
}

function formatBestSetLabel(unit: ExerciseUnit, weight: number, reps: number) {
  if (unit === "time") {
    return `${reps} reps · ${formatExerciseMetricValue(unit, weight)}`;
  }

  if (unit === "bodyweight") {
    return `${reps} reps · ${formatExerciseMetricValue(unit, weight)}`;
  }

  return `${formatExerciseMetricValue(unit, weight)} · ${reps} reps`;
}

function getSessionVolumeKg(session: StatisticsSession) {
  return session.records.reduce((total, record) => {
    if (record.unitSnapshot !== "kg") {
      return total;
    }

    return total + record.reps * record.weight;
  }, 0);
}

function createMetric(
  value: number,
  previousValue: number,
  comparisonLabel: string | null,
): StatisticsSummaryMetric {
  return {
    delta: comparisonLabel
      ? {
          comparisonLabel,
          currentValue: value,
          previousValue,
          value: value - previousValue,
        }
      : null,
    value,
  };
}

function buildSummary(
  currentSessions: StatisticsSession[],
  previousSessions: StatisticsSession[],
  window: StatisticsWindow,
): StatisticsRangeSummary {
  const currentSets = currentSessions.reduce(
    (count, session) => count + session.records.length,
    0,
  );
  const currentVolumeKg = currentSessions.reduce(
    (total, session) => total + getSessionVolumeKg(session),
    0,
  );
  const previousSets = previousSessions.reduce(
    (count, session) => count + session.records.length,
    0,
  );
  const previousVolumeKg = previousSessions.reduce(
    (total, session) => total + getSessionVolumeKg(session),
    0,
  );

  return {
    label: window.label,
    sets: createMetric(currentSets, previousSets, window.comparisonLabel),
    volumeKg: createMetric(
      currentVolumeKg,
      previousVolumeKg,
      window.comparisonLabel,
    ),
    workouts: createMetric(
      currentSessions.length,
      previousSessions.length,
      window.comparisonLabel,
    ),
  };
}

function buildWeeklyTrend(
  currentSessions: StatisticsSession[],
  window: StatisticsWindow,
): StatisticsWeeklyTrendPoint[] {
  if (currentSessions.length === 0) {
    return [];
  }

  const firstDateKey = window.start ?? currentSessions[0].performedOn;
  const startWeek = startOfUtcWeek(parseDateKey(firstDateKey));
  const endWeek = startOfUtcWeek(parseDateKey(window.end));
  const buckets = new Map<
    string,
    {
      volumeKg: number;
      workoutCount: number;
    }
  >();

  for (
    let cursor = startWeek;
    cursor.getTime() <= endWeek.getTime();
    cursor = addUtcDays(cursor, 7)
  ) {
    buckets.set(formatDateKey(cursor), {
      volumeKg: 0,
      workoutCount: 0,
    });
  }

  for (const session of currentSessions) {
    const bucketKey = formatDateKey(
      startOfUtcWeek(parseDateKey(session.performedOn)),
    );
    const bucket = buckets.get(bucketKey);

    if (!bucket) {
      continue;
    }

    bucket.workoutCount += 1;
    bucket.volumeKg += getSessionVolumeKg(session);
  }

  return Array.from(buckets.entries()).map(([weekStart, value]) => ({
    shortLabel: formatWeekLabel(weekStart),
    volumeKg: value.volumeKg,
    weekStart,
    workoutCount: value.workoutCount,
  }));
}

function buildExerciseOptions(currentSessions: StatisticsSession[]) {
  const optionMap = new Map<
    string,
    StatisticsExerciseOption & {
      latestPerformedOn: string;
      sessionIds: Set<string>;
    }
  >();

  for (const session of currentSessions) {
    const seenKeys = new Set<string>();

    for (const record of session.records) {
      const selectionKey = getExerciseSelectionKey(record);
      const existing =
        optionMap.get(selectionKey) ??
        ({
          category: record.exerciseCategorySnapshot,
          key: selectionKey,
          label: record.exerciseNameSnapshot,
          latestPerformedOn: session.performedOn,
          sessionCount: 0,
          sessionIds: new Set<string>(),
          unit: record.unitSnapshot,
        } satisfies StatisticsExerciseOption & {
          latestPerformedOn: string;
          sessionIds: Set<string>;
        });

      if (session.performedOn >= existing.latestPerformedOn) {
        existing.label = record.exerciseNameSnapshot;
        existing.category = record.exerciseCategorySnapshot;
        existing.unit = record.unitSnapshot;
        existing.latestPerformedOn = session.performedOn;
      }

      if (!seenKeys.has(selectionKey) && !existing.sessionIds.has(session.sessionId)) {
        existing.sessionCount += 1;
        existing.sessionIds.add(session.sessionId);
        seenKeys.add(selectionKey);
      }

      optionMap.set(selectionKey, existing);
    }
  }

  return Array.from(optionMap.values())
    .map((option) => ({
      category: option.category,
      key: option.key,
      label: option.label,
      sessionCount: option.sessionCount,
      unit: option.unit,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "en"));
}

function buildExerciseProgression(
  currentSessions: StatisticsSession[],
  exerciseKey: string | null,
): StatisticsExerciseProgression | null {
  if (!exerciseKey) {
    return null;
  }

  const matchingSessions = currentSessions
    .map((session) => {
      const matchingRecords = session.records.filter(
        (record) => getExerciseSelectionKey(record) === exerciseKey,
      );

      if (matchingRecords.length === 0) {
        return null;
      }

      const latestRecord = matchingRecords[matchingRecords.length - 1];
      const bestSet = matchingRecords.reduce((currentBest, candidate) => {
        if (candidate.weight > currentBest.weight) {
          return candidate;
        }

        if (candidate.weight === currentBest.weight && candidate.reps > currentBest.reps) {
          return candidate;
        }

        return currentBest;
      }, matchingRecords[0]);
      const unit = latestRecord.unitSnapshot;
      const chartValue =
        unit === "kg" ? bestSet.weight : unit === "time" ? bestSet.weight : bestSet.reps;

      return {
        bestSetLabel: formatBestSetLabel(unit, bestSet.weight, bestSet.reps),
        category: latestRecord.exerciseCategorySnapshot,
        chartValue,
        exerciseLabel: latestRecord.exerciseNameSnapshot,
        performedOn: session.performedOn,
        sessionId: session.sessionId,
        totalSets: matchingRecords.length,
        unit,
        volumeKg:
          unit === "kg"
            ? matchingRecords.reduce(
                (total, record) => total + record.reps * record.weight,
                0,
              )
            : null,
      };
    })
    .filter(
      (
        session,
      ): session is {
        bestSetLabel: string;
        category: string;
        chartValue: number;
        exerciseLabel: string;
        performedOn: string;
        sessionId: string;
        totalSets: number;
        unit: ExerciseUnit;
        volumeKg: number | null;
      } => session !== null,
    );

  if (matchingSessions.length === 0) {
    return null;
  }

  const latestSession = matchingSessions[matchingSessions.length - 1];
  const chartMetric =
    latestSession.unit === "kg"
      ? "load"
      : latestSession.unit === "time"
        ? "duration"
        : "reps";

  return {
    category: latestSession.category,
    chartHelpText:
      latestSession.unit === "kg"
        ? "Line shows the heaviest logged set in each completed workout. Use the list below to review reps and total work."
        : latestSession.unit === "time"
          ? "Line shows the longest logged set in each completed workout. Use the list below to review reps and time."
          : "Line shows reps from the best logged set in each completed workout. Use the list below to review bodyweight load.",
    chartMetric,
    chartMetricLabel:
      latestSession.unit === "kg"
        ? "Best load"
        : latestSession.unit === "time"
          ? "Longest duration"
          : "Best reps",
    details: [...matchingSessions]
      .reverse()
      .map(({ bestSetLabel, chartValue, performedOn, sessionId, totalSets, volumeKg }) => ({
        bestSetLabel,
        chartValue,
        performedOn,
        sessionId,
        totalSets,
        volumeKg,
      })),
    exerciseKey,
    exerciseLabel: latestSession.exerciseLabel,
    points: matchingSessions.map(
      ({ bestSetLabel, chartValue, performedOn, sessionId }) => ({
        performedOn,
        sessionId,
        shortLabel: formatExercisePointLabel(performedOn),
        tooltipLabel: `${formatExercisePointLabel(performedOn)} · ${bestSetLabel}`,
        value: chartValue,
      }),
    ),
    unit: latestSession.unit,
  };
}

async function getCompletedStatisticsSessionsForUser(userId: string) {
  const rows = await db
    .select({
      sessionId: workoutSessions.id,
      performedOn: workoutSessions.performedOn,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      entryId: workoutExerciseEntries.id,
      exerciseId: workoutExerciseEntries.exerciseId,
      exerciseNameSnapshot: workoutExerciseEntries.exerciseNameSnapshot,
      exerciseCategorySnapshot:
        workoutExerciseEntries.exerciseCategorySnapshot,
      sortOrder: workoutExerciseEntries.sortOrder,
      unitSnapshot: workoutExerciseEntries.unitSnapshot,
      setId: workoutSets.id,
      setNumber: workoutSets.setNumber,
      reps: workoutSets.reps,
      weight: workoutSets.weight,
    })
    .from(workoutSets)
    .innerJoin(
      workoutExerciseEntries,
      eq(workoutSets.workoutExerciseEntryId, workoutExerciseEntries.id),
    )
    .innerJoin(
      workoutSessions,
      eq(workoutExerciseEntries.workoutSessionId, workoutSessions.id),
    )
    .where(
      and(
        eq(workoutSessions.userId, userId),
        isNotNull(workoutSessions.completedAt),
      ),
    )
    .orderBy(
      asc(workoutSessions.performedOn),
      asc(workoutSessions.startedAt),
      asc(workoutExerciseEntries.sortOrder),
      asc(workoutSets.setNumber),
    );

  const sessions = new Map<string, StatisticsSession>();

  for (const row of rows) {
    if (row.completedAt === null) {
      continue;
    }

    const statisticsRow: StatisticsRow = {
      ...row,
      completedAt: row.completedAt,
      exerciseCategorySnapshot: formatStoredExerciseCategories(
        row.exerciseCategorySnapshot,
      ),
    };

    const session =
      sessions.get(statisticsRow.sessionId) ??
      ({
        completedAt: statisticsRow.completedAt,
        performedOn: statisticsRow.performedOn,
        records: [],
        sessionId: statisticsRow.sessionId,
        startedAt: statisticsRow.startedAt,
      } satisfies StatisticsSession);

    session.records.push(statisticsRow);
    sessions.set(statisticsRow.sessionId, session);
  }

  return Array.from(sessions.values());
}

export async function getStatisticsPageData(
  userId: string,
  {
    exerciseKey,
    range,
  }: {
    exerciseKey?: string | null;
    range: StatisticsRangeKey;
  },
): Promise<StatisticsPageData> {
  const sessions = await getCompletedStatisticsSessionsForUser(userId);
  const window = getStatisticsWindow(range);
  const currentSessions = sessions.filter((session) =>
    isWithinWindow(session.performedOn, window.start, window.end),
  );
  const previousSessions =
    window.previousStart && window.previousEnd
      ? sessions.filter((session) =>
          isWithinWindow(
            session.performedOn,
            window.previousStart,
            window.previousEnd,
          ),
        )
      : [];
  const exerciseOptions = buildExerciseOptions(currentSessions);
  const safeExerciseKey = exerciseOptions.some(
    (option) => option.key === exerciseKey,
  )
    ? exerciseKey ?? null
    : null;

  return {
    exerciseOptions,
    hasCompletedWorkouts: sessions.length > 0,
    selectedExercise: buildExerciseProgression(currentSessions, safeExerciseKey),
    summary: buildSummary(currentSessions, previousSessions, window),
    weeklyTrend: buildWeeklyTrend(currentSessions, window),
  };
}
