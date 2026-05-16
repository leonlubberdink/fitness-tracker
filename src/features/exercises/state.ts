import { EXERCISE_UNITS, type ExerciseUnit } from "@/lib/exercise-units";

export { EXERCISE_UNITS };

export type ExerciseActionValues = {
  name: string;
  category: string;
  defaultUnit: ExerciseUnit;
  note: string;
};

export type ExerciseActionFieldErrors = {
  exerciseId?: string[];
  name?: string[];
  category?: string[];
  defaultUnit?: string[];
  note?: string[];
};

export type ExerciseEditorActionState = {
  error: string | null;
  success: string | null;
  fieldErrors: ExerciseActionFieldErrors;
  values: ExerciseActionValues;
};

export type CreateExerciseActionState = ExerciseEditorActionState;
export type UpdateExerciseActionState = ExerciseEditorActionState;

export function getExerciseActionState(
  values: Partial<ExerciseActionValues> = {},
): ExerciseEditorActionState {
  return {
    error: null,
    success: null,
    fieldErrors: {},
    values: {
      name: values.name ?? "",
      category: values.category ?? "",
      defaultUnit: values.defaultUnit ?? "kg",
      note: values.note ?? "",
    },
  };
}

export const initialCreateExerciseActionState = getExerciseActionState();
