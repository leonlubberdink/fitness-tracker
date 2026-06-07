import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import {
  exercises,
  workoutTemplateExercises,
  workoutTemplates,
} from "@/db/schema";
import {
  formatStoredExerciseCategories,
} from "@/features/exercises/categories";
import {
  getExerciseCategoriesForUser,
  getExercisesForUser,
} from "@/features/exercises/queries";
import { hasIncompleteExercisePrescriptions } from "@/features/workout-prescriptions";
import type { ExerciseUnit } from "@/lib/exercise-units";

type TemplateExerciseRow = {
  id: string;
  workoutTemplateId: string;
  exerciseId: string;
  notes: string | null;
  restTime: string | null;
  sortOrder: number;
  setsReps: string | null;
  exerciseName: string;
  exerciseCategory: string;
  defaultUnit: ExerciseUnit;
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
      description: workoutTemplates.description,
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
      notes: workoutTemplateExercises.notes,
      restTime: workoutTemplateExercises.restTime,
      sortOrder: workoutTemplateExercises.sortOrder,
      setsReps: workoutTemplateExercises.setsReps,
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
    exerciseRows.map((row) => ({
      ...row,
      exerciseCategory: formatStoredExerciseCategories(row.exerciseCategory),
    })),
  );

  return templateRows.map((template) => {
    const templateExercises = exerciseRowsByTemplateId.get(template.id) ?? [];
    const isReadyToStart =
      templateExercises.length > 0 &&
      !hasIncompleteExercisePrescriptions(templateExercises);

    return {
      ...template,
      exerciseCount: templateExercises.length,
      exercises: templateExercises,
      isReadyToStart,
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
      description: workoutTemplates.description,
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

  const [templateExercises, exerciseOptions, availableCategories] = await Promise.all([
    db
      .select({
      id: workoutTemplateExercises.id,
      workoutTemplateId: workoutTemplateExercises.workoutTemplateId,
      exerciseId: workoutTemplateExercises.exerciseId,
      notes: workoutTemplateExercises.notes,
      restTime: workoutTemplateExercises.restTime,
      sortOrder: workoutTemplateExercises.sortOrder,
      setsReps: workoutTemplateExercises.setsReps,
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
    getExercisesForUser(userId),
    getExerciseCategoriesForUser(userId),
  ]);

  return {
    ...template,
    availableCategories,
    exerciseOptions,
    isReadyToStart:
      templateExercises.length > 0 &&
      !hasIncompleteExercisePrescriptions(templateExercises),
    exercises: templateExercises.map((exercise) => ({
      ...exercise,
      exerciseCategory: formatStoredExerciseCategories(exercise.exerciseCategory),
    })),
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
