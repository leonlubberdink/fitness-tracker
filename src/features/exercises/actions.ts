"use server";

import { randomUUID } from "node:crypto";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  exercises,
  workoutExerciseEntries,
  workoutSessions,
  workoutTemplateExercises,
  workoutTemplates,
} from "@/db/schema";
import { requireUser } from "@/features/auth/session";
import { coerceExerciseUnit } from "@/lib/exercise-units";

import type {
  CreateExerciseActionState,
  UpdateExerciseActionState,
} from "./state";
import {
  formatExerciseCategories,
  normalizeExerciseCategories,
} from "./categories";
import {
  createExerciseSchema,
  deleteExerciseSchema,
  updateExerciseSchema,
} from "./validation";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectToExercises({
  error,
  query,
  success,
}: {
  error?: string;
  query?: string;
  success?: string;
}): never {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.set("q", query);
  }

  if (error) {
    searchParams.set("error", error);
  }

  if (success) {
    searchParams.set("success", success);
  }

  const search = searchParams.toString();
  redirect(search ? `/exercises?${search}` : "/exercises");
}

function getExerciseFormValues(formData: FormData) {
  return {
    name: getStringValue(formData, "name"),
    category: getStringValue(formData, "category"),
    defaultUnit: getStringValue(formData, "defaultUnit") || "kg",
  };
}

function getNormalizedExerciseFormValues(rawValues: {
  name: string;
  category: string;
  defaultUnit: string;
}) {
  const normalizedCategories = normalizeExerciseCategories(rawValues.category);

  return {
    name: rawValues.name.trim(),
    category:
      normalizedCategories.length > 0
        ? formatExerciseCategories(normalizedCategories)
        : rawValues.category.trim(),
    defaultUnit: coerceExerciseUnit(rawValues.defaultUnit),
  };
}

export async function createExerciseAction(
  _previousState: CreateExerciseActionState,
  formData: FormData,
): Promise<CreateExerciseActionState> {
  const user = await requireUser();
  const rawValues = getExerciseFormValues(formData);

  const parsedInput = createExerciseSchema.safeParse(rawValues);

  if (!parsedInput.success) {
    return {
      error: "Check the highlighted fields.",
      success: null,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      values: getNormalizedExerciseFormValues(rawValues),
    };
  }

  const { name, category, defaultUnit } = parsedInput.data;
  const categories = normalizeExerciseCategories(category);
  const formattedCategory = formatExerciseCategories(categories);

  const [existingExercise] = await db
    .select({
      id: exercises.id,
    })
    .from(exercises)
    .where(
      sql`"user_id" = ${user.id} and lower(${exercises.name}) = ${name.toLowerCase()}`,
    )
    .limit(1);

  if (existingExercise) {
    return {
      error: "An exercise with that name already exists.",
      success: null,
      fieldErrors: {},
      values: {
        name,
        category: formattedCategory,
        defaultUnit,
      },
    };
  }

  await db.insert(exercises).values({
    id: randomUUID(),
    userId: user.id,
    name,
    category: formattedCategory,
    defaultUnit,
  });

  revalidatePath("/exercises");

  return {
    error: null,
    success: `Created ${name}.`,
    fieldErrors: {},
    values: {
      name: "",
      category: "",
      defaultUnit: "kg",
    },
  };
}

export async function updateExerciseAction(
  _previousState: UpdateExerciseActionState,
  formData: FormData,
): Promise<UpdateExerciseActionState> {
  const user = await requireUser();
  const rawValues = {
    exerciseId: getStringValue(formData, "exerciseId"),
    ...getExerciseFormValues(formData),
  };
  const parsedInput = updateExerciseSchema.safeParse(rawValues);
  const normalizedValues = getNormalizedExerciseFormValues(rawValues);

  if (!parsedInput.success) {
    return {
      error: "Check the highlighted fields.",
      success: null,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      values: normalizedValues,
    };
  }

  const { exerciseId, name, category, defaultUnit } = parsedInput.data;
  const categories = normalizeExerciseCategories(category);
  const formattedCategory = formatExerciseCategories(categories);

  const [exercise] = await db
    .select({
      id: exercises.id,
    })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, user.id)))
    .limit(1);

  if (!exercise) {
    return {
      error: "Exercise no longer exists in your library.",
      success: null,
      fieldErrors: {},
      values: {
        name,
        category: formattedCategory,
        defaultUnit,
      },
    };
  }

  const [existingExercise] = await db
    .select({
      id: exercises.id,
    })
    .from(exercises)
    .where(
      and(
        eq(exercises.userId, user.id),
        ne(exercises.id, exerciseId),
        sql`lower(${exercises.name}) = ${name.toLowerCase()}`,
      ),
    )
    .limit(1);

  if (existingExercise) {
    return {
      error: "An exercise with that name already exists.",
      success: null,
      fieldErrors: {},
      values: {
        name,
        category: formattedCategory,
        defaultUnit,
      },
    };
  }

  await db
    .update(exercises)
    .set({
      name,
      category: formattedCategory,
      defaultUnit,
    })
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, user.id)));

  revalidatePath("/exercises");
  revalidatePath("/workouts");

  return {
    error: null,
    success: `Updated ${name}.`,
    fieldErrors: {},
    values: {
      name,
      category: formattedCategory,
      defaultUnit,
    },
  };
}

export async function deleteExerciseAction(formData: FormData) {
  const user = await requireUser();
  const query = getStringValue(formData, "q").trim();
  const parsedInput = deleteExerciseSchema.safeParse({
    exerciseId: getStringValue(formData, "exerciseId"),
  });

  if (!parsedInput.success) {
    redirectToExercises({
      query,
      error: "Choose a valid exercise to delete.",
    });
  }

  const { exerciseId } = parsedInput.data;

  const [exercise] = await db
    .select({
      id: exercises.id,
      name: exercises.name,
    })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, user.id)))
    .limit(1);

  if (!exercise) {
    redirectToExercises({
      query,
      error: "Exercise no longer exists in your library.",
    });
  }

  const [openWorkoutReference] = await db
    .select({
      sessionId: workoutSessions.id,
    })
    .from(workoutExerciseEntries)
    .innerJoin(
      workoutSessions,
      eq(workoutExerciseEntries.workoutSessionId, workoutSessions.id),
    )
    .where(
      and(
        eq(workoutExerciseEntries.exerciseId, exercise.id),
        eq(workoutSessions.userId, user.id),
        isNull(workoutSessions.completedAt),
      ),
    )
    .limit(1);

  if (openWorkoutReference) {
    redirectToExercises({
      query,
      error: `Cannot remove ${exercise.name} while it is part of your current workout. Remove it from the workout first.`,
    });
  }

  const [templateReference] = await db
    .select({
      templateId: workoutTemplates.id,
    })
    .from(workoutTemplateExercises)
    .innerJoin(
      workoutTemplates,
      eq(workoutTemplateExercises.workoutTemplateId, workoutTemplates.id),
    )
    .where(
      and(
        eq(workoutTemplateExercises.exerciseId, exercise.id),
        eq(workoutTemplates.userId, user.id),
      ),
    )
    .limit(1);

  if (templateReference) {
    redirectToExercises({
      query,
      error: `Cannot remove ${exercise.name} while it is used in a workout template. Remove it from templates first.`,
    });
  }

  await db
    .delete(exercises)
    .where(and(eq(exercises.id, exercise.id), eq(exercises.userId, user.id)));

  revalidatePath("/exercises");
  revalidatePath("/statistics");

  redirectToExercises({
    query,
    success: `Removed ${exercise.name} from your exercise library.`,
  });
}
