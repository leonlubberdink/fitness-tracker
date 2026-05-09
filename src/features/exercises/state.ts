export const EXERCISE_UNITS = ["kg", "bodyweight"] as const;

export type ExerciseUnit = (typeof EXERCISE_UNITS)[number];

export type CreateExerciseActionState = {
  error: string | null;
  success: string | null;
};

export const initialCreateExerciseActionState: CreateExerciseActionState = {
  error: null,
  success: null,
};
