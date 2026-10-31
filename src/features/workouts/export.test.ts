import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
  buildWorkoutExport,
  interpretRecordedLoad,
  validateExportConsistency,
} from "./export";
import {
  exportRangeSchema,
  getWorkoutExportJsonSchema,
  workoutExportSchema,
} from "./export-schema";
import { makeExportSource, syntheticId } from "@/test/fixtures/workout-export";

const options = {
  timeZone: "Europe/Amsterdam",
  appVersion: "0.1.0",
  range: {},
  exportedAt: new Date("2026-10-29T12:00:00Z"),
};
const published = JSON.parse(
  readFileSync("docs/schemas/workout-export.v2.schema.json", "utf8"),
);
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(published);

describe("workout history export", () => {
  it("exports more than the 30-session display limit and keeps source IDs and values stable", () => {
    const source = makeExportSource(35);
    source.sessions.reverse();
    source.entries.reverse();
    source.sets.reverse();
    const first = buildWorkoutExport(source, options);
    const second = buildWorkoutExport(source, {
      ...options,
      exportedAt: new Date("2026-10-30T12:00:00Z"),
    });
    expect(first.sessions).toHaveLength(35);
    expect(first.coverage.set_count).toBe(175);
    expect(first.sessions).toEqual(second.sessions);
    expect(first.sessions[0].id).toBe(syntheticId(100));
    expect(
      first.sessions[0].exercise_entries[0].sets.map((set) => set.sequence),
    ).toEqual([1, 2, 3, 4, 5]);
    expect(validate(first), JSON.stringify(validate.errors)).toBe(true);
  });

  it("includes both calendar-date boundaries and reports actual and requested coverage separately", () => {
    const result = buildWorkoutExport(makeExportSource(4), {
      ...options,
      range: { start: "2026-10-27", end: "2026-10-28" },
    });
    expect(result.sessions.map((session) => session.performed_on)).toEqual([
      "2026-10-27",
      "2026-10-28",
    ]);
    expect(result.skipped_planned_workouts).toHaveLength(1);
    expect(result.coverage).toMatchObject({
      start_date: "2026-10-27",
      end_date: "2026-10-28",
      requested_start_date: "2026-10-27",
      requested_end_date: "2026-10-28",
      scope: "date_range",
    });
    const empty = buildWorkoutExport(makeExportSource(), {
      ...options,
      range: { start: "2020-01-01", end: "2020-01-02" },
    });
    expect(empty.coverage.start_date).toBeNull();
    expect(empty.coverage.end_date).toBeNull();
    expect(empty.coverage.session_count).toBe(0);
    expect(
      exportRangeSchema.safeParse({ start: "2026-10-29", end: "2026-10-28" })
        .success,
    ).toBe(false);
    expect(exportRangeSchema.safeParse({ start: "2026-02-30" }).success).toBe(
      false,
    );
  });

  it("keeps legacy observations unknown despite current catalog defaults", () => {
    const result = buildWorkoutExport(makeExportSource(), options);
    const legacy = result.sessions[0];
    const entry = legacy.exercise_entries[0];
    expect(legacy.status_source).toBe("derived_from_completed_at");
    expect(entry).not.toHaveProperty("metadata_snapshot");
    expect(entry.sets[0]).toMatchObject({
      rir: null,
      set_type: null,
      reps_basis: null,
      load: { kind: "unknown", basis: "unknown" },
    });
    expect(legacy.counts.working_sets).toBe(0);
    expect(legacy.counts.unclassified_sets).toBe(5);
    expect(entry.sets[0]).not.toHaveProperty("completed_at");
    expect(result.sessions[1].counts).toEqual({
      working_sets: 3,
      warmup_sets: 2,
      unclassified_sets: 0,
    });
    expect(
      result.sessions[1].exercise_entries[0].sets.map((set) => set.rir),
    ).toEqual([null, null, 0, 3, 3]);
  });

  it("preserves deleted-exercise snapshots with deterministic catalog fallback IDs", () => {
    const source = makeExportSource();
    source.entries[0].exerciseId = null;
    const result = buildWorkoutExport(source, options);
    const id = result.sessions[0].exercise_entries[0].exercise_id;
    expect(id).toBe(`snapshot:${source.entries[0].id}`);
    expect(
      result.exercise_catalog.find((exercise) => exercise.id === id),
    ).toMatchObject({
      source: "entry_snapshot",
      name: source.entries[0].exerciseNameSnapshot,
    });
    expect(validate(result), JSON.stringify(validate.errors)).toBe(true);
  });

  it("retains a newly snapshotted exercise ID after catalog deletion", () => {
    const source = makeExportSource(2);
    source.exercises = [];
    source.entries[1].exerciseId = null;
    const result = buildWorkoutExport(source, options);
    expect(result.sessions[1].exercise_entries[0].exercise_id).toBe(
      source.entries[1].exerciseIdSnapshot,
    );
    expect(
      result.exercise_catalog.find(
        (exercise) => exercise.id === source.entries[1].exerciseIdSnapshot,
      )?.source,
    ).toBe("entry_snapshot");
  });

  it("keeps 6 reps per leg distinct from 6 combined reps", () => {
    const source = makeExportSource(2);
    source.sets[7].reps = 6;
    source.sets[7].repsBasis = "per_side";
    const set = buildWorkoutExport(source, options).sessions[1]
      .exercise_entries[0].sets[2];
    expect(set).toMatchObject({
      reps: 6,
      reps_basis: "per_side",
      raw: { reps: 6 },
    });
  });

  it("preserves time measurements and independent set records", () => {
    const source = makeExportSource();
    source.entries[0].unitSnapshot = "time";
    source.sets[0].weight = 45;
    source.sets[5].repsBasis = "per_side";
    source.sets[6].repsBasis = "per_side";
    const result = buildWorkoutExport(source, options);
    expect(result.sessions[0].exercise_entries[0].sets[0]).toMatchObject({
      duration_s: 45,
      reps: null,
      load: null,
      raw: { reps: 10, weight: 45, unit: "time" },
    });
    expect(
      result.sessions[1].exercise_entries[0].sets
        .slice(0, 2)
        .map((set) => [set.id, set.reps_basis]),
    ).toEqual([
      [source.sets[5].id, "per_side"],
      [source.sets[6].id, "per_side"],
    ]);
  });

  it("exports partial and aborted sessions, preserves recorded sets, and does not double-count linked skips", () => {
    const source = makeExportSource();
    source.sessions[0].completedAt = null;
    source.sessions[0].endedAt = options.exportedAt;
    source.sessions[0].status = "partial";
    source.sessions[1].completedAt = null;
    source.sessions[1].status = "aborted";
    source.sessions[1].planWorkoutId = source.skipped[0].id;
    source.sets[7].reps = null;
    source.sets[7].weight = null;
    source.sets[7].rir = null;
    const result = buildWorkoutExport(source, options);
    expect(result.sessions.map((session) => session.status)).toEqual([
      "partial",
      "aborted",
    ]);
    expect(result.sessions[1].counts.working_sets).toBe(2);
    expect(result.skipped_planned_workouts).toEqual([]);
    expect(validate(result), JSON.stringify(validate.errors)).toBe(true);
  });

  it("reports undated skipped records honestly", () => {
    const source = makeExportSource();
    source.skipped[0].planStartDate = null;
    expect(
      buildWorkoutExport(source, options).skipped_planned_workouts[0]
        .scheduled_on,
    ).toBeNull();
    const filtered = buildWorkoutExport(source, {
      ...options,
      range: { start: "2026-10-01" },
    });
    expect(filtered.coverage.undated_skipped_workouts_excluded).toBe(1);
  });

  it("validates legacy-only, new-only and mixed files against the distributed JSON Schema", () => {
    expect(published).toEqual(getWorkoutExportJsonSchema());
    for (const source of [makeExportSource(1), makeExportSource(2)]) {
      const document = buildWorkoutExport(source, options);
      expect(validate(document), JSON.stringify(validate.errors)).toBe(true);
      expect(workoutExportSchema.safeParse(document).success).toBe(true);
    }
    const source = makeExportSource(2);
    source.sessions.shift();
    source.entries.shift();
    source.sets.splice(0, 5);
    expect(
      validate(buildWorkoutExport(source, options)),
      JSON.stringify(validate.errors),
    ).toBe(true);
    const example = JSON.parse(
      readFileSync("docs/examples/workout-export-v2.example.json", "utf8"),
    );
    expect(validate(example), JSON.stringify(validate.errors)).toBe(true);
    expect(JSON.stringify(example)).not.toMatch(
      /user_id|email|password|latitude|longitude/,
    );
  });

  it("rejects broken references, duplicate IDs, wrong counts and invalid completion states", () => {
    const document = buildWorkoutExport(makeExportSource(), options);
    const brokenReference = structuredClone(document);
    brokenReference.sessions[0].exercise_entries[0].exercise_id = "missing";
    expect(() => validateExportConsistency(brokenReference)).toThrow(
      "Missing catalog reference",
    );
    const duplicated = structuredClone(document);
    duplicated.sessions[1].id = duplicated.sessions[0].id;
    expect(() => validateExportConsistency(duplicated)).toThrow("Duplicate");
    const wrongCount = structuredClone(document);
    wrongCount.coverage.set_count++;
    expect(() => validateExportConsistency(wrongCount)).toThrow(
      "Coverage counts",
    );
    const wrongStatus = structuredClone(document);
    wrongStatus.sessions[1].status = "aborted";
    expect(() => validateExportConsistency(wrongStatus)).toThrow(
      "completion state",
    );
    const wrongBounds = structuredClone(document);
    wrongBounds.coverage.end_date = "2026-10-29";
    expect(() => validateExportConsistency(wrongBounds)).toThrow(
      "Coverage dates",
    );
  });
});

describe("recorded load interpretation", () => {
  it("preserves kg without inventing equipment or implement information", () => {
    expect(interpretRecordedLoad("kg", 20)).toEqual({
      value_kg: 20,
      kind: "unknown",
      basis: "unknown",
      added_kg: null,
      assistance_kg: null,
    });
    const document = buildWorkoutExport(makeExportSource(), options);
    const entry = document.sessions[1].exercise_entries[0];
    expect(entry).not.toHaveProperty("metadata_snapshot");
    for (const exercise of document.exercise_catalog) {
      for (const field of [
        "equipment_type",
        "movement_pattern",
        "laterality",
        "implement_count",
        "default_side",
      ]) {
        expect(exercise).not.toHaveProperty(field);
      }
    }
    for (const set of entry.sets) {
      expect(set).not.toHaveProperty("status");
      expect(set).not.toHaveProperty("side");
      expect(set.load).not.toHaveProperty("implement_count");
    }
  });
  it("separates added load from assistance while keeping the source sign accessible", () => {
    expect(interpretRecordedLoad("bodyweight", -25)).toMatchObject({
      assistance_kg: 25,
      added_kg: 0,
    });
    expect(interpretRecordedLoad("bodyweight", 5)).toMatchObject({
      assistance_kg: 0,
      added_kg: 5,
    });
    expect(interpretRecordedLoad("bodyweight", 0)).toMatchObject({
      assistance_kg: 0,
      added_kg: 0,
    });
  });
});
