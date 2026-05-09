"use server";

import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { exercises } from "@/db/schema";
import { requireUser } from "@/features/auth/session";

import { EXERCISE_UNITS, type CreateExerciseActionState } from "./state";

function normalizeInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isExerciseUnit(value: string): value is (typeof EXERCISE_UNITS)[number] {
  return EXERCISE_UNITS.includes(value as (typeof EXERCISE_UNITS)[number]);
}

export async function createExerciseAction(
  _previousState: CreateExerciseActionState,
  formData: FormData,
): Promise<CreateExerciseActionState> {
  const user = await requireUser();

  const name = normalizeInput(formData.get("name"));
  const category = normalizeInput(formData.get("category"));
  const defaultUnit = normalizeInput(formData.get("defaultUnit"));

  if (!name || !category || !defaultUnit) {
    return {
      error: "Name, category, and default unit are required.",
      success: null,
    };
  }

  if (!isExerciseUnit(defaultUnit)) {
    return {
      error: "Choose a valid default unit.",
      success: null,
    };
  }

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
  };
}
