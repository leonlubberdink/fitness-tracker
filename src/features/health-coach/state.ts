import type {
  HealthActivityLevel,
  HealthGoalMode,
  HealthSex,
} from "./constants";

export type HealthProfileActionValues = {
  sex: HealthSex | "";
  birthDate: string;
  heightCm: string;
  activityLevel: HealthActivityLevel | "";
  dietPreference: string;
  allergies: string;
  injuriesLimitations: string;
  goalMode: HealthGoalMode | "";
  targetWeightKg: string;
  paceKgPerMonth: string;
};

export type HealthProfileActionFieldErrors = {
  sex?: string[];
  birthDate?: string[];
  heightCm?: string[];
  activityLevel?: string[];
  dietPreference?: string[];
  allergies?: string[];
  injuriesLimitations?: string[];
  goalMode?: string[];
  targetWeightKg?: string[];
  paceKgPerMonth?: string[];
};

export type HealthProfileActionState = {
  error: string | null;
  success: string | null;
  fieldErrors: HealthProfileActionFieldErrors;
  values: HealthProfileActionValues;
};

export type DailyHealthCheckinActionValues = {
  recordedOn: string;
  weightKg: string;
  readinessRating: string;
  sorenessPainRating: string;
  note: string;
};

export type DailyHealthCheckinActionFieldErrors = {
  recordedOn?: string[];
  weightKg?: string[];
  readinessRating?: string[];
  sorenessPainRating?: string[];
  note?: string[];
};

export type DailyHealthCheckinActionState = {
  error: string | null;
  success: string | null;
  fieldErrors: DailyHealthCheckinActionFieldErrors;
  values: DailyHealthCheckinActionValues;
};

export function getHealthProfileActionState(
  values: Partial<HealthProfileActionValues> = {},
): HealthProfileActionState {
  return {
    error: null,
    success: null,
    fieldErrors: {},
    values: {
      sex: values.sex ?? "",
      birthDate: values.birthDate ?? "",
      heightCm: values.heightCm ?? "",
      activityLevel: values.activityLevel ?? "",
      dietPreference: values.dietPreference ?? "",
      allergies: values.allergies ?? "",
      injuriesLimitations: values.injuriesLimitations ?? "",
      goalMode: values.goalMode ?? "",
      targetWeightKg: values.targetWeightKg ?? "",
      paceKgPerMonth: values.paceKgPerMonth ?? "",
    },
  };
}

export function getDailyHealthCheckinActionState(
  values: Partial<DailyHealthCheckinActionValues> = {},
): DailyHealthCheckinActionState {
  return {
    error: null,
    success: null,
    fieldErrors: {},
    values: {
      recordedOn: values.recordedOn ?? "",
      weightKg: values.weightKg ?? "",
      readinessRating: values.readinessRating ?? "3",
      sorenessPainRating: values.sorenessPainRating ?? "3",
      note: values.note ?? "",
    },
  };
}
