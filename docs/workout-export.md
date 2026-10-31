# Strength history export, version 2.0.0

Phase 1 implements full-history JSON download, optional RIR, warm-up/working
classification, optional repetition basis and workout outcomes. Symptoms and
structured numeric prescriptions belong to Phase 2. The revised
[three-phase plan](implementation-plan.md) excludes exercise equipment/movement/
laterality/implement metadata, individual set status and side from every phase.

## Using the feature

Migration 0015 removes the retired metadata, set status and side columns and enums;
it retains reps, weight, RIR, set type, repetition basis and workout outcomes.
Previously applied migration 0014 is retained unchanged. Apply pending migrations with `pnpm db:migrate:runtime`, then start
the app normally. The Docker startup scripts also apply pending migrations.
Migrations do not backfill historical RIR, set classifications, symptoms or
workout outcomes.

In **History**, choose **Export all history (JSON)** or select **From** and
**Through** dates and export that inclusive range. All history queries the database
independently of the 30-session History display limit. Open sessions are included
with their recorded data and truthful status. Empty selections are valid exports.

New set forms visibly default to Working. Reps/load suggestions are saved only
when the user submits the set. RIR starts blank on every new set; use an exact
integer, including 0, or leave it blank/use Skip RIR. Warm-ups do not record RIR.
Repetition basis can be total or per side; it is optional and independent of side.
Logged sets require reps and a load/time measurement. There is no set status field.

Finish normally, finish partial, abort or skip from the workout screen. A normal
finish becomes partial if an exercise entry has no measured sets.
An empty session can be skipped or aborted. A session containing work cannot be
declared skipped. Finalization retains untouched exercise entries and prescription
text. Partial/aborted/skipped sessions use `ended_at`; only completed sessions get
`completed_at`. All terminal outcomes release the single-open-workout constraint.
Skipped plan days capture their free-text prescriptions at the time of skipping;
older skips without such snapshots remain unknown.

## Published contract

- JSON Schema: [workout-export.v2.schema.json](schemas/workout-export.v2.schema.json).
- Synthetic mixed-history example: [workout-export-v2.example.json](examples/workout-export-v2.example.json).
- Live schema: `GET /api/workouts/export/schema`.
- Authenticated download: `GET /api/workouts/export`.
- Inclusive filtering: `GET /api/workouts/export?start=2026-10-26&end=2026-10-28`.

Version 2.0.0 supersedes the coach's stricter 1.0.0 reference. It explicitly allows
unknown legacy values and does not claim that old data satisfies the old schema.
Runtime validation and the distributed JSON Schema share the same Zod definition.
Regenerate the schema and synthetic example after contract changes with
`node --import tsx scripts/generate-workout-export-contract.ts`.

Unknown scalar/object values are consistently `null`. Collections contain only
stored records; empty does not mean a zero symptom score or an assessment.
No direct user identifier, name, email, password or location is added to the export.
User-entered exercise names, prescription text and notes are preserved verbatim.
Downloads use JSON media type, attachment disposition and private/no-store caching.

## Meaning and provenance

`raw.reps`, `raw.weight` and `raw.unit` preserve the original set measurements.
For `time`, `raw.weight` is seconds and is exposed as `duration_s`; the independent
raw reps field survives. For kg, the structured load preserves `value_kg`, with `kind` and `basis` unknown.
Equipment, movement pattern, laterality, implement count and side are not collected
or exported, so no per-implement, barbell or machine interpretation is asserted.

For bodyweight, session `body_mass_kg` stays separate. A positive raw modifier
becomes added kg, a negative modifier becomes nonnegative assistance kg, and zero
means no modifier. Less assistance means a harder set. These interpretations are
deterministic; they do not replace the signed raw measurement. kg entries without
confirmed equipment retain unknown kind/basis even if the name suggests equipment.

Entries preserve names, categories, units, prescribed text and advice independently
of the catalog. If the original exercise has been deleted, a stable
`snapshot:<entry ID>` catalog record keeps the reference valid. `source_exercise_id`
preserves the database foreign key when it still exists. New entries also store
`exercise_id_snapshot` so the original exercise ID survives catalog deletion.
Previously deleted legacy IDs cannot be reconstructed.

Session `status_source` identifies recorded outcomes, completed status derived
from legacy `completed_at`, or an unknown outcome. A legacy `completed_at` also
establishes the session end; an old open row alone does not establish partial or
aborted status. Set creation timestamps are never claimed as completion times.
The current timezone preference is exported separately from `performed_on` and
UTC timestamps. Historical local offsets are not reconstructed.

`prescription_snapshot` is planned text, never actual performance. Existing
`next_load_recommendation` remains advice, without a new coaching/diagnosis engine.
No external activity integration is required.

## Coverage and consistency

Coverage bounds are the first and last returned dated records, including skipped
planned workouts. Requested date bounds are separate. `includes_skipped_sessions`
means the export queried stored skips, even if there are none. Skips use their
stored plan schedule to derive `scheduled_on`; this is a planned date, not a
performed date. Undated skips are included in all-history downloads and excluded
from date-filtered downloads with an explicit excluded count. Skips are kept in
`skipped_planned_workouts`, never converted into performed sets. A linked workout
session takes precedence so a plan day is not counted twice.

Session ordering is performed date, actual start instant and stable ID. Entries
use stored order; sets use stored set number. Every stored selected set is
included, including historical unclassified sets and any legacy records with missing measurements.
IDs remain stable between exports. Export timestamps can change.

JSON Schema checks structure and types. Additional runtime checks enforce ID
uniqueness, catalog references, date selection, ordering, completion consistency,
no duplicate skipped plan day and coverage/count accuracy. `working_sets` and
`warmup_sets` count recorded sets with that type and measurements; they do not
assert a set completion status. Unclassified historical sets have a separate count.
Statistics exclude warm-ups and records without measurements; historical measurements
remain visible as unclassified recorded history. Volume uses recorded load without
asserting equivalence between exercises or equipment.

The old app discarded untouched entries when finishing. Those missing historical
exercises and previously deleted records cannot be recovered. Coverage means all
currently stored history, not an assertion that deleted data has been restored.

## Verification

Regression coverage is provided for schema validation of legacy/new/mixed exports,
history longer than the display limit, date boundaries, stable IDs, raw values,
raw load/bodyweight/time conventions, missing values, absence of excluded fields,
RIR 0 versus 3 versus unrecorded, and early-finish
preservation. Endpoint tests cover authentication, date errors and download headers.
Playwright scenarios exercise the database-backed download and partial finish.

Run `pnpm test:unit`, `pnpm test:component` and `pnpm test:e2e` to execute the full
test suites. Run tests only when requested by the user, per the repository
instructions. The end-to-end setup applies pending database migrations and uses
the configured E2E account.
