import { describe, expect, it } from "vitest";

import { getActiveAndPlannedWorkoutEntries } from "@/features/workouts/reorder";

describe("workout entry reordering", () => {
  const entries = [
    { id: "previous", sortOrder: 1 },
    { id: "current", sortOrder: 2 },
    { id: "next", sortOrder: 3 },
    { id: "later", sortOrder: 4 },
  ];

  it("includes the active exercise with the upcoming exercises", () => {
    expect(getActiveAndPlannedWorkoutEntries(entries, 2)).toEqual([
      { id: "current", sortOrder: 2 },
      { id: "next", sortOrder: 3 },
      { id: "later", sortOrder: 4 },
    ]);
  });

  it("falls back to the final exercise when the active sort order is missing", () => {
    expect(getActiveAndPlannedWorkoutEntries(entries, null)).toEqual([
      { id: "later", sortOrder: 4 },
    ]);
    expect(getActiveAndPlannedWorkoutEntries(entries, 99)).toEqual([
      { id: "later", sortOrder: 4 },
    ]);
  });
});
