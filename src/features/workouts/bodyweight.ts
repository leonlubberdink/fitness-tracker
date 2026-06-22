import { formatExerciseMetricValue } from "@/lib/exercise-units";

function invalidBodyweightMessage(message: string) {
  return {
    error: {
      issues: [{ message }],
    },
    success: false as const,
  };
}

export function roundBodyweightKg(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseOptionalBodyweightKg(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      data: null,
      success: true as const,
    };
  }

  const parsedValue = Number.parseFloat(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return invalidBodyweightMessage("Bodyweight must be a number.");
  }

  if (parsedValue <= 0) {
    return invalidBodyweightMessage("Bodyweight must be greater than 0.");
  }

  return {
    data: roundBodyweightKg(parsedValue),
    success: true as const,
  };
}

export function parseRequiredBodyweightKg(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return invalidBodyweightMessage("Bodyweight is required.");
  }

  const parsedValue = Number.parseFloat(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return invalidBodyweightMessage("Bodyweight must be a number.");
  }

  if (parsedValue <= 0) {
    return invalidBodyweightMessage("Bodyweight must be greater than 0.");
  }

  return {
    data: roundBodyweightKg(parsedValue),
    success: true as const,
  };
}

export function getBodyweightExerciseTotalLoadKg(
  sessionBodyweightKg: number,
  modifierKg: number,
) {
  return roundBodyweightKg(sessionBodyweightKg + modifierKg);
}

export function isBodyweightExerciseLoadInvalid(
  sessionBodyweightKg: number,
  modifierKg: number,
) {
  return getBodyweightExerciseTotalLoadKg(sessionBodyweightKg, modifierKg) < 0;
}

export function formatBodyweightExerciseLoad(
  sessionBodyweightKg: number,
  modifierKg: number,
) {
  return `${formatExerciseMetricValue(
    "kg",
    getBodyweightExerciseTotalLoadKg(sessionBodyweightKg, modifierKg),
  )} total (${formatExerciseMetricValue("bodyweight", modifierKg)})`;
}

export function formatBodyweightExerciseLoadWithReps(
  sessionBodyweightKg: number,
  modifierKg: number,
  reps: number,
) {
  return `${reps} reps · ${formatBodyweightExerciseLoad(sessionBodyweightKg, modifierKg)}`;
}
