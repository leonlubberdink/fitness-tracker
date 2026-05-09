import { and, asc, eq, ilike } from "drizzle-orm";

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
            ilike(exercises.name, `%${normalizedQuery}%`),
          )
        : eq(exercises.userId, userId),
    )
    .orderBy(asc(exercises.name), asc(exercises.createdAt));
}
