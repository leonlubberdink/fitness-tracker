import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import {
  exercises,
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
} from "@/db/schema";

type WorkoutEntryRow = {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
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

function groupEntriesWithSets(
  entries: WorkoutEntryRow[],
  sets: WorkoutSetRow[],
) {
  return entries.map((entry) => ({
    ...entry,
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
  return db
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      defaultUnit: exercises.defaultUnit,
    })
    .from(exercises)
    .where(eq(exercises.userId, userId))
    .orderBy(asc(exercises.name));
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

  return {
    ...session,
    exerciseOptions,
    entries: groupEntriesWithSets(entryRows, setRows),
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
