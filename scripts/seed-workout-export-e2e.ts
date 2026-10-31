import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { makeExportSource } from "../src/test/fixtures/workout-export";

config({ path: ".env", override: false });

async function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" } },
    strict: true,
  });
  if (!values.email)
    throw new Error("An existing E2E user --email is required.");
  const { db, pool } = await import("../src/db/client");
  const schema = await import("../src/db/schema");
  try {
    const [user] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, values.email.trim().toLowerCase()));
    if (!user) throw new Error("E2E user does not exist.");
    const source = makeExportSource(35);
    const ids = new Map<string, string>();
    const remap = (id: string) => {
      if (!ids.has(id)) ids.set(id, randomUUID());
      return ids.get(id)!;
    };
    await db.transaction(async (tx) => {
      const templateId = randomUUID();
      const planId = randomUUID();
      await tx.insert(schema.exercises).values(
        source.exercises.map((exercise) => ({
          ...exercise,
          id: remap(exercise.id),
          userId: user.id,
        })),
      );
      await tx.insert(schema.workoutTemplates).values({
        id: templateId,
        userId: user.id,
        name: "Export E2E template",
      });
      await tx.insert(schema.workoutTemplateExercises).values({
        id: randomUUID(),
        workoutTemplateId: templateId,
        exerciseId: remap(source.exercises[0].id),
        sortOrder: 1,
        setsReps: "3 x 8-12",
        restTime: "90 seconds",
      });
      await tx.insert(schema.plans).values({
        id: planId,
        userId: user.id,
        name: "Export E2E plan",
        goal: "Export regression fixture",
        durationWeeks: 1,
        startDate: "2026-10-26",
      });
      await tx.insert(schema.planWorkouts).values({
        id: randomUUID(),
        planId,
        workoutTemplateId: templateId,
        state: "skipped",
        weekNumber: 1,
        weekday: 3,
        skippedAt: new Date("2026-10-28T17:00:00Z"),
      });
      source.sessions[33].status = "partial";
      source.sessions[33].completedAt = null;
      source.sessions[34].status = "aborted";
      source.sessions[34].completedAt = null;
      await tx.insert(schema.workoutSessions).values(
        source.sessions.map((session) => ({
          ...session,
          id: remap(session.id),
          userId: user.id,
        })),
      );
      await tx.insert(schema.workoutExerciseEntries).values(
        source.entries.map((entry) => ({
          ...entry,
          id: remap(entry.id),
          workoutSessionId: remap(entry.workoutSessionId),
          exerciseId: entry.exerciseId ? remap(entry.exerciseId) : null,
          exerciseIdSnapshot: entry.exerciseIdSnapshot
            ? remap(entry.exerciseIdSnapshot)
            : null,
        })),
      );
      await tx.insert(schema.workoutSets).values(
        source.sets.map((set) => ({
          ...set,
          id: remap(set.id),
          workoutExerciseEntryId: remap(set.workoutExerciseEntryId),
        })),
      );
    });
    console.log("Seeded synthetic export E2E history.");
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Export fixture seed failed.",
  );
  process.exitCode = 1;
});
