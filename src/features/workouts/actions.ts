"use server";

import { randomUUID } from "node:crypto";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  exercises,
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { requireUser } from "@/features/auth/session";

import { getOpenWorkoutSessionForUser } from "./queries";

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeNumber(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

async function requireOpenSession(userId: string, sessionId: string) {
  const [session] = await db
    .select({
      id: workoutSessions.id,
      userId: workoutSessions.userId,
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
    throw new Error("Open workout session not found.");
  }

  return session;
}

async function requireEntryForOpenSession(userId: string, entryId: string) {
  const [entry] = await db
    .select({
      entryId: workoutExerciseEntries.id,
      sessionId: workoutSessions.id,
    })
    .from(workoutExerciseEntries)
    .innerJoin(
      workoutSessions,
      eq(workoutExerciseEntries.workoutSessionId, workoutSessions.id),
    )
    .where(
      and(
        eq(workoutExerciseEntries.id, entryId),
        eq(workoutSessions.userId, userId),
        isNull(workoutSessions.completedAt),
      ),
    )
    .limit(1);

  if (!entry) {
    throw new Error("Workout exercise entry not found.");
  }

  return entry;
}

async function requireSetForOpenSession(userId: string, setId: string) {
  const [setRecord] = await db
    .select({
      setId: workoutSets.id,
      sessionId: workoutSessions.id,
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
        eq(workoutSets.id, setId),
        eq(workoutSessions.userId, userId),
        isNull(workoutSessions.completedAt),
      ),
    )
    .limit(1);

  if (!setRecord) {
    throw new Error("Workout set not found.");
  }

  return setRecord;
}

export async function startWorkoutSessionAction() {
  const user = await requireUser();
  const existingSession = await getOpenWorkoutSessionForUser(user.id);

  if (existingSession) {
    redirect(`/workouts/${existingSession.id}`);
  }

  const [session] = await db
    .insert(workoutSessions)
    .values({
      id: randomUUID(),
      userId: user.id,
      performedOn: getTodayDateString(),
    })
    .returning({
      id: workoutSessions.id,
    });

  revalidatePath("/");
  redirect(`/workouts/${session.id}`);
}

export async function addExerciseEntryAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = parseString(formData, "sessionId");
  const exerciseId = parseString(formData, "exerciseId");

  if (!sessionId || !exerciseId) {
    return;
  }

  await requireOpenSession(user.id, sessionId);

  const [exercise] = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      defaultUnit: exercises.defaultUnit,
    })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, user.id)))
    .limit(1);

  if (!exercise) {
    return;
  }

  const [lastEntry] = await db
    .select({
      sortOrder: workoutExerciseEntries.sortOrder,
    })
    .from(workoutExerciseEntries)
    .where(eq(workoutExerciseEntries.workoutSessionId, sessionId))
    .orderBy(desc(workoutExerciseEntries.sortOrder))
    .limit(1);

  const nextSortOrder = (lastEntry?.sortOrder ?? 0) + 1;
  const entryId = randomUUID();

  await db.insert(workoutExerciseEntries).values({
    id: entryId,
    workoutSessionId: sessionId,
    exerciseId: exercise.id,
    exerciseNameSnapshot: exercise.name,
    exerciseCategorySnapshot: exercise.category,
    unitSnapshot: exercise.defaultUnit,
    sortOrder: nextSortOrder,
  });

  await db.insert(workoutSets).values({
    id: randomUUID(),
    workoutExerciseEntryId: entryId,
    setNumber: 1,
    reps: 8,
    weight: 0,
  });

  revalidatePath(`/workouts/${sessionId}`);
}

export async function addSetAction(formData: FormData) {
  const user = await requireUser();
  const entryId = parseString(formData, "entryId");

  if (!entryId) {
    return;
  }

  const entry = await requireEntryForOpenSession(user.id, entryId);

  const [lastSet] = await db
    .select({
      setNumber: workoutSets.setNumber,
      reps: workoutSets.reps,
      weight: workoutSets.weight,
    })
    .from(workoutSets)
    .where(eq(workoutSets.workoutExerciseEntryId, entryId))
    .orderBy(desc(workoutSets.setNumber))
    .limit(1);

  await db.insert(workoutSets).values({
    id: randomUUID(),
    workoutExerciseEntryId: entryId,
    setNumber: (lastSet?.setNumber ?? 0) + 1,
    reps: lastSet?.reps ?? 8,
    weight: lastSet?.weight ?? 0,
  });

  revalidatePath(`/workouts/${entry.sessionId}`);
}

export async function updateSetAction(formData: FormData) {
  const user = await requireUser();
  const setId = parseString(formData, "setId");
  const reps = parsePositiveInt(parseString(formData, "reps"));
  const weight = parseNonNegativeNumber(parseString(formData, "weight"));

  if (!setId || reps === null || weight === null) {
    return;
  }

  const setRecord = await requireSetForOpenSession(user.id, setId);

  await db
    .update(workoutSets)
    .set({
      reps,
      weight,
    })
    .where(eq(workoutSets.id, setId));

  revalidatePath(`/workouts/${setRecord.sessionId}`);
}
