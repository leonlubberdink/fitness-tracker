import { and, asc, eq } from "drizzle-orm";
import {
  closedSessionPredicate,
  recordedWorkSetPredicate,
} from "@/features/workouts/predicates";

import { db } from "@/db/client";
import {
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { formatStoredExerciseCategories } from "@/features/exercises/categories";

import {
  getStatisticsPageDataFromSessions,
  type StatisticsPageData,
  type StatisticsRangeKey,
  type StatisticsRow,
  type StatisticsSession,
} from "./core";

export * from "./core";

async function getCompletedStatisticsSessionsForUser(userId: string) {
  const rows = await db
    .select({
      sessionId: workoutSessions.id,
      performedOn: workoutSessions.performedOn,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      endedAt: workoutSessions.endedAt,
      sessionBodyweightKg: workoutSessions.bodyweightKg,
      entryId: workoutExerciseEntries.id,
      exerciseId: workoutExerciseEntries.exerciseId,
      exerciseNameSnapshot: workoutExerciseEntries.exerciseNameSnapshot,
      exerciseCategorySnapshot: workoutExerciseEntries.exerciseCategorySnapshot,
      sortOrder: workoutExerciseEntries.sortOrder,
      unitSnapshot: workoutExerciseEntries.unitSnapshot,
      setId: workoutSets.id,
      setNumber: workoutSets.setNumber,
      reps: workoutSets.reps,
      weight: workoutSets.weight,

      setType: workoutSets.setType,
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
        closedSessionPredicate(),
        recordedWorkSetPredicate(),
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
    if (row.reps === null || row.weight === null) {
      continue;
    }

    const statisticsRow: StatisticsRow = {
      ...row,
      completedAt: row.completedAt,
      reps: row.reps,
      weight: row.weight,
      exerciseCategorySnapshot: formatStoredExerciseCategories(
        row.exerciseCategorySnapshot,
      ),
    };

    const session =
      sessions.get(statisticsRow.sessionId) ??
      ({
        bodyweightKg: statisticsRow.sessionBodyweightKg,
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
  return getStatisticsPageDataFromSessions(sessions, {
    exerciseKey,
    range,
  });
}
