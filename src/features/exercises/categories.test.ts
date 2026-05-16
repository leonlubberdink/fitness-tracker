import { describe, expect, it } from "vitest";

import {
  formatExerciseCategories,
  formatStoredExerciseCategories,
  hasExerciseCategories,
  normalizeExerciseCategories,
  parseStoredExerciseCategories,
} from "@/features/exercises/categories";

describe("exercise categories", () => {
  it("normalizes comma-separated categories and removes duplicates", () => {
    expect(
      normalizeExerciseCategories('  Push, pull, "Push", [ Legs ], , conditioning  '),
    ).toEqual(["Push", "pull", "Legs", "conditioning"]);
  });

  it("detects whether a value contains at least one category", () => {
    expect(hasExerciseCategories(" , [ ] ")).toBe(false);
    expect(hasExerciseCategories("Push")).toBe(true);
  });

  it("parses and formats stored category values consistently", () => {
    expect(parseStoredExerciseCategories(["Push", " Legs "])).toEqual([
      "Push",
      "Legs",
    ]);
    expect(formatExerciseCategories(["Push", "Legs"])).toBe("Push, Legs");
    expect(formatStoredExerciseCategories('["Push", "Legs", "push"]')).toBe(
      "Push, Legs",
    );
  });
});
