import { describe, expect, it } from "vitest";

import {
  buildPlanProgress,
  formatPlanDateLabel,
  getDerivedPlanWorkoutState,
  getPlanCompletionState,
  getPlanCurrentWeek,
  getPlanWeekLongLabel,
  getPlanWeekdayLabel,
  getPlanWorkoutScheduledDate,
  getWeekOneCutoffWeekday,
  isPlanWorkoutEditable,
  isPlanWorkoutResolved,
} from "@/features/plans/utils";

describe("plan utilities", () => {
  it("returns weekday labels and schedule-derived labels", () => {
    expect(getPlanWeekdayLabel(3)).toBe("Wed");
    expect(getPlanWeekdayLabel(9)).toBe("Day 9");
    expect(getPlanWeekLongLabel(1)).toBe("Monday");
    expect(getPlanWorkoutScheduledDate("2025-01-08", 2, 5)).toBe("2025-01-17");
    expect(getWeekOneCutoffWeekday("2025-01-08")).toBe(3);
  });

  it("derives workout state from the persisted state and schedule", () => {
    expect(getDerivedPlanWorkoutState("completed", "2025-01-05", "2025-01-06")).toBe(
      "completed",
    );
    expect(getDerivedPlanWorkoutState("skipped", "2025-01-05", "2025-01-06")).toBe(
      "skipped",
    );
    expect(getDerivedPlanWorkoutState("planned", "2025-01-05", "2025-01-06")).toBe(
      "missed",
    );
    expect(getDerivedPlanWorkoutState("planned", "2025-01-06", "2025-01-06")).toBe(
      "today",
    );
    expect(getDerivedPlanWorkoutState("planned", "2025-01-07", "2025-01-06")).toBe(
      "upcoming",
    );
  });

  it("computes editability and resolution consistently", () => {
    expect(isPlanWorkoutEditable("planned", "2025-01-06", "2025-01-06")).toBe(true);
    expect(isPlanWorkoutEditable("planned", "2025-01-05", "2025-01-06")).toBe(false);
    expect(isPlanWorkoutEditable("completed", "2025-01-06", "2025-01-06")).toBe(false);

    expect(isPlanWorkoutResolved("completed", "2025-01-07", "2025-01-06")).toBe(true);
    expect(isPlanWorkoutResolved("skipped", "2025-01-07", "2025-01-06")).toBe(true);
    expect(isPlanWorkoutResolved("planned", "2025-01-05", "2025-01-06")).toBe(true);
    expect(isPlanWorkoutResolved("planned", "2025-01-07", "2025-01-06")).toBe(false);
  });

  it("clamps the current plan week within the plan duration", () => {
    expect(getPlanCurrentWeek("2025-01-06", "2025-01-01", 4)).toBe(1);
    expect(getPlanCurrentWeek("2025-01-06", "2025-01-20", 4)).toBe(3);
    expect(getPlanCurrentWeek("2025-01-06", "2025-02-20", 4)).toBe(4);
  });

  it("builds progress summaries and completion state from scheduled workouts", () => {
    const workouts = [
      { scheduledDate: "2025-01-04", state: "completed" as const },
      { scheduledDate: "2025-01-05", state: "skipped" as const },
      { scheduledDate: "2025-01-06", state: "planned" as const },
      { scheduledDate: "2025-01-07", state: "planned" as const },
      { scheduledDate: "2025-01-03", state: "planned" as const },
    ];

    expect(buildPlanProgress(workouts, "2025-01-06")).toEqual({
      completed: 1,
      missed: 1,
      remaining: 2,
      resolved: 3,
      skipped: 1,
      total: 5,
    });
    expect(getPlanCompletionState(workouts, "2025-01-06")).toBe(false);
    expect(
      getPlanCompletionState(
        [
          { scheduledDate: "2025-01-04", state: "completed" as const },
          { scheduledDate: "2025-01-05", state: "skipped" as const },
          { scheduledDate: "2025-01-03", state: "planned" as const },
        ],
        "2025-01-06",
      ),
    ).toBe(true);
  });

  it("formats short plan dates in a stable UTC-safe way", () => {
    expect(formatPlanDateLabel("2025-01-06", "America/Los_Angeles")).toBe("6 Jan");
  });
});
