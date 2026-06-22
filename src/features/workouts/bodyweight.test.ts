import { describe, expect, it } from "vitest";

import {
  formatBodyweightExerciseLoad,
  formatBodyweightExerciseLoadWithReps,
  getBodyweightExerciseTotalLoadKg,
  isBodyweightExerciseLoadInvalid,
  parseOptionalBodyweightKg,
  parseRequiredBodyweightKg,
  roundBodyweightKg,
} from "@/features/workouts/bodyweight";

describe("bodyweight helpers", () => {
  it("rounds and parses bodyweight values", () => {
    expect(roundBodyweightKg(82.345)).toBe(82.35);
    expect(roundBodyweightKg(82.344)).toBe(82.34);

    expect(parseOptionalBodyweightKg(" 82.345 ")).toEqual({
      data: 82.35,
      success: true,
    });
    expect(parseOptionalBodyweightKg(" ")).toEqual({
      data: null,
      success: true,
    });
    expect(parseRequiredBodyweightKg("82.345")).toEqual({
      data: 82.35,
      success: true,
    });
  });

  it("rejects invalid bodyweight input", () => {
    expect(parseOptionalBodyweightKg("abc").success).toBe(false);
    expect(parseOptionalBodyweightKg("0").success).toBe(false);
    expect(parseRequiredBodyweightKg("").success).toBe(false);
    expect(parseRequiredBodyweightKg("-1").success).toBe(false);
  });

  it("computes effective bodyweight load and rejects negative totals", () => {
    expect(getBodyweightExerciseTotalLoadKg(80, 5)).toBe(85);
    expect(getBodyweightExerciseTotalLoadKg(80.123, 0.005)).toBe(80.13);
    expect(isBodyweightExerciseLoadInvalid(80, -81)).toBe(true);
    expect(isBodyweightExerciseLoadInvalid(80, -20)).toBe(false);
  });

  it("formats effective bodyweight load labels", () => {
    expect(formatBodyweightExerciseLoad(80, 5)).toBe("85 kg total (+5 BW)");
    expect(formatBodyweightExerciseLoadWithReps(80, 5, 12)).toBe(
      "12 reps · 85 kg total (+5 BW)",
    );
  });
});
