import { describe, expect, it } from "vitest";
import { resolveSessionOutcome } from "./completion";

describe("session outcomes", () => {
  const recorded = { reps: 8, weight: 20 };
  it("marks an early finish partial and retains the original exercise list", () => {
    const entries = [
      { id: "performed", sets: [recorded] },
      { id: "unperformed", sets: [] },
    ];
    expect(resolveSessionOutcome("completed", entries)).toBe("partial");
    expect(entries).toHaveLength(2);
    expect(entries[1]).toEqual({ id: "unperformed", sets: [] });
  });
  it("keeps an entry with no measured sets partial", () => {
    expect(
      resolveSessionOutcome("completed", [
        { id: "performed", sets: [recorded] },
        { id: "unmeasured", sets: [{ reps: null, weight: null }] },
      ]),
    ).toBe("partial");
  });
  it("allows aborting or skipping an empty session without fabricated measurements", () => {
    expect(resolveSessionOutcome("aborted", [])).toBe("aborted");
    expect(
      resolveSessionOutcome("skipped", [{ id: "planned", sets: [] }]),
    ).toBe("skipped");
    expect(() => resolveSessionOutcome("completed", [])).toThrow("Log a set");
  });
  it("requires partial or aborted when a skipped outcome would hide recorded work", () => {
    expect(() =>
      resolveSessionOutcome("skipped", [{ id: "entry", sets: [recorded] }]),
    ).toThrow("recorded work");
    expect(
      resolveSessionOutcome("aborted", [{ id: "entry", sets: [recorded] }]),
    ).toBe("aborted");
  });
});
