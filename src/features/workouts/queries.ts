import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import {
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { searchExercisesForUser } from "@/features/exercises/queries";

type WorkoutEntryRow = {
  id: string;
  workoutSessionId: string;
  exerciseId: string | null;
  exerciseNameSnapshot: string;
  exerciseCategorySnapshot: string;
  unitSnapshot: "kg" | "bodyweight";
  sortOrder: number;
  createdAt: Date;
};

type WorkoutSetRow = {
  id: string;
  workoutExerciseEntryId: string;
  setNumber: number;
  reps: number;
  weight: number;
  createdAt: Date;
};

type PreviousExerciseSet = {
  performedOn: string;
  reps: number;
  setNumber: number;
  weight: number;
  unit: "kg" | "bodyweight";
};

function groupEntriesWithSets(
  entries: WorkoutEntryRow[],
  sets: WorkoutSetRow[],
  previousSetsByExerciseId: Map<string, PreviousExerciseSet>,
) {
  return entries.map((entry) => ({
    ...entry,
    previousSet: entry.exerciseId
      ? previousSetsByExerciseId.get(entry.exerciseId) ?? null
      : null,
    sets: sets.filter((set) => set.workoutExerciseEntryId === entry.id),
  }));
}

export async function getOpenWorkoutSessionForUser(userId: string) {
  const [session] = await db
    .select({
      id: workoutSessions.id,
      performedOn: workoutSessions.performedOn,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      activeEntrySortOrder: workoutSessions.activeEntrySortOrder,
    })
    .from(workoutSessions)
    .where(
      and(eq(workoutSessions.userId, userId), isNull(workoutSessions.completedAt)),
    )
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
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      activeEntrySortOrder: workoutSessions.activeEntrySortOrder,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.userId, userId),
        isNull(workoutSessions.completedAt),
      ),
    )
    .limit(1);

  if (!session) {
    return null;
  }

  const [entryRows, setRows, exerciseOptions] = await Promise.all([
    db
      .select({
        id: workoutExerciseEntries.id,
        workoutSessionId: workoutExerciseEntries.workoutSessionId,
        exerciseId: workoutExerciseEntries.exerciseId,
        exerciseNameSnapshot: workoutExerciseEntries.exerciseNameSnapshot,
        exerciseCategorySnapshot:
          workoutExerciseEntries.exerciseCategorySnapshot,
        unitSnapshot: workoutExerciseEntries.unitSnapshot,
        sortOrder: workoutExerciseEntries.sortOrder,
        createdAt: workoutExerciseEntries.createdAt,
      })
      .from(workoutExerciseEntries)
      .where(eq(workoutExerciseEntries.workoutSessionId, session.id))
      .orderBy(asc(workoutExerciseEntries.sortOrder)),
    db
      .select({
        id: workoutSets.id,
        workoutExerciseEntryId: workoutSets.workoutExerciseEntryId,
        setNumber: workoutSets.setNumber,
        reps: workoutSets.reps,
        weight: workoutSets.weight,
        createdAt: workoutSets.createdAt,
      })
      .from(workoutSets)
      .innerJoin(
        workoutExerciseEntries,
        eq(workoutSets.workoutExerciseEntryId, workoutExerciseEntries.id),
      )
      .where(eq(workoutExerciseEntries.workoutSessionId, session.id))
      .orderBy(asc(workoutExerciseEntries.sortOrder), asc(workoutSets.setNumber)),
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
        unit: workoutExerciseEntries.unitSnapshot,
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
          isNotNull(workoutSessions.completedAt),
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
        previousSetsByExerciseId.has(previousSet.exerciseId)
      ) {
        continue;
      }

      previousSetsByExerciseId.set(previousSet.exerciseId, previousSet);
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
  startedAt: Date;
  completedAt: Date | null;
};

type CompletedWorkoutEntry = ReturnType<typeof groupEntriesWithSets>[number];

type CompletedWorkoutSession = CompletedWorkoutSessionRow & {
  exerciseCount: number;
  totalSets: number;
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
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        isNotNull(workoutSessions.completedAt),
      ),
    )
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
      .select({
        id: workoutExerciseEntries.id,
        workoutSessionId: workoutExerciseEntries.workoutSessionId,
        exerciseId: workoutExerciseEntries.exerciseId,
        exerciseNameSnapshot: workoutExerciseEntries.exerciseNameSnapshot,
        exerciseCategorySnapshot:
          workoutExerciseEntries.exerciseCategorySnapshot,
        unitSnapshot: workoutExerciseEntries.unitSnapshot,
        sortOrder: workoutExerciseEntries.sortOrder,
        createdAt: workoutExerciseEntries.createdAt,
      })
      .from(workoutExerciseEntries)
      .where(inArray(workoutExerciseEntries.workoutSessionId, sessionIds))
      .orderBy(
        desc(workoutExerciseEntries.workoutSessionId),
        asc(workoutExerciseEntries.sortOrder),
      ),
    db
      .select({
        id: workoutSets.id,
        workoutExerciseEntryId: workoutSets.workoutExerciseEntryId,
        setNumber: workoutSets.setNumber,
        reps: workoutSets.reps,
        weight: workoutSets.weight,
        createdAt: workoutSets.createdAt,
      })
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
    const sessionEntries =
      entriesBySessionId.get(entry.workoutSessionId) ?? [];
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
