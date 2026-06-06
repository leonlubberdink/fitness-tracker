"use server";

import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, gt, isNotNull, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  exercises,
  planWorkouts,
  plans,
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { requireUser } from "@/features/auth/session";
import { formatStoredExerciseCategories } from "@/features/exercises/categories";
import { syncPlanCompletionState } from "@/features/plans/core";
import { logInfo } from "@/lib/logger";

import { getOpenWorkoutSessionForUser } from "./queries";
import {
  addExerciseEntrySchema,
  parseLoadRecommendation,
  parseWorkoutSetFields,
  reorderWorkoutEntriesSchema,
  startWorkoutSessionSchema,
  workoutEntrySchema,
  workoutSessionIdSchema,
  workoutSetMutationSchema,
} from "./validation";

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
        isNull(workoutSessions.completedAt),
      ),
    )
    .limit(1);

  return session ?? null;
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
    entries.find((entry) => entry.sortOrder === session?.activeEntrySortOrder) ??
    entries.find((entry) => entry.sortOrder === fallbackSortOrder) ??
    null;

  return {
    currentEntry,
    entries,
  };
}

async function saveNextLoadRecommendationForEntry(
  entryId: string,
  recommendation: string,
) {
  const parsedRecommendation = parseLoadRecommendation(recommendation);

  if (!parsedRecommendation.success) {
    return parsedRecommendation;
  }

  await db
    .update(workoutExerciseEntries)
    .set({
      nextLoadRecommendation: parsedRecommendation.data,
    })
    .where(eq(workoutExerciseEntries.id, entryId));

  return parsedRecommendation;
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
        isNotNull(workoutSessions.completedAt),
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

  const [lastEntry] = await db
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
  const entryId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(workoutExerciseEntries).values({
      id: entryId,
      workoutSessionId: sessionId,
      exerciseId: exercise.id,
      exerciseNameSnapshot: exercise.name,
      exerciseCategorySnapshot: formatStoredExerciseCategories(exercise.category),
      unitSnapshot: exercise.defaultUnit,
      sortOrder: nextSortOrder,
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

  if (!entry) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout exercise entry no longer exists or the session is closed.",
    });
  }

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

  const [lastSet] = await db
    .select({
      setNumber: workoutSets.setNumber,
    })
    .from(workoutSets)
    .where(eq(workoutSets.workoutExerciseEntryId, entryId))
    .orderBy(desc(workoutSets.setNumber))
    .limit(1);

  const setId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(workoutSets).values({
      id: setId,
      workoutExerciseEntryId: entryId,
      setNumber: (lastSet?.setNumber ?? 0) + 1,
      reps,
      weight,
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

export async function addSetAction(formData: FormData) {
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

  if (!entry) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout exercise entry no longer exists or the session is closed.",
    });
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

  if (!lastSet) {
    redirectToWorkoutSession(entry.sessionId, {
      error: "Log the first set before adding another one.",
    });
  }

  await db.insert(workoutSets).values({
    id: randomUUID(),
    workoutExerciseEntryId: entryId,
    setNumber: lastSet.setNumber + 1,
    reps: lastSet.reps,
    weight: lastSet.weight,
  });

  revalidatePath(`/workouts/${entry.sessionId}`);
  redirectToWorkoutSession(entry.sessionId);
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

  if (currentEntry) {
    const [currentSet] = await db
      .select({
        id: workoutSets.id,
      })
      .from(workoutSets)
      .where(eq(workoutSets.workoutExerciseEntryId, currentEntry.id))
      .limit(1);

    if (currentSet) {
      const recommendationResult = await saveNextLoadRecommendationForEntry(
        currentEntry.id,
        getStringValue(formData, "nextLoadRecommendation"),
      );

      if (!recommendationResult.success) {
        redirectToWorkoutSession(sessionId, {
          error: getValidationMessage(recommendationResult.error),
          scrollTo: "current-exercise",
        });
      }
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

  await db
    .update(workoutSessions)
    .set({
      activeEntrySortOrder: nextEntry.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(workoutSessions.id, sessionId));

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

  const fallbackSortOrder = entries.at(-1)?.sortOrder ?? entries[0].sortOrder;
  const activeSortOrder =
    entries.find((entry) => entry.sortOrder === session.activeEntrySortOrder)
      ?.sortOrder ?? fallbackSortOrder;
  const plannedEntries = entries.filter(
    (entry) => entry.sortOrder > activeSortOrder,
  );

  if (plannedEntries.length === 0) {
    redirectToWorkoutSession(sessionId);
  }

  if (plannedEntries.length !== entryIds.length) {
    redirectToWorkoutSession(sessionId, {
      error: "Refresh the page and try reordering again.",
    });
  }

  const plannedEntryIdSet = new Set(plannedEntries.map((entry) => entry.id));

  if (entryIds.some((entryId) => !plannedEntryIdSet.has(entryId))) {
    redirectToWorkoutSession(sessionId, {
      error: "Refresh the page and try reordering again.",
    });
  }

  const firstPlannedSortOrder = plannedEntries[0]?.sortOrder;

  if (firstPlannedSortOrder === undefined) {
    redirectToWorkoutSession(sessionId);
  }

  await db.transaction(async (tx) => {
    for (const entry of plannedEntries) {
      await tx
        .update(workoutExerciseEntries)
        .set({ sortOrder: -entry.sortOrder })
        .where(eq(workoutExerciseEntries.id, entry.id));
    }

    for (const [index, entryId] of entryIds.entries()) {
      await tx
        .update(workoutExerciseEntries)
        .set({ sortOrder: firstPlannedSortOrder + index })
        .where(eq(workoutExerciseEntries.id, entryId));
    }

    await tx
      .update(workoutSessions)
      .set({ updatedAt: new Date() })
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

  if (!setRecord) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout set no longer exists or the session is closed.",
    });
  }

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
    redirectToWorkoutSession(sessionId, {
      error: "Workout session no longer exists or is already completed.",
    });
  }

  const { currentEntry } = await getActiveEntryForSession(sessionId);
  const [entryRows, setRows] = await Promise.all([
    db
      .select({
        id: workoutExerciseEntries.id,
        sortOrder: workoutExerciseEntries.sortOrder,
      })
      .from(workoutExerciseEntries)
      .where(eq(workoutExerciseEntries.workoutSessionId, sessionId))
      .orderBy(asc(workoutExerciseEntries.sortOrder)),
    db
      .select({
        entryId: workoutExerciseEntries.id,
      })
      .from(workoutSets)
      .innerJoin(
        workoutExerciseEntries,
        eq(workoutSets.workoutExerciseEntryId, workoutExerciseEntries.id),
      )
      .where(eq(workoutExerciseEntries.workoutSessionId, sessionId)),
  ]);

  if (setRows.length === 0) {
    redirectToWorkoutSession(sessionId, {
      error: "Log at least one set before finishing this workout.",
    });
  }

  const entryIdsWithSets = new Set(setRows.map((set) => set.entryId));
  const untouchedEntries = entryRows.filter(
    (entry) => !entryIdsWithSets.has(entry.id),
  );
  const remainingEntries = entryRows.filter((entry) =>
    entryIdsWithSets.has(entry.id),
  );

  if (currentEntry && entryIdsWithSets.has(currentEntry.id)) {
    const recommendationResult = await saveNextLoadRecommendationForEntry(
      currentEntry.id,
      getStringValue(formData, "nextLoadRecommendation"),
    );

    if (!recommendationResult.success) {
      redirectToWorkoutSession(sessionId, {
        error: getValidationMessage(recommendationResult.error),
        scrollTo: "current-exercise",
      });
    }
  }

  await db.transaction(async (tx) => {
    for (const entry of untouchedEntries) {
      await tx
        .delete(workoutExerciseEntries)
        .where(eq(workoutExerciseEntries.id, entry.id));
    }

    for (const [index, entry] of remainingEntries.entries()) {
      const nextSortOrder = index + 1;

      if (entry.sortOrder === nextSortOrder) {
        continue;
      }

      await tx
        .update(workoutExerciseEntries)
        .set({ sortOrder: nextSortOrder })
        .where(eq(workoutExerciseEntries.id, entry.id));
    }

    await tx
      .update(workoutSessions)
      .set({
        activeEntrySortOrder: null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, sessionId));

    if (session.planId && session.planWorkoutId) {
      await tx
        .update(planWorkouts)
        .set({
          completedAt: new Date(),
          linkedWorkoutSessionId: sessionId,
          skippedAt: null,
          state: "completed",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(planWorkouts.id, session.planWorkoutId),
            eq(planWorkouts.planId, session.planId),
          ),
        );
    }
  });

  if (session.planId) {
    await syncPlanCompletionState(db, {
      planId: session.planId,
      timeZone: user.timeZone,
    });
  }

  logInfo("workout.session.completed", {
    userId: user.id,
    sessionId,
  });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/plans");
  if (session.planId) {
    revalidatePath(`/plans/${session.planId}`);
  }
  revalidatePath("/statistics");
  revalidatePath(`/workouts/${sessionId}`);
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
          and(eq(plans.userId, user.id), eq(plans.status, "active"), ne(plans.id, linkedPlan.id)),
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

  if (!setRecord) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout set no longer exists or the session is closed.",
    });
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

  if (!entry) {
    redirectToWorkoutSession(sessionId, {
      error: "Workout exercise entry no longer exists or the session is closed.",
    });
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
