import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  exercises,
  plans,
  planWorkouts,
  workoutSessions,
  workoutExerciseEntries,
  workoutSets,
} from "@/db/schema";
import { buildWorkoutExport } from "./export";
import type { ExportRange } from "./export-schema";
import { version } from "../../../package.json";

export async function getWorkoutExportForUser(
  user: { id: string; timeZone: string },
  range: ExportRange,
) {
  // Read one consistent snapshot, without the History page's display limit.
  return db.transaction(
    async (tx) => {
      const selection = and(
        eq(workoutSessions.userId, user.id),
        range.start ? gte(workoutSessions.performedOn, range.start) : undefined,
        range.end ? lte(workoutSessions.performedOn, range.end) : undefined,
      );
      const sessions = await tx.select().from(workoutSessions).where(selection);
      const entries = await tx
        .select({ entry: workoutExerciseEntries })
        .from(workoutExerciseEntries)
        .innerJoin(
          workoutSessions,
          eq(workoutExerciseEntries.workoutSessionId, workoutSessions.id),
        )
        .where(selection);
      const sets = await tx
        .select({ set: workoutSets })
        .from(workoutSets)
        .innerJoin(
          workoutExerciseEntries,
          eq(workoutSets.workoutExerciseEntryId, workoutExerciseEntries.id),
        )
        .innerJoin(
          workoutSessions,
          eq(workoutExerciseEntries.workoutSessionId, workoutSessions.id),
        )
        .where(selection);
      const catalog = await tx
        .select()
        .from(exercises)
        .where(eq(exercises.userId, user.id))
        .orderBy(asc(exercises.id));
      const skipped = await tx
        .select({ workout: planWorkouts, planStartDate: plans.startDate })
        .from(planWorkouts)
        .innerJoin(plans, eq(planWorkouts.planId, plans.id))
        .where(
          and(eq(plans.userId, user.id), eq(planWorkouts.state, "skipped")),
        );
      // Use every linked session for skip deduplication, even outside this selection.
      const linked = await tx
        .select({ planWorkoutId: workoutSessions.planWorkoutId })
        .from(workoutSessions)
        .where(eq(workoutSessions.userId, user.id));
      const linkedIds = new Set(linked.map((row) => row.planWorkoutId));
      return buildWorkoutExport(
        {
          sessions,
          entries: entries.map((row) => row.entry),
          sets: sets.map((row) => row.set),
          exercises: catalog,
          skipped: skipped
            .filter((row) => !linkedIds.has(row.workout.id))
            .map((row) => ({
              ...row.workout,
              planStartDate: row.planStartDate,
            })),
        },
        { timeZone: user.timeZone, range, appVersion: version },
      );
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
