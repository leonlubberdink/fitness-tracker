import { describe, expect, it } from "vitest";

import {
  coerceExerciseUnit,
  formatExerciseMetricValue,
  formatExerciseUnitLong,
  formatExerciseUnitShort,
  getExerciseMetricLabel,
  isExerciseUnit,
} from "@/lib/exercise-units";

describe("exercise units", () => {
  it("recognizes valid exercise units and coerces invalid values", () => {
    expect(isExerciseUnit("kg")).toBe(true);
    expect(isExerciseUnit("bodyweight")).toBe(true);
    expect(isExerciseUnit("time")).toBe(true);
    expect(isExerciseUnit("miles")).toBe(false);

    expect(coerceExerciseUnit("time")).toBe("time");
    expect(coerceExerciseUnit("miles")).toBe("kg");
    expect(coerceExerciseUnit("miles", "bodyweight")).toBe("bodyweight");
  });

  it("formats unit labels consistently", () => {
    expect(formatExerciseUnitLong("kg")).toBe("kg");
    expect(formatExerciseUnitLong("bodyweight")).toBe("bodyweight");
    expect(formatExerciseUnitLong("time")).toBe("time (sec)");
    expect(formatExerciseUnitShort("kg")).toBe("kg");
    expect(formatExerciseUnitShort("bodyweight")).toBe("BW");
    expect(formatExerciseUnitShort("time")).toBe("sec");
  });

  it("formats metric values for each unit type", () => {
    expect(formatExerciseMetricValue("kg", 82.5)).toBe("82.5 kg");
    expect(formatExerciseMetricValue("bodyweight", 0)).toBe("BW");
    expect(formatExerciseMetricValue("bodyweight", 15)).toBe("+15 BW");
    expect(formatExerciseMetricValue("bodyweight", -10)).toBe("-10 BW");
    expect(formatExerciseMetricValue("time", 90)).toBe("90 sec");
  });

  it("provides the correct form labels for each unit", () => {
    expect(getExerciseMetricLabel("kg")).toBe("Weight (kg)");
    expect(getExerciseMetricLabel("bodyweight")).toBe("Load");
    expect(getExerciseMetricLabel("time")).toBe("Time (sec)");
  });
});
