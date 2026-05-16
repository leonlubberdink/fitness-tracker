import { describe, expect, it } from "vitest";

import {
  parseWorkoutSetFields,
  reorderWorkoutEntriesSchema,
} from "@/features/workouts/validation";

const sessionId = "11111111-1111-4111-8111-111111111111";
const entryId = "22222222-2222-4222-8222-222222222222";

describe("workout validation", () => {
  it("parses kg-based workout sets and rounds metric values", () => {
    const result = parseWorkoutSetFields("kg", {
      reps: "8",
      weight: "12.345",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      reps: 8,
      weight: 12.35,
    });
  });

  it("parses time-based workout sets as integer seconds", () => {
    const result = parseWorkoutSetFields("time", {
      reps: "1",
      weight: "90",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      reps: 1,
      weight: 90,
    });
  });

  it("rejects invalid reps and invalid time metrics", () => {
    const invalidReps = parseWorkoutSetFields("kg", {
      reps: "3.5",
      weight: "50",
    });
    const invalidTime = parseWorkoutSetFields("time", {
      reps: "5",
      weight: "12.5",
    });

    expect(invalidReps.success).toBe(false);
    expect(invalidTime.success).toBe(false);

    if (!invalidReps.success) {
      expect(invalidReps.error.flatten().fieldErrors.reps).toContain(
        "Reps must be a whole number.",
      );
    }

    if (!invalidTime.success) {
      expect(invalidTime.error.flatten().fieldErrors.weight).toContain(
        "Time must be a whole number of seconds.",
      );
    }
  });

  it("rejects missing or non-numeric bodyweight loads", () => {
    const missingLoad = parseWorkoutSetFields("bodyweight", {
      reps: "5",
      weight: "",
    });
    const invalidLoad = parseWorkoutSetFields("bodyweight", {
      reps: "5",
      weight: "abc",
    });

    expect(missingLoad.success).toBe(false);
    expect(invalidLoad.success).toBe(false);

    if (!missingLoad.success) {
      expect(missingLoad.error.flatten().fieldErrors.weight).toContain(
        "Load is required.",
      );
    }

    if (!invalidLoad.success) {
      expect(invalidLoad.error.flatten().fieldErrors.weight).toContain(
        "Load must be a number.",
      );
    }
  });

  it("rejects duplicate reorder ids", () => {
    const result = reorderWorkoutEntriesSchema.safeParse({
      entryIds: [entryId, entryId],
      sessionId,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.flatten().fieldErrors.entryIds).toContain(
      "Provide a valid exercise order.",
    );
  });
});
