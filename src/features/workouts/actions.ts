"use server";

import {
  closedSessionPredicate,
  recordedWorkSetPredicate,
  openSessionPredicate,
} from "@/features/workouts/predicates";

import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, gt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  exercises,
  planWorkouts,
  plans,
  users,
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { requireUser } from "@/features/auth/session";
import { formatStoredExerciseCategories } from "@/features/exercises/categories";
import { syncPlanCompletionState } from "@/features/plans/core";
import { logInfo } from "@/lib/logger";
import {
  isBodyweightExerciseLoadInvalid,
  parseRequiredBodyweightKg,
} from "./bodyweight";

import { resolveSessionOutcome, type SessionOutcome } from "./completion";
import type { LoadRecommendation } from "./load-recommendations";
import { getOpenWorkoutSessionForUser } from "./queries";
import {
  addExerciseEntrySchema,
  parseLoadRecommendation,
  parseWorkoutSetFields,
  parseSetObservations,
  reorderWorkoutEntriesSchema,
  startWorkoutSessionSchema,
  workoutEntrySchema,
  workoutSessionIdSchema,
  workoutSetMutationSchema,
} from "./validation";
import { getActiveAndPlannedWorkoutEntries } from "./reorder";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStringListValue(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function getValidationMessage(error: { issues?: Array<{ message: string }> }) {
  return error.issues?.[0]?.message ?? "Invalid input.";
}

function getBodyweightSetError(
  sessionBodyweightKg: number | null,
  modifierKg: number,
) {
  if (sessionBodyweightKg === null) {
    return "Record bodyweight before logging this exercise.";
  }

  if (isBodyweightExerciseLoadInvalid(sessionBodyweightKg, modifierKg)) {
    return "Bodyweight load cannot be below zero.";
  }

  return null;
}

function redirectToWorkoutSession(
  sessionId: string,
  {
    error,
    focusSet,
    scrollTo,
    success,
  }: {
    error?: string;
    focusSet?: string;
    scrollTo?: string;
    success?: string;
  } = {},
): never {
  const searchParams = new URLSearchParams();

  if (error) {
    searchParams.set("error", error);
  }

  if (success) {
    searchParams.set("success", success);
  }

  if (scrollTo) {
    searchParams.set("scrollTo", scrollTo);
  }

  if (focusSet) {
    searchParams.set("focusSet", focusSet);
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
      bodyweightKg: workoutSessions.bodyweightKg,
      userId: workoutSessions.userId,
      activeEntrySortOrder: workoutSessions.activeEntrySortOrder,
      planId: workoutSessions.planId,
      planWorkoutId: workoutSessions.planWorkoutId,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.userId, userId),
        openSessionPredicate(),
      ),
    )
    .limit(1);

  return session ?? null;
}

async function lockOpenSessionForMutation(
  tx: Pick<typeof db, "select">,
  userId: string,
  sessionId: string,
) {
  const [session] = await tx
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.userId, userId),
        openSessionPredicate(),
      ),
    )
    .for("update");
  if (!session)
    redirectToWorkoutSession(sessionId, {
      error: "Workout session is already closed.",
    });
}

async function getActiveEntryForSession(sessionId: string) {
  const entries = await db
    .select({
      id: workoutExerciseEntries.id,
      sortOrder: workoutExerciseEntries.sortOrder,
    })
    .from(workoutExerciseEntries)
    .where(eq(workoutExerciseEntries.workoutSessionId, sessionId))
    .orderBy(asc(workoutExerciseEntries.sortOrder));

  if (entries.length === 0) {
    return {
      currentEntry: null,
      entries,
    };
  }

  const [session] = await db
    .select({
      activeEntrySortOrder: workoutSessions.activeEntrySortOrder,
    })
    .from(workoutSessions)
    .where(eq(workoutSessions.id, sessionId))
    .limit(1);

  const fallbackSortOrder = entries.at(-1)?.sortOrder ?? entries[0].sortOrder;
  const currentEntry =
    entries.find(
      (entry) => entry.sortOrder === session?.activeEntrySortOrder,
    ) ??
    entries.find((entry) => entry.sortOrder === fallbackSortOrder) ??
    null;

  return {
    currentEntry,
    entries,
  };
}

async function requireCompletedSession(userId: string, sessionId: string) {
  const [session] = await db
    .select({
      id: workoutSessions.id,
      userId: workoutSessions.userId,
      planId: workoutSessions.planId,
      planWorkoutId: workoutSessions.planWorkoutId,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.userId, userId),
        closedSessionPredicate(),
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
      sessionBodyweightKg: workoutSessions.bodyweightKg,
      unit: workoutExerciseEntries.unitSnapshot,
      sortOrder: workoutExerciseEntries.sortOrder,
      activeEntrySortOrder: workoutSessions.activeEntrySortOrder,
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
        openSessionPredicate(),
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
      sessionBodyweightKg: workoutSessions.bodyweightKg,
      unit: workoutExerciseEntries.unitSnapshot,
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
        openSessionPredicate(),
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

  redirect("/workouts");
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
      redirectToWorkoutSession(sessionId, {
        error: getValidationMessage(parsedInput.error),
      });
    }

    redirect("/");
  }

  const { sessionId, exerciseId } = parsedInput.data;

  const session = await requireOpenSession(user.id, sessionId);

  if (!session) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout session no longer exists or is already completed.",
    });
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
    redirectToWorkoutSession(sessionId, {
      error: "Choose an exercise from your library.",
    });
  }

  const entryId = randomUUID();

  await db.transaction(async (tx) => {
    await lockOpenSessionForMutation(tx, user.id, sessionId);
    const [lastEntry] = await tx
      .select({
        sortOrder: workoutExerciseEntries.sortOrder,
      })
      .from(workoutExerciseEntries)
      .where(eq(workoutExerciseEntries.workoutSessionId, sessionId))
      .orderBy(desc(workoutExerciseEntries.sortOrder))
      .limit(1);

    const nextSortOrder = (lastEntry?.sortOrder ?? 0) + 1;
    const nextActiveSortOrder =
      session.activeEntrySortOrder ?? lastEntry?.sortOrder ?? nextSortOrder;
    await tx.insert(workoutExerciseEntries).values({
      id: entryId,
      workoutSessionId: sessionId,
      exerciseId: exercise.id,
      exerciseIdSnapshot: exercise.id,
      exerciseNameSnapshot: exercise.name,
      exerciseCategorySnapshot: formatStoredExerciseCategories(
        exercise.category,
      ),
      notesSnapshot: null,
      restTimeSnapshot: null,
      unitSnapshot: exercise.defaultUnit,
      sortOrder: nextSortOrder,
      setsRepsSnapshot: null,
    });

    await tx
      .update(workoutSessions)
      .set({
        activeEntrySortOrder: nextActiveSortOrder,
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, sessionId));
  });

  revalidatePath(`/workouts/${sessionId}`);
  redirectToWorkoutSession(sessionId);
}

export async function updateWorkoutSessionBodyweightAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = workoutSessionIdSchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
  });

  if (!parsedInput.success) {
    const sessionId = getStringValue(formData, "sessionId");

    if (sessionId) {
      redirectToWorkoutSession(sessionId, {
        error: getValidationMessage(parsedInput.error),
      });
    }

    redirect("/");
  }

  const { sessionId } = parsedInput.data;
  const session = await requireOpenSession(user.id, sessionId);

  if (!session) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout session no longer exists or is already completed.",
    });
  }

  const bodyweightInput = parseRequiredBodyweightKg(
    getStringValue(formData, "bodyweightKg"),
  );

  if (!bodyweightInput.success) {
    redirectToWorkoutSession(sessionId, {
      error: getValidationMessage(bodyweightInput.error),
    });
  }

  await db.transaction(async (tx) => {
    await lockOpenSessionForMutation(tx, user.id, sessionId);
    await tx
      .update(workoutSessions)
      .set({
        bodyweightKg: bodyweightInput.data,
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, sessionId));

    await tx
      .update(users)
      .set({
        currentBodyweightKg: bodyweightInput.data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  });

  revalidatePath(`/workouts/${sessionId}`);
  redirectToWorkoutSession(sessionId, {
    success: "Bodyweight saved.",
  });
}

export async function createSetAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = workoutEntrySchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
    entryId: getStringValue(formData, "entryId"),
  });

  if (!parsedInput.success) {
    const sessionId = getStringValue(formData, "sessionId");

    if (sessionId) {
      redirectToWorkoutSession(sessionId, {
        error: getValidationMessage(parsedInput.error),
      });
    }

    redirect("/");
  }

  const { sessionId, entryId } = parsedInput.data;
  const entry = await requireEntryForOpenSession(user.id, entryId);

  if (!entry || entry.sessionId !== sessionId) {
    redirectToWorkoutSession(sessionId, {
      error:
        "Workout exercise entry no longer exists or the session is closed.",
    });
  }

  const observations = parseSetObservations(formData);
  if (!observations.success)
    redirectToWorkoutSession(sessionId, {
      error: getValidationMessage(observations.error),
    });
  if (observations.data.setType === null)
    redirectToWorkoutSession(sessionId, {
      error: "Choose a set type.",
    });

  const metricInput = parseWorkoutSetFields(entry.unit, {
    reps: getStringValue(formData, "reps"),
    weight: getStringValue(formData, "weight"),
  });

  if (!metricInput.success) {
    redirectToWorkoutSession(sessionId, {
      error: getValidationMessage(metricInput.error),
    });
  }

  const { reps, weight } = metricInput.data;

  const bodyweightError =
    entry.unit === "bodyweight" && weight !== null
      ? getBodyweightSetError(entry.sessionBodyweightKg, weight)
      : null;

  if (bodyweightError) {
    redirectToWorkoutSession(sessionId, {
      error: bodyweightError,
      scrollTo: "current-exercise",
    });
  }

  const setId = randomUUID();

  await db.transaction(async (tx) => {
    await lockOpenSessionForMutation(tx, user.id, sessionId);
    const [lastSet] = await tx
      .select({
        setNumber: workoutSets.setNumber,
      })
      .from(workoutSets)
      .where(eq(workoutSets.workoutExerciseEntryId, entryId))
      .orderBy(desc(workoutSets.setNumber))
      .limit(1);

    await tx.insert(workoutSets).values({
      id: setId,
      workoutExerciseEntryId: entryId,
      setNumber: (lastSet?.setNumber ?? 0) + 1,
      reps,
      weight,
      ...observations.data,
    });

    await tx
      .update(workoutSessions)
      .set({
        activeEntrySortOrder: entry.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, entry.sessionId));
  });

  revalidatePath(`/workouts/${entry.sessionId}`);
  redirectToWorkoutSession(entry.sessionId, {
    scrollTo: "current-exercise",
    focusSet: setId,
  });
}

export async function advanceWorkoutExerciseAction(formData: FormData) {
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
    redirectToWorkoutSession(sessionId, {
      error: "Workout session no longer exists or is already completed.",
    });
  }

  const { currentEntry, entries } = await getActiveEntryForSession(sessionId);

  if (entries.length === 0) {
    redirectToWorkoutSession(sessionId, {
      error: "Add an exercise before moving through this workout.",
    });
  }

  const activeSortOrder =
    currentEntry?.sortOrder ??
    entries.at(-1)?.sortOrder ??
    entries[0].sortOrder;

  let recommendationToSave: LoadRecommendation | null = null;
  if (currentEntry) {
    const [currentSet] = await db
      .select({
        id: workoutSets.id,
      })
      .from(workoutSets)
      .where(
        and(
          eq(workoutSets.workoutExerciseEntryId, currentEntry.id),
          recordedWorkSetPredicate(),
        ),
      )
      .limit(1);

    if (currentSet) {
      const recommendationResult = parseLoadRecommendation(
        getStringValue(formData, "nextLoadRecommendation"),
      );

      if (!recommendationResult.success) {
        redirectToWorkoutSession(sessionId, {
          error: getValidationMessage(recommendationResult.error),
          scrollTo: "current-exercise",
        });
      }
      recommendationToSave = recommendationResult.data;
    }
  }

  const [nextEntry] = await db
    .select({
      sortOrder: workoutExerciseEntries.sortOrder,
    })
    .from(workoutExerciseEntries)
    .where(
      and(
        eq(workoutExerciseEntries.workoutSessionId, sessionId),
        gt(workoutExerciseEntries.sortOrder, activeSortOrder),
      ),
    )
    .orderBy(asc(workoutExerciseEntries.sortOrder))
    .limit(1);

  if (!nextEntry) {
    redirectToWorkoutSession(sessionId);
  }

  await db.transaction(async (tx) => {
    await lockOpenSessionForMutation(tx, user.id, sessionId);
    if (currentEntry && recommendationToSave) {
      await tx
        .update(workoutExerciseEntries)
        .set({ nextLoadRecommendation: recommendationToSave })
        .where(eq(workoutExerciseEntries.id, currentEntry.id));
    }
    await tx
      .update(workoutSessions)
      .set({
        activeEntrySortOrder: nextEntry.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, sessionId));
  });
  revalidatePath(`/workouts/${sessionId}`);
  redirectToWorkoutSession(sessionId, {
    scrollTo: "current-exercise",
  });
}

export async function reorderWorkoutEntriesAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = reorderWorkoutEntriesSchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
    entryIds: getStringListValue(formData, "entryId"),
  });

  if (!parsedInput.success) {
    const sessionId = getStringValue(formData, "sessionId");

    if (sessionId) {
      redirectToWorkoutSession(sessionId, {
        error: getValidationMessage(parsedInput.error),
      });
    }

    redirect("/");
  }

  const { sessionId, entryIds } = parsedInput.data;
  const session = await requireOpenSession(user.id, sessionId);

  if (!session) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout session no longer exists or is already completed.",
    });
  }

  const entries = await db
    .select({
      id: workoutExerciseEntries.id,
      sortOrder: workoutExerciseEntries.sortOrder,
    })
    .from(workoutExerciseEntries)
    .where(eq(workoutExerciseEntries.workoutSessionId, sessionId))
    .orderBy(asc(workoutExerciseEntries.sortOrder));

  if (entries.length === 0) {
    redirectToWorkoutSession(sessionId, {
      error: "Add an exercise before reordering this workout.",
    });
  }

  const activeAndPlannedEntries = getActiveAndPlannedWorkoutEntries(
    entries,
    session.activeEntrySortOrder,
  );

  if (activeAndPlannedEntries.length === 0) {
    redirectToWorkoutSession(sessionId);
  }

  if (activeAndPlannedEntries.length !== entryIds.length) {
    redirectToWorkoutSession(sessionId, {
      error: "Refresh the page and try reordering again.",
    });
  }

  const activeAndPlannedEntryIdSet = new Set(
    activeAndPlannedEntries.map((entry) => entry.id),
  );

  if (entryIds.some((entryId) => !activeAndPlannedEntryIdSet.has(entryId))) {
    redirectToWorkoutSession(sessionId, {
      error: "Refresh the page and try reordering again.",
    });
  }

  const firstActiveAndPlannedSortOrder = activeAndPlannedEntries[0]?.sortOrder;

  if (firstActiveAndPlannedSortOrder === undefined) {
    redirectToWorkoutSession(sessionId);
  }

  await db.transaction(async (tx) => {
    await lockOpenSessionForMutation(tx, user.id, sessionId);
    for (const entry of activeAndPlannedEntries) {
      await tx
        .update(workoutExerciseEntries)
        .set({ sortOrder: -entry.sortOrder })
        .where(eq(workoutExerciseEntries.id, entry.id));
    }

    for (const [index, entryId] of entryIds.entries()) {
      await tx
        .update(workoutExerciseEntries)
        .set({ sortOrder: firstActiveAndPlannedSortOrder + index })
        .where(eq(workoutExerciseEntries.id, entryId));
    }

    await tx
      .update(workoutSessions)
      .set({
        activeEntrySortOrder: firstActiveAndPlannedSortOrder,
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, sessionId));
  });

  revalidatePath(`/workouts/${sessionId}`);
  redirectToWorkoutSession(sessionId);
}

export async function updateSetAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = workoutSetMutationSchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
    setId: getStringValue(formData, "setId"),
  });

  if (!parsedInput.success) {
    const sessionId = getStringValue(formData, "sessionId");

    if (sessionId) {
      redirectToWorkoutSession(sessionId, {
        error: getValidationMessage(parsedInput.error),
      });
    }

    redirect("/");
  }

  const { sessionId, setId } = parsedInput.data;
  const setRecord = await requireSetForOpenSession(user.id, setId);

  if (!setRecord || setRecord.sessionId !== sessionId) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout set no longer exists or the session is closed.",
    });
  }

  const observations = parseSetObservations(formData);
  if (!observations.success)
    redirectToWorkoutSession(sessionId, {
      error: getValidationMessage(observations.error),
    });

  const metricInput = parseWorkoutSetFields(setRecord.unit, {
    reps: getStringValue(formData, "reps"),
    weight: getStringValue(formData, "weight"),
  });

  if (!metricInput.success) {
    redirectToWorkoutSession(sessionId, {
      error: getValidationMessage(metricInput.error),
    });
  }

  const { reps, weight } = metricInput.data;

  const bodyweightError =
    setRecord.unit === "bodyweight" && weight !== null
      ? getBodyweightSetError(setRecord.sessionBodyweightKg, weight)
      : null;

  if (bodyweightError) {
    redirectToWorkoutSession(sessionId, {
      error: bodyweightError,
      scrollTo: "current-exercise",
    });
  }

  await db.transaction(async (tx) => {
    await lockOpenSessionForMutation(tx, user.id, sessionId);
    await tx
      .update(workoutSets)
      .set({
        reps,
        weight,
        ...observations.data,
      })
      .where(eq(workoutSets.id, setId));

    await tx
      .update(workoutSessions)
      .set({ updatedAt: new Date() })
      .where(eq(workoutSessions.id, setRecord.sessionId));
  });
  revalidatePath(`/workouts/${setRecord.sessionId}`);
  redirectToWorkoutSession(setRecord.sessionId);
}

export async function completeWorkoutSessionAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = workoutSessionIdSchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
  });
  if (!parsedInput.success) redirect("/");
  const { sessionId } = parsedInput.data;
  const requested = getStringValue(formData, "outcome") || "completed";
  if (!["completed", "partial", "aborted", "skipped"].includes(requested))
    redirectToWorkoutSession(sessionId, {
      error: "Choose a valid workout outcome.",
    });
  const session = await requireOpenSession(user.id, sessionId);
  if (!session)
    redirectToWorkoutSession(sessionId, {
      error: "Workout session is already closed.",
    });
  const { currentEntry } = await getActiveEntryForSession(sessionId);
  const recommendation = getStringValue(formData, "nextLoadRecommendation");
  if (recommendation && !parseLoadRecommendation(recommendation).success)
    redirectToWorkoutSession(sessionId, {
      error: "Choose a valid next-time recommendation.",
    });

  const outcome = await db.transaction(async (tx) => {
    const [lockedSession] = await tx
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.id, sessionId),
          eq(workoutSessions.userId, user.id),
          openSessionPredicate(),
        ),
      )
      .for("update");
    if (!lockedSession) return { error: "Workout session is already closed." };
    const entries = await tx
      .select()
      .from(workoutExerciseEntries)
      .where(eq(workoutExerciseEntries.workoutSessionId, sessionId));
    const setRows = await tx
      .select({ set: workoutSets })
      .from(workoutSets)
      .innerJoin(
        workoutExerciseEntries,
        eq(workoutSets.workoutExerciseEntryId, workoutExerciseEntries.id),
      )
      .where(eq(workoutExerciseEntries.workoutSessionId, sessionId));
    const completionEntries = entries.map((entry) => ({
      id: entry.id,
      sets: setRows
        .filter((row) => row.set.workoutExerciseEntryId === entry.id)
        .map((row) => row.set),
    }));
    let status: SessionOutcome;
    try {
      status = resolveSessionOutcome(
        requested as SessionOutcome,
        completionEntries,
      );
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Unable to finish this workout.",
      };
    }
    const now = new Date();
    for (const entry of completionEntries) {
      if (!entry.sets.some((set) => set.reps !== null && set.weight !== null)) {
        await tx
          .update(workoutExerciseEntries)
          .set({ status: "skipped" })
          .where(eq(workoutExerciseEntries.id, entry.id));
      }
    }
    if (currentEntry && recommendation) {
      await tx
        .update(workoutExerciseEntries)
        .set({
          nextLoadRecommendation: parseLoadRecommendation(recommendation).data,
        })
        .where(eq(workoutExerciseEntries.id, currentEntry.id));
    }
    await tx
      .update(workoutSessions)
      .set({
        activeEntrySortOrder: null,
        status,
        endedAt: now,
        completedAt: status === "completed" ? now : null,
        updatedAt: now,
      })
      .where(eq(workoutSessions.id, sessionId));
    if (session.planId && session.planWorkoutId) {
      await tx
        .update(planWorkouts)
        .set({
          state: status,
          completedAt: status === "completed" ? now : null,
          skippedAt: status === "skipped" ? now : null,
          linkedWorkoutSessionId: sessionId,
          updatedAt: now,
        })
        .where(
          and(
            eq(planWorkouts.id, session.planWorkoutId),
            eq(planWorkouts.planId, session.planId),
          ),
        );
    }
    return { status };
  });
  if (outcome.error)
    redirectToWorkoutSession(sessionId, { error: outcome.error });
  if (session.planId)
    await syncPlanCompletionState(db, {
      planId: session.planId,
      timeZone: user.timeZone,
    });
  logInfo("workout.session.ended", {
    userId: user.id,
    sessionId,
    status: outcome.status,
  });
  for (const path of [
    "/",
    "/history",
    "/plans",
    "/statistics",
    `/workouts/${sessionId}`,
  ])
    revalidatePath(path);
  if (session.planId) revalidatePath(`/plans/${session.planId}`);
  redirect("/history");
}

export async function deleteCompletedWorkoutSessionAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = workoutSessionIdSchema.safeParse({
    sessionId: getStringValue(formData, "sessionId"),
  });

  if (!parsedInput.success) {
    redirect("/history");
  }

  const { sessionId } = parsedInput.data;
  const session = await requireCompletedSession(user.id, sessionId);

  if (!session) {
    redirect("/history");
  }

  let linkedPlanId: string | null = null;

  if (session.planId && session.planWorkoutId) {
    const [linkedPlan] = await db
      .select({
        id: plans.id,
        status: plans.status,
      })
      .from(plans)
      .where(eq(plans.id, session.planId))
      .limit(1);

    if (linkedPlan?.status === "completed") {
      const [otherActivePlan] = await db
        .select({
          id: plans.id,
        })
        .from(plans)
        .where(
          and(
            eq(plans.userId, user.id),
            eq(plans.status, "active"),
            ne(plans.id, linkedPlan.id),
          ),
        )
        .limit(1);

      if (otherActivePlan) {
        redirect(
          `/history?error=${encodeURIComponent("Finish or archive your current active plan before deleting this linked workout.")}`,
        );
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(planWorkouts)
        .set({
          completedAt: null,
          linkedWorkoutSessionId: null,
          state: "planned",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(planWorkouts.id, session.planWorkoutId as string),
            eq(planWorkouts.planId, session.planId as string),
          ),
        );

      if (linkedPlan?.status === "completed") {
        await tx
          .update(plans)
          .set({
            completedAt: null,
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(plans.id, linkedPlan.id));
      }

      await tx.delete(workoutSessions).where(eq(workoutSessions.id, sessionId));
    });

    linkedPlanId = session.planId;
  } else {
    await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId));
  }

  logInfo("workout.session.deleted", {
    userId: user.id,
    sessionId,
    source: "history",
  });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/plans");
  if (linkedPlanId) {
    revalidatePath(`/plans/${linkedPlanId}`);
  }
  revalidatePath("/statistics");
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
      redirectToWorkoutSession(sessionId, {
        error: getValidationMessage(parsedInput.error),
      });
    }

    redirect("/");
  }

  const { sessionId, setId } = parsedInput.data;
  const setRecord = await requireSetForOpenSession(user.id, setId);

  if (!setRecord || setRecord.sessionId !== sessionId) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout set no longer exists or the session is closed.",
    });
  }

  await db.transaction(async (tx) => {
    await lockOpenSessionForMutation(tx, user.id, sessionId);
    const entrySets = await tx
      .select({
        id: workoutSets.id,
        setNumber: workoutSets.setNumber,
      })
      .from(workoutSets)
      .where(eq(workoutSets.workoutExerciseEntryId, setRecord.entryId))
      .orderBy(workoutSets.setNumber);

    if (entrySets.length <= 1) {
      redirectToWorkoutSession(setRecord.sessionId, {
        error: "An exercise entry must keep at least one set.",
      });
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

  await db
    .update(workoutSessions)
    .set({ updatedAt: new Date() })
    .where(eq(workoutSessions.id, setRecord.sessionId));
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
      redirectToWorkoutSession(sessionId, {
        error: getValidationMessage(parsedInput.error),
      });
    }

    redirect("/");
  }

  const { sessionId, entryId } = parsedInput.data;
  const entry = await requireEntryForOpenSession(user.id, entryId);

  if (!entry || entry.sessionId !== sessionId) {
    redirectToWorkoutSession(sessionId, {
      error:
        "Workout exercise entry no longer exists or the session is closed.",
    });
  }

  await db.transaction(async (tx) => {
    await lockOpenSessionForMutation(tx, user.id, sessionId);
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
    const currentActiveSortOrder =
      entry.activeEntrySortOrder ?? sessionEntries.at(-1)?.sortOrder ?? null;
    const nextActiveSortOrder =
      remainingEntries.length === 0 || currentActiveSortOrder === null
        ? null
        : currentActiveSortOrder === entry.sortOrder
          ? Math.min(entry.sortOrder, remainingEntries.length)
          : currentActiveSortOrder > entry.sortOrder
            ? Math.max(1, currentActiveSortOrder - 1)
            : currentActiveSortOrder;

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

    await tx
      .update(workoutSessions)
      .set({
        activeEntrySortOrder: nextActiveSortOrder,
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, entry.sessionId));
  });

  revalidatePath(`/workouts/${entry.sessionId}`);
  redirectToWorkoutSession(entry.sessionId);
}
