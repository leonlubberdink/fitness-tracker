export type ExercisePrescription = {
  notes: string | null;
  restTime: string | null;
  setsReps: string | null;
};

export function normalizeOptionalTextValue(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function hasIncompleteExercisePrescription(
  prescription: ExercisePrescription,
) {
  return (
    prescription.setsReps === null ||
    prescription.setsReps.trim().length === 0 ||
    prescription.restTime === null ||
    prescription.restTime.trim().length === 0
  );
}

export function hasIncompleteExercisePrescriptions(
  prescriptions: ExercisePrescription[],
) {
  return prescriptions.some((prescription) =>
    hasIncompleteExercisePrescription(prescription),
  );
}
