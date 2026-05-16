import { z } from "zod";

import {
  HEALTH_ACTIVITY_LEVEL_OPTIONS,
  HEALTH_GOAL_MODE_OPTIONS,
  HEALTH_SEX_OPTIONS,
} from "./constants";

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");

const positiveIntegerField = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .refine((value) => /^\d+$/.test(value), "Enter a whole number.")
  .transform((value) => Number.parseInt(value, 10))
  .refine((value) => value > 0, "Enter a number greater than 0.");

const positiveDecimalField = (requiredMessage: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine(
      (value) => Number.isFinite(Number.parseFloat(value)),
      "Enter a valid number.",
    )
    .transform((value) => Math.round(Number.parseFloat(value) * 100) / 100)
    .refine((value) => value > 0, "Enter a number greater than 0.");

function getOptionalTextField(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, `Use ${maxLength} characters or less.`)
    .transform((value) => value || "");
}

const sexEnum = z.enum(
  HEALTH_SEX_OPTIONS.map((option) => option.value) as [
    (typeof HEALTH_SEX_OPTIONS)[number]["value"],
    ...(typeof HEALTH_SEX_OPTIONS)[number]["value"][],
  ],
  {
    error: "Choose a valid sex.",
  },
);

const activityLevelEnum = z.enum(
  HEALTH_ACTIVITY_LEVEL_OPTIONS.map((option) => option.value) as [
    (typeof HEALTH_ACTIVITY_LEVEL_OPTIONS)[number]["value"],
    ...(typeof HEALTH_ACTIVITY_LEVEL_OPTIONS)[number]["value"][],
  ],
  {
    error: "Choose a valid activity level.",
  },
);

const goalModeEnum = z.enum(
  HEALTH_GOAL_MODE_OPTIONS.map((option) => option.value) as [
    (typeof HEALTH_GOAL_MODE_OPTIONS)[number]["value"],
    ...(typeof HEALTH_GOAL_MODE_OPTIONS)[number]["value"][],
  ],
  {
    error: "Choose a valid goal mode.",
  },
);

export function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const normalized = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

  return normalized === value;
}

export const upsertHealthProfileSchema = z
  .object({
    sex: sexEnum,
    birthDate: dateField,
    heightCm: positiveIntegerField,
    activityLevel: z
      .string()
      .trim()
      .transform((value) => value || undefined)
      .refine(
        (value) => value === undefined || activityLevelEnum.safeParse(value).success,
        "Choose a valid activity level.",
      )
      .transform((value) =>
        value === undefined ? undefined : activityLevelEnum.parse(value),
      ),
    dietPreference: getOptionalTextField(160),
    allergies: getOptionalTextField(500),
    injuriesLimitations: getOptionalTextField(1000),
    goalMode: goalModeEnum,
    targetWeightKg: positiveDecimalField("Target weight is required."),
    paceKgPerMonth: z
      .string()
      .trim()
      .transform((value) => value || ""),
  })
  .superRefine((value, context) => {
    if (!isDateKey(value.birthDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDate"],
        message: "Choose a valid birth date.",
      });
    }

    if (value.goalMode === "maintain") {
      return;
    }

    const paceResult = positiveDecimalField(
      "Preferred monthly pace is required.",
    ).safeParse(value.paceKgPerMonth);

    if (!paceResult.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paceKgPerMonth"],
        message:
          paceResult.error.issues[0]?.message ??
          "Preferred monthly pace is required.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    paceKgPerMonth:
      value.goalMode === "maintain"
        ? null
        : positiveDecimalField("Preferred monthly pace is required.").parse(
            value.paceKgPerMonth,
          ),
  }));

export const upsertDailyHealthCheckinSchema = z
  .object({
    recordedOn: dateField,
    weightKg: positiveDecimalField("Weight is required."),
    readinessRating: z
      .string()
      .trim()
      .refine((value) => /^[1-5]$/.test(value), "Choose a readiness rating.")
      .transform((value) => Number.parseInt(value, 10)),
    sorenessPainRating: z
      .string()
      .trim()
      .refine(
        (value) => /^[1-5]$/.test(value),
        "Choose a soreness or pain rating.",
      )
      .transform((value) => Number.parseInt(value, 10)),
    note: getOptionalTextField(1000),
  })
  .superRefine((value, context) => {
    if (!isDateKey(value.recordedOn)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recordedOn"],
        message: "Choose a valid check-in date.",
      });
    }
  });

export const sendHealthCoachMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Enter a message for the Health coach.")
    .max(4000, "Keep the message under 4000 characters."),
});

export const healthCoachProposalMutationSchema = z.object({
  proposalId: z.string().trim().uuid("Invalid coach proposal."),
});
