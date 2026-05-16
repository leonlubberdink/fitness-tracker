import { describe, expect, it } from "vitest";

import {
  createPlanSchema,
  startPlanSchema,
  updateTimeZoneSchema,
  upsertPlanWorkoutSchema,
} from "@/features/plans/validation";

const planId = "11111111-1111-4111-8111-111111111111";
const workoutTemplateId = "22222222-2222-4222-8222-222222222222";
const existingPlanWorkoutId = "33333333-3333-4333-8333-333333333333";

describe("plan validation", () => {
  it("parses valid plan creation input and coerces duration to a number", () => {
    const result = createPlanSchema.safeParse({
      durationWeeks: " 12 ",
      goal: " Build consistency ",
      name: " Spring plan ",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      durationWeeks: 12,
      goal: "Build consistency",
      name: "Spring plan",
    });
  });

  it("rejects invalid plan creation input", () => {
    const result = createPlanSchema.safeParse({
      durationWeeks: "0",
      goal: "",
      name: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const issues = result.error.flatten().fieldErrors;
    expect(issues.name).toContain("Plan name is required.");
    expect(issues.goal).toContain("Goal is required.");
    expect(issues.durationWeeks).toContain("Enter a valid number of weeks.");
  });

  it("parses valid plan workout upserts and normalizes empty optional ids", () => {
    const result = upsertPlanWorkoutSchema.safeParse({
      existingPlanWorkoutId: " ",
      planId,
      weekNumber: "2",
      weekday: "5",
      workoutTemplateId,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      existingPlanWorkoutId: undefined,
      planId,
      weekNumber: 2,
      weekday: 5,
      workoutTemplateId,
    });
  });

  it("rejects invalid workout upserts, start dates, and time zones", () => {
    const invalidWorkout = upsertPlanWorkoutSchema.safeParse({
      existingPlanWorkoutId: "not-a-uuid",
      planId,
      weekNumber: "0",
      weekday: "8",
      workoutTemplateId,
    });
    const invalidStartDate = startPlanSchema.safeParse({
      planId,
      startDate: "01-06-2025",
    });
    const invalidTimeZone = updateTimeZoneSchema.safeParse({
      timeZone: " ",
    });

    expect(invalidWorkout.success).toBe(false);
    expect(invalidStartDate.success).toBe(false);
    expect(invalidTimeZone.success).toBe(false);

    if (!invalidWorkout.success) {
      const issues = invalidWorkout.error.flatten().fieldErrors;
      expect(issues.weekNumber).toContain("Choose a valid week.");
      expect(issues.weekday).toContain("Choose a valid weekday.");
      expect(issues.existingPlanWorkoutId).toContain("Invalid planned workout.");
    }

    if (!invalidStartDate.success) {
      expect(invalidStartDate.error.flatten().fieldErrors.startDate).toContain(
        "Choose a valid start date.",
      );
    }

    if (!invalidTimeZone.success) {
      expect(invalidTimeZone.error.flatten().fieldErrors.timeZone).toContain(
        "Time zone is required.",
      );
    }
  });

  it("preserves an existing plan workout id when it is valid", () => {
    const result = upsertPlanWorkoutSchema.safeParse({
      existingPlanWorkoutId,
      planId,
      weekNumber: "3",
      weekday: "1",
      workoutTemplateId,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.existingPlanWorkoutId).toBe(existingPlanWorkoutId);
  });
});
