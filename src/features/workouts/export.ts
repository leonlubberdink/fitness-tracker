import type {
  exercises,
  planWorkouts,
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { plannedExerciseSnapshotSchema } from "@/lib/training-metadata";
import type { ExerciseUnit } from "@/lib/exercise-units";
import { getPlanWorkoutScheduledDate } from "@/features/plans/utils";
import {
  WORKOUT_EXPORT_VERSION,
  workoutExportSchema,
  type ExportRange,
  type WorkoutExport,
} from "./export-schema";

export type ExportSource = {
  exercises: (typeof exercises.$inferSelect)[];
  sessions: (typeof workoutSessions.$inferSelect)[];
  entries: (typeof workoutExerciseEntries.$inferSelect)[];
  sets: (typeof workoutSets.$inferSelect)[];
  skipped: (typeof planWorkouts.$inferSelect & {
    planStartDate: string | null;
  })[];
};

export function interpretRecordedLoad(
  unit: ExerciseUnit,
  weight: number | null,
): WorkoutExport["sessions"][number]["exercise_entries"][number]["sets"][number]["load"] {
  if (unit === "time" || weight === null) return null;
  if (unit === "bodyweight") {
    return {
      kind: "bodyweight",
      basis: "bodyweight_modifier",
      value_kg: null,
      added_kg: Math.max(0, weight),
      assistance_kg: Math.max(0, -weight),
    };
  }
  return {
    kind: "unknown",
    basis: "unknown",
    value_kg: weight,
    added_kg: null,
    assistance_kg: null,
  };
}

type CountableSet = {
  set_type: string | null;
  raw: { reps: number | null; weight: number | null };
};
export function countExportSets(sets: CountableSet[]) {
  return {
    working_sets: sets.filter(
      (set) =>
        set.set_type === "working" &&
        set.raw.reps !== null &&
        set.raw.weight !== null,
    ).length,
    warmup_sets: sets.filter(
      (set) =>
        set.set_type === "warmup" &&
        set.raw.reps !== null &&
        set.raw.weight !== null,
    ).length,
    unclassified_sets: sets.filter((set) => set.set_type === null).length,
  };
}

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function inRange(date: string, range: ExportRange) {
  return (
    (!range.start || date >= range.start) && (!range.end || date <= range.end)
  );
}
function groupBy<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const group = groups.get(id) ?? [];
    group.push(row);
    groups.set(id, group);
  }
  return groups;
}

export function buildWorkoutExport(
  source: ExportSource,
  options: {
    timeZone: string;
    appVersion: string;
    range: ExportRange;
    exportedAt?: Date;
  },
): WorkoutExport {
  const { range } = options;
  const entriesBySession = groupBy(
    source.entries,
    (entry) => entry.workoutSessionId,
  );
  const setsByEntry = groupBy(source.sets, (set) => set.workoutExerciseEntryId);
  const catalog: WorkoutExport["exercise_catalog"] = source.exercises.map(
    (exercise) => ({
      id: exercise.id,
      source: "catalog",
      name: exercise.name,
      category: exercise.category,
      default_unit: exercise.defaultUnit,
    }),
  );
  const catalogIds = new Set(catalog.map((exercise) => exercise.id));
  const sessions = source.sessions
    .filter((session) => inRange(session.performedOn, range))
    .sort(
      (a, b) =>
        compareText(a.performedOn, b.performedOn) ||
        a.startedAt.getTime() - b.startedAt.getTime() ||
        compareText(a.id, b.id),
    )
    .map((session) => {
      const entries = (entriesBySession.get(session.id) ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder || compareText(a.id, b.id))
        .map((entry) => {
          const exerciseId =
            entry.exerciseId ??
            entry.exerciseIdSnapshot ??
            `snapshot:${entry.id}`;
          if (!catalogIds.has(exerciseId)) {
            catalog.push({
              id: exerciseId,
              source: "entry_snapshot",
              name: entry.exerciseNameSnapshot,
              category: entry.exerciseCategorySnapshot,
              default_unit: entry.unitSnapshot,
            });
            catalogIds.add(exerciseId);
          }
          const sets = (setsByEntry.get(entry.id) ?? [])
            .sort(
              (a, b) => a.setNumber - b.setNumber || compareText(a.id, b.id),
            )
            .map((set) => ({
              id: set.id,
              sequence: set.setNumber,
              raw: {
                reps: set.reps,
                weight: set.weight,
                unit: entry.unitSnapshot,
              },
              reps: entry.unitSnapshot === "time" ? null : set.reps,
              duration_s: entry.unitSnapshot === "time" ? set.weight : null,
              load: interpretRecordedLoad(entry.unitSnapshot, set.weight),
              rir: set.rir,
              set_type: set.setType,
              reps_basis: set.repsBasis,
              created_at: set.createdAt.toISOString(),
            }));
          return {
            id: entry.id,
            exercise_id: exerciseId,
            source_exercise_id: entry.exerciseId,
            exercise_id_snapshot: entry.exerciseIdSnapshot,
            order: entry.sortOrder,
            exercise_name_snapshot: entry.exerciseNameSnapshot,
            exercise_category_snapshot: entry.exerciseCategorySnapshot,
            unit: entry.unitSnapshot,
            status: entry.status,
            prescription_snapshot: {
              sets_reps: entry.setsRepsSnapshot,
              rest_time: entry.restTimeSnapshot,
              notes: entry.notesSnapshot,
            },
            next_load_recommendation: entry.nextLoadRecommendation,
            created_at: entry.createdAt.toISOString(),
            counts: countExportSets(sets),
            sets,
          };
        });
      return {
        id: session.id,
        performed_on: session.performedOn,
        started_at: session.startedAt.toISOString(),
        completed_at: session.completedAt?.toISOString() ?? null,
        ended_at:
          (session.endedAt ?? session.completedAt)?.toISOString() ?? null,
        created_at: session.createdAt.toISOString(),
        updated_at: session.updatedAt.toISOString(),
        status:
          session.status ??
          (session.completedAt ? ("completed" as const) : null),
        status_source: session.status
          ? ("recorded" as const)
          : session.completedAt
            ? ("derived_from_completed_at" as const)
            : ("unknown" as const),
        plan_id: session.planId,
        plan_workout_id: session.planWorkoutId,
        workout_template_id: session.workoutTemplateId,
        body_mass_kg: session.bodyweightKg,
        counts: countExportSets(entries.flatMap((entry) => entry.sets)),
        exercise_entries: entries,
      };
    });
  // A linked performed record takes precedence over a separately stored skip.
  const representedPlanWorkouts = new Set(
    source.sessions.map((session) => session.planWorkoutId).filter(Boolean),
  );
  let undatedSkippedExcluded = 0;
  const skipped: WorkoutExport["skipped_planned_workouts"] = [];
  for (const row of source.skipped) {
    if (representedPlanWorkouts.has(row.id)) continue;
    const date = row.planStartDate
      ? getPlanWorkoutScheduledDate(
          row.planStartDate,
          row.weekNumber,
          row.weekday,
        )
      : null;
    if ((range.start || range.end) && date === null) {
      undatedSkippedExcluded++;
      continue;
    }
    if (date && !inRange(date, range)) continue;
    skipped.push({
      id: row.id,
      status: "skipped",
      plan_id: row.planId,
      workout_template_id: row.workoutTemplateId,
      scheduled_on: date,
      skipped_at: row.skippedAt?.toISOString() ?? null,
      prescription_snapshot:
        row.skippedPrescriptionSnapshot?.map((entry) =>
          plannedExerciseSnapshotSchema.strip().parse(entry),
        ) ?? null,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    });
  }
  skipped.sort(
    (a, b) =>
      compareText(a.scheduled_on ?? "", b.scheduled_on ?? "") ||
      compareText(a.id, b.id),
  );
  const dates = [
    ...sessions.map((session) => session.performed_on),
    ...skipped.flatMap((row) => (row.scheduled_on ? [row.scheduled_on] : [])),
  ].sort(compareText);
  const result = workoutExportSchema.parse({
    schema_version: WORKOUT_EXPORT_VERSION,
    exported_at: (options.exportedAt ?? new Date()).toISOString(),
    time_zone: options.timeZone,
    source_app: { name: "fitness-app", version: options.appVersion },
    coverage: {
      start_date: dates[0] ?? null,
      end_date: dates.at(-1) ?? null,
      requested_start_date: range.start ?? null,
      requested_end_date: range.end ?? null,
      scope: range.start || range.end ? "date_range" : "all_available_history",
      includes_skipped_sessions: true,
      session_count: sessions.length,
      set_count: sessions.reduce(
        (n, session) =>
          n +
          session.exercise_entries.reduce(
            (m, entry) => m + entry.sets.length,
            0,
          ),
        0,
      ),
      skipped_planned_workout_count: skipped.length,
      undated_skipped_workouts_excluded: undatedSkippedExcluded,
    },
    interpretation_notes: [
      "All unknown values are null. No missing historical RIR, set type, workout outcome or symptom score is inferred.",
      "raw preserves the recorded reps, weight and unit. For time, raw.weight is duration in seconds. Set created_at is record creation, not set completion.",
      "Session completed status and ended_at may be derived from completed_at; status_source identifies the legacy derivation. Legacy open-session outcome remains unknown.",
      "time_zone is the current user preference, not a historical session timezone. Timestamps are true instants exported in UTC; performed_on remains the stored calendar date.",
      "Equipment metadata, set status and side are outside the product scope and are not collected or exported. kg values retain their recorded amount without an equipment-specific interpretation.",
      "Bodyweight is separate. Positive raw modifiers are added kg, negative modifiers are nonnegative assistance kg. Less assistance means a harder set.",
      "Skipped planned workouts are separate from performed sessions and contain no performed sets. Date filtering uses scheduled_on; undated skips are included only in all-history exports.",
      "Coverage bounds describe returned dated records; requested bounds describe the selection. includes_skipped_sessions means skipped planned records were queried, even when none exist.",
      "Missing historical exercises cannot be reconstructed as skipped. Deleted exercises retain their saved exercise ID where available; otherwise the catalog fallback is snapshot:<entry ID>.",
      "Prescription snapshots are planned text. next_load_recommendation is app advice, not proof of readiness. Working-set counts use the recorded set type, without a set completion classification.",
    ],
    exercise_catalog: catalog.sort((a, b) => compareText(a.id, b.id)),
    sessions,
    skipped_planned_workouts: skipped,
  });
  validateExportConsistency(result);
  return result;
}

export function validateExportConsistency(document: WorkoutExport) {
  const range = {
    start: document.coverage.requested_start_date ?? undefined,
    end: document.coverage.requested_end_date ?? undefined,
  };
  const ids = new Set<string>();
  const claim = (id: string) => {
    if (ids.has(id)) throw new Error("Duplicate export entity ID.");
    ids.add(id);
  };
  const catalog = new Set<string>();
  for (const exercise of document.exercise_catalog) {
    if (catalog.has(exercise.id))
      throw new Error("Duplicate exercise catalog ID.");
    catalog.add(exercise.id);
  }
  let setCount = 0;
  let previousSession: WorkoutExport["sessions"][number] | undefined;
  for (const session of document.sessions) {
    claim(session.id);
    if (
      previousSession &&
      (session.performed_on < previousSession.performed_on ||
        (session.performed_on === previousSession.performed_on &&
          (Date.parse(session.started_at) <
            Date.parse(previousSession.started_at) ||
            (Date.parse(session.started_at) ===
              Date.parse(previousSession.started_at) &&
              session.id < previousSession.id))))
    )
      throw new Error("Sessions are not chronological.");
    previousSession = session;
    if (!inRange(session.performed_on, range))
      throw new Error("Session outside export selection.");
    if ((session.status === "completed") !== (session.completed_at !== null))
      throw new Error("Session completion state is inconsistent.");
    if (session.status === "in_progress" && session.ended_at !== null)
      throw new Error("An active session cannot have an end timestamp.");
    if (
      session.status !== null &&
      session.status !== "in_progress" &&
      session.ended_at === null
    )
      throw new Error("A closed session must have an end timestamp.");
    let order = 0;
    for (const entry of session.exercise_entries) {
      claim(entry.id);
      if (!catalog.has(entry.exercise_id))
        throw new Error("Missing catalog reference.");
      if (entry.order <= order)
        throw new Error("Exercise order is inconsistent.");
      order = entry.order;
      let sequence = 0;
      for (const set of entry.sets) {
        claim(set.id);
        if (set.sequence <= sequence)
          throw new Error("Set order is inconsistent.");
        sequence = set.sequence;
        if (
          set.raw.unit !== entry.unit ||
          set.reps !== (entry.unit === "time" ? null : set.raw.reps) ||
          set.duration_s !== (entry.unit === "time" ? set.raw.weight : null) ||
          JSON.stringify(set.load) !==
            JSON.stringify(interpretRecordedLoad(entry.unit, set.raw.weight))
        )
          throw new Error(
            "Recorded and interpreted measurements are inconsistent.",
          );
        setCount++;
      }
      if (
        JSON.stringify(entry.counts) !==
        JSON.stringify(countExportSets(entry.sets))
      )
        throw new Error("Entry counts are inconsistent.");
    }
    if (
      JSON.stringify(session.counts) !==
      JSON.stringify(
        countExportSets(
          session.exercise_entries.flatMap((entry) => entry.sets),
        ),
      )
    )
      throw new Error("Session counts are inconsistent.");
  }
  const planWorkoutIds = new Set(
    document.sessions.map((session) => session.plan_workout_id),
  );
  for (const skip of document.skipped_planned_workouts) {
    claim(skip.id);
    if (planWorkoutIds.has(skip.id))
      throw new Error("Planned workout is counted twice.");
    if (skip.scheduled_on === null && (range.start || range.end))
      throw new Error("Undated skipped workout is outside a date selection.");
    if (skip.scheduled_on !== null && !inRange(skip.scheduled_on, range))
      throw new Error("Skipped workout is outside export selection.");
    const snapshotIds = new Set<string>();
    let order = 0;
    for (const entry of skip.prescription_snapshot ?? []) {
      if (snapshotIds.has(entry.id) || entry.order <= order)
        throw new Error("Skipped prescription order or IDs are inconsistent.");
      snapshotIds.add(entry.id);
      order = entry.order;
    }
  }
  if (
    document.coverage.session_count !== document.sessions.length ||
    document.coverage.set_count !== setCount ||
    document.coverage.skipped_planned_workout_count !==
      document.skipped_planned_workouts.length
  )
    throw new Error("Coverage counts are inconsistent.");
  const dates = [
    ...document.sessions.map((session) => session.performed_on),
    ...document.skipped_planned_workouts.flatMap((skip) =>
      skip.scheduled_on ? [skip.scheduled_on] : [],
    ),
  ].sort(compareText);
  if (
    document.coverage.start_date !== (dates[0] ?? null) ||
    document.coverage.end_date !== (dates.at(-1) ?? null)
  )
    throw new Error("Coverage dates are inconsistent.");
}
