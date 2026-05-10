export const EXERCISE_UNITS = ["kg", "bodyweight"] as const;

export type ExerciseUnit = (typeof EXERCISE_UNITS)[number];

export type CreateExerciseActionState = {
  error: string | null;
  success: string | null;
  fieldErrors: {
    name?: string[];
    category?: string[];
    defaultUnit?: string[];
  };
  values: {
    name: string;
    category: string;
    defaultUnit: ExerciseUnit;
  };
};

export const initialCreateExerciseActionState: CreateExerciseActionState = {
  error: null,
  success: null,
  fieldErrors: {},
  values: {
    name: "",
    category: "",
    defaultUnit: "kg",
  },
};
