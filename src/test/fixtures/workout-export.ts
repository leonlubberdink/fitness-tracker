import type { ExportSource } from "@/features/workouts/export";

export const syntheticId = (value: number) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const instant = new Date("2026-10-26T17:00:00.000Z");

export function makeExportSource(sessionCount = 2): ExportSource {
  const source: ExportSource = {
    exercises: [
      {
        id: syntheticId(1),
        userId: syntheticId(2),
        name: "Synthetic dumbbell press",
        category: "Chest",
        defaultUnit: "kg",
        createdAt: instant,
        updatedAt: instant,
      },
    ],
    sessions: [],
    entries: [],
    sets: [],
    skipped: [],
  };
  for (let i = 0; i < sessionCount; i++) {
    const date = new Date(instant.getTime() + i * 86400000);
    const ended = new Date(date.getTime() + 3600000);
    const legacy = i === 0;
    const sessionId = syntheticId(100 + i);
    const entryId = syntheticId(1000 + i);
    source.sessions.push({
      id: sessionId,
      userId: syntheticId(2),
      planId: null,
      planWorkoutId: null,
      workoutTemplateId: null,
      performedOn: date.toISOString().slice(0, 10),
      bodyweightKg: 78,
      startedAt: date,
      completedAt: ended,
      endedAt: legacy ? null : ended,
      status: legacy ? null : "completed",
      activeEntrySortOrder: null,
      createdAt: date,
      updatedAt: ended,
    });
    source.entries.push({
      id: entryId,
      workoutSessionId: sessionId,
      exerciseId: syntheticId(1),
      exerciseIdSnapshot: legacy ? null : syntheticId(1),
      exerciseNameSnapshot: "Synthetic press at time of workout",
      exerciseCategorySnapshot: "Chest",
      unitSnapshot: "kg",
      setsRepsSnapshot: "3 x 8-12",
      restTimeSnapshot: "90 seconds",
      notesSnapshot: "Synthetic prescription",
      status: null,
      nextLoadRecommendation: "keep",
      sortOrder: 1,
      createdAt: date,
    });
    for (let j = 0; j < 5; j++) {
      source.sets.push({
        id: syntheticId(10000 + i * 10 + j),
        workoutExerciseEntryId: entryId,
        setNumber: j + 1,
        reps: 10,
        weight: j < 2 ? 10 : 20,
        rir: legacy || j < 2 ? null : j === 2 ? 0 : 3,
        setType: legacy ? null : j < 2 ? "warmup" : "working",
        repsBasis: legacy ? null : "total",
        createdAt: date,
      });
    }
  }
  source.skipped.push({
    id: syntheticId(90000),
    planId: syntheticId(90001),
    workoutTemplateId: syntheticId(90002),
    state: "skipped",
    weekNumber: 1,
    weekday: 3,
    linkedWorkoutSessionId: null,
    skippedAt: new Date("2026-10-28T17:00:00Z"),
    skippedPrescriptionSnapshot: null,
    completedAt: null,
    createdAt: instant,
    updatedAt: instant,
    planStartDate: "2026-10-26",
  });
  return source;
}
