import { z } from "zod";

const uuidField = (message: string) => z.string().trim().uuid(message);

const positiveIntegerField = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => /^\d+$/.test(value), message)
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => value > 0, message);

const weekdayField = z
  .string()
  .trim()
  .min(1, "Choose a valid weekday.")
  .refine((value) => /^[1-7]$/.test(value), "Choose a valid weekday.")
  .transform((value) => Number.parseInt(value, 10));

const dateField = z.string().trim().min(1, "Choose a valid start date.");

export const planIdSchema = z.object({
  planId: uuidField("Invalid plan."),
});

export const planWorkoutIdSchema = z.object({
  planWorkoutId: uuidField("Invalid planned workout."),
});

export const createPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Plan name is required.")
    .max(80, "Plan name must be 80 characters or less."),
  goal: z
    .string()
    .trim()
    .min(1, "Goal is required.")
    .max(160, "Goal must be 160 characters or less."),
  durationWeeks: positiveIntegerField("Enter a valid number of weeks.")
    .refine((value) => value <= 52, "Plan length must be 52 weeks or less."),
});

export const updatePlanDetailsSchema = planIdSchema.merge(createPlanSchema);

export const planWorkoutMutationSchema = planIdSchema.merge(planWorkoutIdSchema);

export const upsertPlanWorkoutSchema = planIdSchema.extend({
  weekNumber: positiveIntegerField("Choose a valid week."),
  weekday: weekdayField,
  workoutTemplateId: uuidField("Choose a workout template."),
  existingPlanWorkoutId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) => value === undefined || z.uuid().safeParse(value).success,
      "Invalid planned workout.",
    ),
});

export const startPlanSchema = planIdSchema.extend({
  startDate: dateField,
});

export const updateTimeZoneSchema = z.object({
  timeZone: z.string().trim().min(1, "Time zone is required."),
});
