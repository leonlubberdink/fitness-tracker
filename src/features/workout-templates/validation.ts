import { z } from "zod";

const uuidField = (message: string) => z.string().trim().uuid(message);

export const templateIdSchema = z.object({
  templateId: uuidField("Invalid workout template."),
});

export const templateNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Template name is required.")
    .max(80, "Template name must be 80 characters or less."),
});

export const createTemplateSchema = templateNameSchema;

export const renameTemplateSchema = templateIdSchema.merge(templateNameSchema);

export const addTemplateExerciseSchema = templateIdSchema.extend({
  exerciseId: uuidField("Choose a valid exercise."),
});

export const templateExerciseMutationSchema = templateIdSchema.extend({
  templateExerciseId: uuidField("Invalid template exercise."),
});

export const moveTemplateExerciseSchema =
  templateExerciseMutationSchema.extend({
    direction: z.enum(["up", "down"], {
      error: "Choose a valid move direction.",
    }),
  });

export const reorderTemplateExercisesSchema = templateIdSchema.extend({
  templateExerciseIds: z
    .array(uuidField("Invalid template exercise."))
    .min(1, "Add at least one exercise before reordering.")
    .refine(
      (templateExerciseIds) =>
        new Set(templateExerciseIds).size === templateExerciseIds.length,
      "Provide a valid exercise order.",
    ),
});

export const startTemplateSchema = templateIdSchema;

export const saveWorkoutAsTemplateSchema = templateNameSchema.extend({
  sessionId: uuidField("Invalid workout session."),
});
