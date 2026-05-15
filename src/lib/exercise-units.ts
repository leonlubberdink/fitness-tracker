export const EXERCISE_UNITS = ["kg", "bodyweight", "time"] as const;

export type ExerciseUnit = (typeof EXERCISE_UNITS)[number];

export function isExerciseUnit(value: string): value is ExerciseUnit {
  return EXERCISE_UNITS.includes(value as ExerciseUnit);
}

export function coerceExerciseUnit(
  value: string,
  fallback: ExerciseUnit = "kg",
): ExerciseUnit {
  return isExerciseUnit(value) ? value : fallback;
}

export function formatExerciseUnitLong(unit: ExerciseUnit) {
  switch (unit) {
    case "kg":
      return "kg";
    case "bodyweight":
      return "bodyweight";
    case "time":
      return "time (sec)";
  }
}

export function formatExerciseUnitShort(unit: ExerciseUnit) {
  switch (unit) {
    case "kg":
      return "kg";
    case "bodyweight":
      return "BW";
    case "time":
      return "sec";
  }
}

export function formatExerciseMetricValue(unit: ExerciseUnit, value: number) {
  if (unit === "kg") {
    return `${value} kg`;
  }

  if (unit === "bodyweight") {
    if (value === 0) {
      return "BW";
    }

    return `${value > 0 ? "+" : ""}${value} BW`;
  }

  return `${value} sec`;
}

export function getExerciseMetricLabel(unit: ExerciseUnit) {
  switch (unit) {
    case "kg":
      return "Weight (kg)";
    case "bodyweight":
      return "Load";
    case "time":
      return "Time (sec)";
  }
}
