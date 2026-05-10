"use server";

import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { exercises } from "@/db/schema";
import { requireUser } from "@/features/auth/session";

import type { CreateExerciseActionState } from "./state";
import { createExerciseSchema } from "./validation";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createExerciseAction(
  _previousState: CreateExerciseActionState,
  formData: FormData,
): Promise<CreateExerciseActionState> {
  const user = await requireUser();

  const rawValues = {
    name: getStringValue(formData, "name"),
    category: getStringValue(formData, "category"),
    defaultUnit: getStringValue(formData, "defaultUnit") || "kg",
  };

  const parsedInput = createExerciseSchema.safeParse(rawValues);

  if (!parsedInput.success) {
    return {
      error: "Check the highlighted fields.",
      success: null,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      values: {
        name: rawValues.name.trim(),
        category: rawValues.category.trim(),
        defaultUnit:
          rawValues.defaultUnit === "bodyweight" ? "bodyweight" : "kg",
      },
    };
  }

  const { name, category, defaultUnit } = parsedInput.data;

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
        category,
        defaultUnit,
      },
    };
  }

  await db.insert(exercises).values({
    id: randomUUID(),
    userId: user.id,
    name,
    category,
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
