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
import {
  addExerciseEntrySchema,
  startWorkoutSessionSchema,
  updateWorkoutSetSchema,
  workoutEntrySchema,
  workoutSessionIdSchema,
  workoutSetMutationSchema,
} from "./validation";

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getValidationMessage(error: { issues?: Array<{ message: string }> }) {
  return error.issues?.[0]?.message ?? "Invalid input.";
}

function redirectToWorkoutSession(sessionId: string, error?: string) {
  const searchParams = new URLSearchParams();

  if (error) {
    searchParams.set("error", error);
  }

  const queryString = searchParams.toString();
  redirect(
    queryString
      ? `/workouts/${sessionId}?${queryString}`
      : `/workouts/${sessionId}`,
  );
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

  return session ?? null;
}

async function requireEntryForOpenSession(userId: string, entryId: string) {
  const [entry] = await db
    .select({
      entryId: workoutExerciseEntries.id,
      sessionId: workoutSessions.id,
      sortOrder: workoutExerciseEntries.sortOrder,
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

  return entry ?? null;
}

async function requireSetForOpenSession(userId: string, setId: string) {
  const [setRecord] = await db
    .select({
      setId: workoutSets.id,
      entryId: workoutExerciseEntries.id,
      sessionId: workoutSessions.id,
      setNumber: workoutSets.setNumber,
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

  return setRecord ?? null;
}

export async function startWorkoutSessionAction() {
  startWorkoutSessionSchema.parse({});
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
  const parsedInput = addExerciseEntrySchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
    exerciseId: getStringValue(formData, "exerciseId"),
  });

  if (!parsedInput.success) {
    const sessionId = getStringValue(formData, "sessionId");

    if (sessionId) {
      redirectToWorkoutSession(sessionId, getValidationMessage(parsedInput.error));
    }

    redirect("/");
  }

  const { sessionId, exerciseId } = parsedInput.data;

  const session = await requireOpenSession(user.id, sessionId);

  if (!session) {
    redirectToWorkoutSession(
      sessionId,
      "Workout session no longer exists or is already completed.",
    );
  }

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
    redirectToWorkoutSession(sessionId, "Choose an exercise from your library.");
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
  redirectToWorkoutSession(sessionId);
}

export async function addSetAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = workoutEntrySchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
    entryId: getStringValue(formData, "entryId"),
  });

  if (!parsedInput.success) {
    const sessionId = getStringValue(formData, "sessionId");

    if (sessionId) {
      redirectToWorkoutSession(sessionId, getValidationMessage(parsedInput.error));
    }

    redirect("/");
  }

  const { sessionId, entryId } = parsedInput.data;
  const entry = await requireEntryForOpenSession(user.id, entryId);

  if (!entry) {
    redirectToWorkoutSession(
      sessionId,
      "Workout exercise entry no longer exists or the session is closed.",
    );
  }

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
  redirectToWorkoutSession(entry.sessionId);
}

export async function updateSetAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = updateWorkoutSetSchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
    setId: getStringValue(formData, "setId"),
    reps: getStringValue(formData, "reps"),
    weight: getStringValue(formData, "weight"),
  });

  if (!parsedInput.success) {
    const sessionId = getStringValue(formData, "sessionId");

    if (sessionId) {
      redirectToWorkoutSession(sessionId, getValidationMessage(parsedInput.error));
    }

    redirect("/");
  }

  const { sessionId, setId, reps, weight } = parsedInput.data;
  const setRecord = await requireSetForOpenSession(user.id, setId);

  if (!setRecord) {
    redirectToWorkoutSession(
      sessionId,
      "Workout set no longer exists or the session is closed.",
    );
  }

  await db
    .update(workoutSets)
    .set({
      reps,
      weight,
    })
    .where(eq(workoutSets.id, setId));

  revalidatePath(`/workouts/${setRecord.sessionId}`);
  redirectToWorkoutSession(setRecord.sessionId);
}

export async function completeWorkoutSessionAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = workoutSessionIdSchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
  });

  if (!parsedInput.success) {
    redirect("/");
  }

  const { sessionId } = parsedInput.data;
  const session = await requireOpenSession(user.id, sessionId);

  if (!session) {
    redirectToWorkoutSession(
      sessionId,
      "Workout session no longer exists or is already completed.",
    );
  }

  await db
    .update(workoutSessions)
    .set({
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workoutSessions.id, sessionId));

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath(`/workouts/${sessionId}`);
  redirect("/history");
}

export async function removeSetAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = workoutSetMutationSchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
    setId: getStringValue(formData, "setId"),
  });

  if (!parsedInput.success) {
    const sessionId = getStringValue(formData, "sessionId");

    if (sessionId) {
      redirectToWorkoutSession(sessionId, getValidationMessage(parsedInput.error));
    }

    redirect("/");
  }

  const { sessionId, setId } = parsedInput.data;
  const setRecord = await requireSetForOpenSession(user.id, setId);

  if (!setRecord) {
    redirectToWorkoutSession(
      sessionId,
      "Workout set no longer exists or the session is closed.",
    );
  }

  await db.transaction(async (tx) => {
    const entrySets = await tx
      .select({
        id: workoutSets.id,
        setNumber: workoutSets.setNumber,
      })
      .from(workoutSets)
      .where(eq(workoutSets.workoutExerciseEntryId, setRecord.entryId))
      .orderBy(workoutSets.setNumber);

    if (entrySets.length <= 1) {
      redirectToWorkoutSession(
        setRecord.sessionId,
        "An exercise entry must keep at least one set.",
      );
    }

    await tx.delete(workoutSets).where(eq(workoutSets.id, setId));

    const remainingSets = entrySets.filter((set) => set.id !== setId);

    for (const [index, set] of remainingSets.entries()) {
      const nextSetNumber = index + 1;

      if (set.setNumber === nextSetNumber) {
        continue;
      }

      await tx
        .update(workoutSets)
        .set({
          setNumber: nextSetNumber,
        })
        .where(eq(workoutSets.id, set.id));
    }
  });

  revalidatePath(`/workouts/${setRecord.sessionId}`);
  redirectToWorkoutSession(setRecord.sessionId);
}

export async function removeExerciseEntryAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = workoutEntrySchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
    entryId: getStringValue(formData, "entryId"),
  });

  if (!parsedInput.success) {
    const sessionId = getStringValue(formData, "sessionId");

    if (sessionId) {
      redirectToWorkoutSession(sessionId, getValidationMessage(parsedInput.error));
    }

    redirect("/");
  }

  const { sessionId, entryId } = parsedInput.data;
  const entry = await requireEntryForOpenSession(user.id, entryId);

  if (!entry) {
    redirectToWorkoutSession(
      sessionId,
      "Workout exercise entry no longer exists or the session is closed.",
    );
  }

  await db.transaction(async (tx) => {
    const sessionEntries = await tx
      .select({
        id: workoutExerciseEntries.id,
        sortOrder: workoutExerciseEntries.sortOrder,
      })
      .from(workoutExerciseEntries)
      .where(eq(workoutExerciseEntries.workoutSessionId, entry.sessionId))
      .orderBy(workoutExerciseEntries.sortOrder);

    await tx
      .delete(workoutExerciseEntries)
      .where(eq(workoutExerciseEntries.id, entryId));

    const remainingEntries = sessionEntries.filter(
      (sessionEntry) => sessionEntry.id !== entryId,
    );

    for (const [index, sessionEntry] of remainingEntries.entries()) {
      const nextSortOrder = index + 1;

      if (sessionEntry.sortOrder === nextSortOrder) {
        continue;
      }

      await tx
        .update(workoutExerciseEntries)
        .set({
          sortOrder: nextSortOrder,
        })
        .where(eq(workoutExerciseEntries.id, sessionEntry.id));
    }
  });

  revalidatePath(`/workouts/${entry.sessionId}`);
  redirectToWorkoutSession(entry.sessionId);
}
