export type WorkoutSessionNoteActionState = {
  error: string | null;
  success: string | null;
  note: string;
};

export function getWorkoutSessionNoteActionState(
  note = "",
): WorkoutSessionNoteActionState {
  return {
    error: null,
    success: null,
    note,
  };
}
