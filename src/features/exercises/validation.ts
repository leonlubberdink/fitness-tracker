import { z } from "zod";

import { EXERCISE_UNITS } from "./state";
import { hasExerciseCategories } from "./categories";

const uuidField = (message: string) => z.string().trim().uuid(message);

export const createExerciseSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  category: z
    .string()
    .trim()
    .refine(hasExerciseCategories, "Add at least one category."),
  defaultUnit: z.enum(EXERCISE_UNITS, {
    error: "Choose a valid default unit.",
  }),
});

export const updateExerciseSchema = createExerciseSchema.extend({
  exerciseId: uuidField("Invalid exercise."),
});

export const deleteExerciseSchema = z.object({
  exerciseId: uuidField("Invalid exercise."),
});
