import { describe, expect, it } from "vitest";

import {
  createExerciseSchema,
  deleteExerciseSchema,
  updateExerciseSchema,
} from "@/features/exercises/validation";

const exerciseId = "11111111-1111-4111-8111-111111111111";

describe("exercise validation", () => {
  it("parses valid exercise create and update payloads", () => {
    const createResult = createExerciseSchema.safeParse({
      name: " Bench Press ",
      category: " Push, Chest ",
      defaultUnit: "kg",
    });
    const updateResult = updateExerciseSchema.safeParse({
      exerciseId,
      name: " Pull Up ",
      category: " Pull ",
      defaultUnit: "bodyweight",
    });

    expect(createResult.success).toBe(true);
    expect(updateResult.success).toBe(true);
    if (!createResult.success || !updateResult.success) {
      return;
    }

    expect(createResult.data).toEqual({
      category: "Push, Chest",
      defaultUnit: "kg",
      name: "Bench Press",
    });
    expect(updateResult.data.exerciseId).toBe(exerciseId);
  });

  it("rejects invalid exercise fields", () => {
    const createResult = createExerciseSchema.safeParse({
      name: "",
      category: " , ",
      defaultUnit: "miles",
    });
    const updateResult = updateExerciseSchema.safeParse({
      exerciseId: "invalid",
      name: "Row",
      category: "Pull",
      defaultUnit: "kg",
    });
    const deleteResult = deleteExerciseSchema.safeParse({
      exerciseId: "invalid",
    });

    expect(createResult.success).toBe(false);
    expect(updateResult.success).toBe(false);
    expect(deleteResult.success).toBe(false);

    if (!createResult.success) {
      const issues = createResult.error.flatten().fieldErrors;
      expect(issues.name).toContain("Name is required.");
      expect(issues.category).toContain("Add at least one category.");
      expect(issues.defaultUnit).toContain("Choose a valid default unit.");
    }

    if (!updateResult.success) {
      expect(updateResult.error.flatten().fieldErrors.exerciseId).toContain(
        "Invalid exercise.",
      );
    }

    if (!deleteResult.success) {
      expect(deleteResult.error.flatten().fieldErrors.exerciseId).toContain(
        "Invalid exercise.",
      );
    }
  });
});
