import { describe, expect, it } from "vitest";

import {
  addTemplateExerciseSchema,
  moveTemplateExerciseSchema,
  reorderTemplateExercisesSchema,
  saveWorkoutAsTemplateSchema,
  updateTemplateDetailsSchema,
} from "@/features/workout-templates/validation";

const templateId = "11111111-1111-4111-8111-111111111111";
const templateExerciseId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";
const exerciseId = "44444444-4444-4444-8444-444444444444";

describe("workout template validation", () => {
  it("parses valid template mutations", () => {
    const updateDetailsResult = updateTemplateDetailsSchema.safeParse({
      templateId,
      name: " Pull day ",
      description: " Focus on heavy rows. ",
    });
    const addExerciseResult = addTemplateExerciseSchema.safeParse({
      templateId,
      exerciseId,
    });
    const reorderResult = reorderTemplateExercisesSchema.safeParse({
      templateId,
      templateExerciseIds: [templateExerciseId],
    });
    const saveResult = saveWorkoutAsTemplateSchema.safeParse({
      name: " Upper split ",
      sessionId,
    });

    expect(updateDetailsResult.success).toBe(true);
    expect(addExerciseResult.success).toBe(true);
    expect(reorderResult.success).toBe(true);
    expect(saveResult.success).toBe(true);
    if (
      !updateDetailsResult.success ||
      !addExerciseResult.success ||
      !reorderResult.success ||
      !saveResult.success
    ) {
      return;
    }

    expect(updateDetailsResult.data.name).toBe("Pull day");
    expect(updateDetailsResult.data.description).toBe("Focus on heavy rows.");
    expect(saveResult.data.name).toBe("Upper split");
  });

  it("rejects invalid directions, duplicate ids, and missing names", () => {
    const moveResult = moveTemplateExerciseSchema.safeParse({
      templateId,
      templateExerciseId,
      direction: "left",
    });
    const reorderResult = reorderTemplateExercisesSchema.safeParse({
      templateId,
      templateExerciseIds: [templateExerciseId, templateExerciseId],
    });
    const updateDetailsResult = updateTemplateDetailsSchema.safeParse({
      templateId: "invalid",
      name: "",
      description: "",
    });

    expect(moveResult.success).toBe(false);
    expect(reorderResult.success).toBe(false);
    expect(updateDetailsResult.success).toBe(false);

    if (!moveResult.success) {
      expect(moveResult.error.flatten().fieldErrors.direction).toContain(
        "Choose a valid move direction.",
      );
    }

    if (!reorderResult.success) {
      expect(reorderResult.error.flatten().fieldErrors.templateExerciseIds).toContain(
        "Provide a valid exercise order.",
      );
    }

    if (!updateDetailsResult.success) {
      const issues = updateDetailsResult.error.flatten().fieldErrors;
      expect(issues.templateId).toContain("Invalid workout template.");
      expect(issues.name).toContain("Template name is required.");
    }
  });
});
