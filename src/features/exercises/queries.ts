import { and, asc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db/client";
import { exercises } from "@/db/schema";

export async function getExercisesForUser(userId: string, searchQuery?: string) {
  const normalizedQuery = searchQuery?.trim();

  return db
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      defaultUnit: exercises.defaultUnit,
      createdAt: exercises.createdAt,
    })
    .from(exercises)
    .where(
      normalizedQuery
        ? and(
            eq(exercises.userId, userId),
            or(
              ilike(exercises.name, `%${normalizedQuery}%`),
              ilike(exercises.category, `%${normalizedQuery}%`),
            ),
          )
        : eq(exercises.userId, userId),
    )
    .orderBy(asc(exercises.name), asc(exercises.createdAt));
}

export async function searchExercisesForUser(
  userId: string,
  searchQuery?: string,
  limit = 12,
) {
  const normalizedQuery = searchQuery?.trim();

  return db
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      defaultUnit: exercises.defaultUnit,
    })
    .from(exercises)
    .where(
      normalizedQuery
        ? and(
            eq(exercises.userId, userId),
            or(
              ilike(exercises.name, `%${normalizedQuery}%`),
              ilike(exercises.category, `%${normalizedQuery}%`),
            ),
          )
        : eq(exercises.userId, userId),
    )
    .orderBy(asc(exercises.name), asc(exercises.createdAt))
    .limit(limit);
}
