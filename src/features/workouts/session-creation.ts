import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { users, workoutExerciseEntries, workoutSessions } from "@/db/schema";
import type { ExerciseUnit } from "@/lib/exercise-units";

export type WorkoutSessionEntrySeed = {
  exerciseCategorySnapshot: string;
  exerciseId: string | null;
  exerciseNameSnapshot: string;
  notesSnapshot: string | null;
  restTimeSnapshot: string | null;
  sortOrder: number;
  setsRepsSnapshot: string | null;
  unitSnapshot: ExerciseUnit;
};

export async function createWorkoutSessionWithEntries({
  bodyweightKg,
  entries,
  performedOn,
  planId,
  planWorkoutId,
  userId,
  workoutTemplateId,
}: {
  bodyweightKg: number | null;
  entries: WorkoutSessionEntrySeed[];
  performedOn: string;
  planId: string | null;
  planWorkoutId: string | null;
  userId: string;
  workoutTemplateId: string | null;
}) {
  if (entries.length === 0) {
    throw new Error("Cannot create a workout session without entries.");
  }

  const sessionId = randomUUID();
  const startedAt = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(workoutSessions).values({
      activeEntrySortOrder: entries[0].sortOrder,
      bodyweightKg,
      completedAt: null,
      status: "in_progress",
      id: sessionId,
      performedOn,
      planId,
      planWorkoutId,
      startedAt,
      userId,
      workoutTemplateId,
    });

    if (bodyweightKg !== null) {
      await tx
        .update(users)
        .set({
          currentBodyweightKg: bodyweightKg,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    await tx.insert(workoutExerciseEntries).values(
      entries.map((entry) => ({
        exerciseCategorySnapshot: entry.exerciseCategorySnapshot,
        exerciseId: entry.exerciseId,
        exerciseIdSnapshot: entry.exerciseId,
        exerciseNameSnapshot: entry.exerciseNameSnapshot,
        id: randomUUID(),
        notesSnapshot: entry.notesSnapshot,
        restTimeSnapshot: entry.restTimeSnapshot,
        sortOrder: entry.sortOrder,
        setsRepsSnapshot: entry.setsRepsSnapshot,
        unitSnapshot: entry.unitSnapshot,
        workoutSessionId: sessionId,
      })),
    );
  });

  return {
    sessionId,
    startedAt,
  };
}
