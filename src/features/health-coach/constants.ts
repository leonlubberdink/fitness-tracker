export const HEALTH_SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const HEALTH_ACTIVITY_LEVEL_OPTIONS = [
  { value: "sedentary", label: "Sedentary" },
  { value: "lightly_active", label: "Lightly active" },
  { value: "moderately_active", label: "Moderately active" },
  { value: "very_active", label: "Very active" },
  { value: "extremely_active", label: "Extremely active" },
] as const;

export const HEALTH_GOAL_MODE_OPTIONS = [
  { value: "lose", label: "Lose weight" },
  { value: "maintain", label: "Maintain weight" },
  { value: "gain", label: "Gain weight" },
] as const;

export const HEALTH_RATING_OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
] as const;

export type HealthSex = (typeof HEALTH_SEX_OPTIONS)[number]["value"];
export type HealthActivityLevel =
  (typeof HEALTH_ACTIVITY_LEVEL_OPTIONS)[number]["value"];
export type HealthGoalMode =
  (typeof HEALTH_GOAL_MODE_OPTIONS)[number]["value"];

export const HEALTH_SEX_LABELS = Object.fromEntries(
  HEALTH_SEX_OPTIONS.map((option) => [option.value, option.label]),
) as Record<HealthSex, string>;

export const HEALTH_ACTIVITY_LEVEL_LABELS = Object.fromEntries(
  HEALTH_ACTIVITY_LEVEL_OPTIONS.map((option) => [option.value, option.label]),
) as Record<HealthActivityLevel, string>;

export const HEALTH_GOAL_MODE_LABELS = Object.fromEntries(
  HEALTH_GOAL_MODE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<HealthGoalMode, string>;
