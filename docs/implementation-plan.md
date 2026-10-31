# Workout history implementation plan

This plan keeps the original three phases. The user’s scope update supersedes the
requirements in `coding_agent_instruction.json` wherever they conflict.

## Excluded from every phase

Do not collect, configure, infer, display or export:

- Exercise equipment type, movement pattern, laterality or implement count.
- Equipment identifiers or equipment-specific load classifications that would reintroduce this metadata.
- Individual set status (completed, incomplete or skipped).
- Set side (bilateral, left, right, both sides or alternating).

These are removed requirements, not a deferred backlog. Repetition basis
(total or per side) remains independently optional. Workout outcomes remain
session-level and do not imply individual set completion.

## Phase 1: Faithful export and essential logging

- Full-history and inclusive date-range JSON downloads with stable IDs, chronological
  ordering, truthful coverage, schema validation and skipped planned workouts.
- Preserve recorded reps, load, time, session bodyweight, timestamps, plan/template
  links, free-text prescriptions and existing next-load recommendations.
- Optional exact per-working-set RIR, including 0; missing stays unknown.
- Warm-up/working set type and separate recorded working, warm-up and unclassified counts.
- Optional total/per-side repetition basis, without side tracking or exercise defaults.
- Workout outcomes: in progress, completed, partial, aborted and skipped, with end timestamps.
- Retain untouched planned exercise entries on early finish. Logged sets require
  measurements; unperformed prescriptions remain entries with no recorded sets.
- Keep raw kg values without equipment-specific interpretation. Preserve the existing
  distinction between added bodyweight load and assistance, and time in seconds.

## Phase 2: Symptoms, targets and recovery

- Optional knee and lower-back symptom observations, including timing and explicit
  0–10 ratings. Missing is unrecorded; zero requires an explicit assessment.
- Structured numeric prescribed targets alongside the original free text.
- Optional session perceived effort, readiness and soreness.
- Workout/exercise notes and primary/secondary muscle information.
- Export the added observations with stable references and validation. Do not
  reconstruct missing historical observations or introduce excluded tracking.

## Phase 3: Optional additional observations

- Actual rest tracking and optional per-set RPE.
- Explicitly observed set completion timestamps, without introducing a set status field
  or treating record creation time as completion time.
- Optional tempo/technique observations, distance/band measurements and recovery/sleep data.
- Optional external activity references; external integrations remain unnecessary for
  Phases 1 and 2. This phase does not block either earlier phase.

Across all phases, preserve existing history, keep optional observations nonblocking,
and avoid inferred historical values or a new coaching/diagnosis engine.
