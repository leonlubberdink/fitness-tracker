import { describe, expect, it } from "vitest";

import {
  getExerciseActionState,
  initialCreateExerciseActionState,
} from "@/features/exercises/state";

describe("exercise state", () => {
  it("builds an empty action state by default", () => {
    expect(getExerciseActionState()).toEqual({
      error: null,
      fieldErrors: {},
      success: null,
      values: {
        category: "",
        defaultUnit: "kg",
        name: "",
      },
    });
    expect(initialCreateExerciseActionState).toEqual(getExerciseActionState());
  });

  it("applies provided values while preserving defaults for missing fields", () => {
    expect(
      getExerciseActionState({
        name: "Bench Press",
        defaultUnit: "bodyweight",
      }),
    ).toEqual({
      error: null,
      fieldErrors: {},
      success: null,
      values: {
        category: "",
        defaultUnit: "bodyweight",
        name: "Bench Press",
      },
    });
  });
});
