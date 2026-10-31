import {
  closedSessionPredicate,
  recordedWorkSetPredicate,
  openSessionPredicate,
} from "@/features/workouts/predicates";
import { getTableColumns, and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import {
  workoutTemplates,
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { formatStoredExerciseCategories } from "@/features/exercises/categories";
import { searchExercisesForUser } from "@/features/exercises/queries";
import type { ExerciseUnit } from "@/lib/exercise-units";
import type { LoadRecommendation } from "./load-recommendations";

type WorkoutEntryRow = typeof workoutExerciseEntries.$inferSelect;
type WorkoutSetRow = typeof workoutSets.$inferSelect;

type PreviousExerciseSet = {
  performedOn: string;
  reps: number;
  setNumber: number;
  weight: number;
  sessionBodyweightKg: number | null;
  unit: ExerciseUnit;
  nextLoadRecommendation: LoadRecommendation | null;
};

function groupEntriesWithSets(
  entries: WorkoutEntryRow[],
  sets: WorkoutSetRow[],
  previousSetsByExerciseId: Map<string, PreviousExerciseSet>,
) {
  return entries.map((entry) => ({
    ...entry,
    exerciseCategorySnapshot: formatStoredExerciseCategories(
      entry.exerciseCategorySnapshot,
    ),
    previousSet: entry.exerciseId
      ? (previousSetsByExerciseId.get(entry.exerciseId) ?? null)
      : null,
    sets: sets.filter((set) => set.workoutExerciseEntryId === entry.id),
  }));
}

export async function getOpenWorkoutSessionForUser(userId: string) {
  const [session] = await db
    .select({
      id: workoutSessions.id,
      performedOn: workoutSessions.performedOn,
      bodyweightKg: workoutSessions.bodyweightKg,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      endedAt: workoutSessions.endedAt,
      status: workoutSessions.status,
      activeEntrySortOrder: workoutSessions.activeEntrySortOrder,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), openSessionPredicate()))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);

  return session ?? null;
}

export async function getExerciseOptionsForUser(userId: string) {
  return searchExercisesForUser(userId);
}

export async function getWorkoutSessionForLogging(
  userId: string,
  sessionId: string,
) {
  const [session] = await db
    .select({
      id: workoutSessions.id,
      performedOn: workoutSessions.performedOn,
      bodyweightKg: workoutSessions.bodyweightKg,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      endedAt: workoutSessions.endedAt,
      status: workoutSessions.status,
      activeEntrySortOrder: workoutSessions.activeEntrySortOrder,
      workoutTemplateDescription: workoutTemplates.description,
    })
    .from(workoutSessions)
    .leftJoin(
      workoutTemplates,
      eq(workoutSessions.workoutTemplateId, workoutTemplates.id),
    )
    .where(
      and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.userId, userId),
        openSessionPredicate(),
      ),
    )
    .limit(1);

  if (!session) {
    return null;
  }

  const [entryRows, setRows, exerciseOptions] = await Promise.all([
    db
      .select(getTableColumns(workoutExerciseEntries))
      .from(workoutExerciseEntries)
      .where(eq(workoutExerciseEntries.workoutSessionId, session.id))
      .orderBy(asc(workoutExerciseEntries.sortOrder)),
    db
      .select(getTableColumns(workoutSets))
      .from(workoutSets)
      .innerJoin(
        workoutExerciseEntries,
        eq(workoutSets.workoutExerciseEntryId, workoutExerciseEntries.id),
      )
      .where(eq(workoutExerciseEntries.workoutSessionId, session.id))
      .orderBy(
        asc(workoutExerciseEntries.sortOrder),
        asc(workoutSets.setNumber),
      ),
    getExerciseOptionsForUser(userId),
  ]);

  const exerciseIds = [
    ...new Set(
      entryRows
        .map((entry) => entry.exerciseId)
        .filter((exerciseId): exerciseId is string => exerciseId !== null),
    ),
  ];
  const previousSetsByExerciseId = new Map<string, PreviousExerciseSet>();

  if (exerciseIds.length > 0) {
    const previousSetRows = await db
      .select({
        exerciseId: workoutExerciseEntries.exerciseId,
        performedOn: workoutSessions.performedOn,
        sessionBodyweightKg: workoutSessions.bodyweightKg,
        unit: workoutExerciseEntries.unitSnapshot,
        nextLoadRecommendation: workoutExerciseEntries.nextLoadRecommendation,
        reps: workoutSets.reps,
        setNumber: workoutSets.setNumber,
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
          inArray(workoutExerciseEntries.exerciseId, exerciseIds),
          closedSessionPredicate(),
          recordedWorkSetPredicate(),
        ),
      )
      .orderBy(
        desc(workoutSessions.performedOn),
        desc(workoutSessions.startedAt),
        desc(workoutExerciseEntries.sortOrder),
        desc(workoutSets.setNumber),
      );

    for (const previousSet of previousSetRows) {
      if (
        previousSet.exerciseId === null ||
        previousSet.reps === null ||
        previousSet.weight === null ||
        previousSetsByExerciseId.has(previousSet.exerciseId)
      ) {
        continue;
      }

      previousSetsByExerciseId.set(previousSet.exerciseId, {
        ...previousSet,
        reps: previousSet.reps,
        weight: previousSet.weight,
      });
    }
  }

  return {
    ...session,
    exerciseOptions,
    entries: groupEntriesWithSets(entryRows, setRows, previousSetsByExerciseId),
  };
}

export async function requireWorkoutSessionForLogging(
  userId: string,
  sessionId: string,
) {
  const session = await getWorkoutSessionForLogging(userId, sessionId);

  if (!session) {
    notFound();
  }

  return session;
}

type CompletedWorkoutSessionRow = {
  id: string;
  performedOn: string;
  bodyweightKg: number | null;
  startedAt: Date;
  completedAt: Date | null;
  endedAt: Date | null;
  status: typeof workoutSessions.$inferSelect.status;
};

type CompletedWorkoutEntry = ReturnType<typeof groupEntriesWithSets>[number];

type CompletedWorkoutSession = CompletedWorkoutSessionRow & {
  exerciseCount: number;
  totalSets: number;
  workingSets: number;
  warmupSets: number;
  unclassifiedSets: number;
  entries: CompletedWorkoutEntry[];
};

export async function getCompletedWorkoutHistoryForUser(
  userId: string,
  limit = 30,
) {
  const sessionRows = await db
    .select({
      id: workoutSessions.id,
      performedOn: workoutSessions.performedOn,
      bodyweightKg: workoutSessions.bodyweightKg,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      endedAt: workoutSessions.endedAt,
      status: workoutSessions.status,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), closedSessionPredicate()))
    .orderBy(
      desc(workoutSessions.performedOn),
      desc(workoutSessions.startedAt),
      desc(workoutSessions.id),
    )
    .limit(limit);

  if (sessionRows.length === 0) {
    return [];
  }

  const sessionIds = sessionRows.map((session) => session.id);

  const [entryRows, setRows] = await Promise.all([
    db
      .select(getTableColumns(workoutExerciseEntries))
      .from(workoutExerciseEntries)
      .where(inArray(workoutExerciseEntries.workoutSessionId, sessionIds))
      .orderBy(
        desc(workoutExerciseEntries.workoutSessionId),
        asc(workoutExerciseEntries.sortOrder),
      ),
    db
      .select(getTableColumns(workoutSets))
      .from(workoutSets)
      .innerJoin(
        workoutExerciseEntries,
        eq(workoutSets.workoutExerciseEntryId, workoutExerciseEntries.id),
      )
      .where(inArray(workoutExerciseEntries.workoutSessionId, sessionIds))
      .orderBy(
        desc(workoutExerciseEntries.workoutSessionId),
        asc(workoutExerciseEntries.sortOrder),
        asc(workoutSets.setNumber),
      ),
  ]);

  const entriesWithSets = groupEntriesWithSets(entryRows, setRows, new Map());
  const entriesBySessionId = new Map<string, CompletedWorkoutEntry[]>();

  for (const entry of entriesWithSets) {
    const sessionEntries = entriesBySessionId.get(entry.workoutSessionId) ?? [];
    sessionEntries.push(entry);
    entriesBySessionId.set(entry.workoutSessionId, sessionEntries);
  }

  const completedSessions: CompletedWorkoutSession[] = sessionRows.map(
    (session) => {
      const entries = entriesBySessionId.get(session.id) ?? [];
      const totalSets = entries.reduce(
        (count, entry) => count + entry.sets.length,
        0,
      );

      return {
        ...session,
        entries,
        exerciseCount: entries.length,
        totalSets,
        workingSets: entries
          .flatMap((entry) => entry.sets)
          .filter(
            (set) =>
              set.setType === "working" &&
              set.reps !== null &&
              set.weight !== null,
          ).length,
        warmupSets: entries
          .flatMap((entry) => entry.sets)
          .filter(
            (set) =>
              set.setType === "warmup" &&
              set.reps !== null &&
              set.weight !== null,
          ).length,
        unclassifiedSets: entries
          .flatMap((entry) => entry.sets)
          .filter((set) => set.setType === null).length,
      };
    },
  );

  const historyByDate = new Map<
    string,
    {
      performedOn: string;
      sessions: CompletedWorkoutSession[];
    }
  >();

  for (const session of completedSessions) {
    const dateGroup = historyByDate.get(session.performedOn);

    if (dateGroup) {
      dateGroup.sessions.push(session);
      continue;
    }

    historyByDate.set(session.performedOn, {
      performedOn: session.performedOn,
      sessions: [session],
    });
  }

  return Array.from(historyByDate.values());
}
