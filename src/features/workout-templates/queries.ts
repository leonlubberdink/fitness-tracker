import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import {
  exercises,
  workoutTemplateExercises,
  workoutTemplates,
} from "@/db/schema";
import { searchExercisesForUser } from "@/features/exercises/queries";

type TemplateExerciseRow = {
  id: string;
  workoutTemplateId: string;
  exerciseId: string;
  sortOrder: number;
  exerciseName: string;
  exerciseCategory: string;
  defaultUnit: "kg" | "bodyweight";
};

function groupTemplateExercises(
  templateIds: string[],
  exerciseRows: TemplateExerciseRow[],
) {
  const rowsByTemplateId = new Map<string, TemplateExerciseRow[]>();

  for (const templateId of templateIds) {
    rowsByTemplateId.set(templateId, []);
  }

  for (const row of exerciseRows) {
    rowsByTemplateId.get(row.workoutTemplateId)?.push(row);
  }

  return rowsByTemplateId;
}

export async function getWorkoutTemplatesForUser(userId: string) {
  const templateRows = await db
    .select({
      id: workoutTemplates.id,
      name: workoutTemplates.name,
      createdAt: workoutTemplates.createdAt,
      updatedAt: workoutTemplates.updatedAt,
    })
    .from(workoutTemplates)
    .where(eq(workoutTemplates.userId, userId))
    .orderBy(desc(workoutTemplates.updatedAt), asc(workoutTemplates.name));

  if (templateRows.length === 0) {
    return [];
  }

  const templateIds = templateRows.map((template) => template.id);
  const exerciseRows = await db
    .select({
      id: workoutTemplateExercises.id,
      workoutTemplateId: workoutTemplateExercises.workoutTemplateId,
      exerciseId: workoutTemplateExercises.exerciseId,
      sortOrder: workoutTemplateExercises.sortOrder,
      exerciseName: exercises.name,
      exerciseCategory: exercises.category,
      defaultUnit: exercises.defaultUnit,
    })
    .from(workoutTemplateExercises)
    .innerJoin(
      exercises,
      eq(workoutTemplateExercises.exerciseId, exercises.id),
    )
    .where(inArray(workoutTemplateExercises.workoutTemplateId, templateIds))
    .orderBy(
      asc(workoutTemplateExercises.workoutTemplateId),
      asc(workoutTemplateExercises.sortOrder),
    );

  const exerciseRowsByTemplateId = groupTemplateExercises(
    templateIds,
    exerciseRows,
  );

  return templateRows.map((template) => {
    const templateExercises = exerciseRowsByTemplateId.get(template.id) ?? [];

    return {
      ...template,
      exerciseCount: templateExercises.length,
      exercises: templateExercises,
    };
  });
}

export async function getWorkoutTemplateForEditing(
  userId: string,
  templateId: string,
) {
  const [template] = await db
    .select({
      id: workoutTemplates.id,
      name: workoutTemplates.name,
      createdAt: workoutTemplates.createdAt,
      updatedAt: workoutTemplates.updatedAt,
    })
    .from(workoutTemplates)
    .where(
      and(
        eq(workoutTemplates.id, templateId),
        eq(workoutTemplates.userId, userId),
      ),
    )
    .limit(1);

  if (!template) {
    return null;
  }

  const [templateExercises, exerciseOptions] = await Promise.all([
    db
      .select({
        id: workoutTemplateExercises.id,
        workoutTemplateId: workoutTemplateExercises.workoutTemplateId,
        exerciseId: workoutTemplateExercises.exerciseId,
        sortOrder: workoutTemplateExercises.sortOrder,
        exerciseName: exercises.name,
        exerciseCategory: exercises.category,
        defaultUnit: exercises.defaultUnit,
      })
      .from(workoutTemplateExercises)
      .innerJoin(
        exercises,
        eq(workoutTemplateExercises.exerciseId, exercises.id),
      )
      .where(eq(workoutTemplateExercises.workoutTemplateId, template.id))
      .orderBy(asc(workoutTemplateExercises.sortOrder)),
    searchExercisesForUser(userId),
  ]);

  return {
    ...template,
    exerciseOptions,
    exercises: templateExercises,
  };
}

export async function requireWorkoutTemplateForEditing(
  userId: string,
  templateId: string,
) {
  const template = await getWorkoutTemplateForEditing(userId, templateId);

  if (!template) {
    notFound();
  }

  return template;
}
