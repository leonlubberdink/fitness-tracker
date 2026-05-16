import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { exercises } from "@/db/schema";
import {
  formatStoredExerciseCategories,
  parseStoredExerciseCategories,
} from "./categories";

function getExerciseSearchWhereClause(userId: string, searchQuery?: string) {
  const normalizedQuery = searchQuery?.trim();

  if (!normalizedQuery) {
    return eq(exercises.userId, userId);
  }

  const searchPattern = `%${normalizedQuery}%`;

  return and(
    eq(exercises.userId, userId),
    sql`(
      ${exercises.name} ilike ${searchPattern}
      or array_to_string(${exercises.category}, ', ') ilike ${searchPattern}
    )`,
  );
}

export async function getExercisesForUser(userId: string, searchQuery?: string) {
  const rows = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      defaultUnit: exercises.defaultUnit,
      note: exercises.note,
      createdAt: exercises.createdAt,
    })
    .from(exercises)
    .where(getExerciseSearchWhereClause(userId, searchQuery))
    .orderBy(asc(exercises.name), asc(exercises.createdAt));

  return rows.map((row) => ({
    ...row,
    categories: parseStoredExerciseCategories(row.category),
    category: formatStoredExerciseCategories(row.category),
  }));
}

export async function searchExercisesForUser(
  userId: string,
  searchQuery?: string,
  limit = 12,
) {
  const rows = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      defaultUnit: exercises.defaultUnit,
    })
    .from(exercises)
    .where(getExerciseSearchWhereClause(userId, searchQuery))
    .orderBy(asc(exercises.name), asc(exercises.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    categories: parseStoredExerciseCategories(row.category),
    category: formatStoredExerciseCategories(row.category),
  }));
}

export async function getExerciseCategoriesForUser(userId: string) {
  const rows = await db
    .select({
      category: exercises.category,
    })
    .from(exercises)
    .where(eq(exercises.userId, userId))
    .orderBy(asc(exercises.name), asc(exercises.createdAt));

  const uniqueCategories = new Set<string>();

  for (const row of rows) {
    for (const category of parseStoredExerciseCategories(row.category)) {
      uniqueCategories.add(category);
    }
  }

  return Array.from(uniqueCategories).sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}
