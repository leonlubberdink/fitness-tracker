import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildExerciseOptions,
  buildExerciseProgression,
  getStatisticsPageDataFromSessions,
  getStatisticsWindow,
  type StatisticsSession,
} from "@/features/statistics/core";

const benchExerciseId = "11111111-1111-4111-8111-111111111111";
const pullExerciseId = "22222222-2222-4222-8222-222222222222";

function createRecord(
  sessionId: string,
  {
    entryId,
    exerciseId,
    exerciseNameSnapshot,
    exerciseCategorySnapshot,
    performedOn,
    reps,
    setId,
    setNumber,
    sessionBodyweightKg = null,
    unitSnapshot,
    weight,
  }: {
    entryId: string;
    exerciseId: string | null;
    exerciseNameSnapshot: string;
    exerciseCategorySnapshot: string;
    performedOn: string;
    reps: number;
    setId: string;
    setNumber: number;
    sessionBodyweightKg?: number | null;
    unitSnapshot: "bodyweight" | "kg" | "time";
    weight: number;
  },
) {
  return {
    completedAt: new Date(`${performedOn}T10:00:00.000Z`),
    entryId,
    exerciseCategorySnapshot,
    exerciseId,
    exerciseNameSnapshot,
    performedOn,
    reps,
    sessionId,
    setId,
    setNumber,
    sortOrder: 1,
    sessionBodyweightKg,
    startedAt: new Date(`${performedOn}T09:00:00.000Z`),
    unitSnapshot,
    weight,
  };
}

function createSession(
  sessionId: string,
  performedOn: string,
  records: StatisticsSession["records"],
  bodyweightKg: number | null = null,
): StatisticsSession {
  return {
    bodyweightKg,
    completedAt: new Date(`${performedOn}T10:00:00.000Z`),
    performedOn,
    records,
    sessionId,
    startedAt: new Date(`${performedOn}T09:00:00.000Z`),
  };
}

describe("statistics core", () => {
  it("counts recorded working sets separately and excludes warm-ups", () => {
    const base = createRecord("session-1", {
      entryId: "entry-1",
      exerciseId: benchExerciseId,
      exerciseNameSnapshot: "Press",
      exerciseCategorySnapshot: "Push",
      performedOn: "2025-03-01",
      reps: 10,
      setId: "set-1",
      setNumber: 1,
      unitSnapshot: "kg",
      weight: 20,
    });
    const session = createSession("session-1", "2025-03-01", [
      { ...base, setId: "working", setType: "working" },
      { ...base, setId: "warmup", setType: "warmup" },
      { ...base, setId: "legacy", setType: null },
    ]);
    const result = getStatisticsPageDataFromSessions([session], {
      range: "all",
      exerciseKey: benchExerciseId,
    });
    expect(result.summary.sets.value).toBe(2);
    expect(result.summary.workingSets?.value).toBe(1);
    expect(result.summary.unclassifiedSets?.value).toBe(1);
    expect(result.summary.volumeKg.value).toBe(400);
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the correct date windows for rolling and all-time ranges", () => {
    expect(getStatisticsWindow("30d")).toEqual({
      comparisonLabel: "vs previous 30 days",
      end: "2025-03-15",
      label: "Last 30 days",
      previousEnd: "2025-02-13",
      previousStart: "2025-01-15",
      start: "2025-02-14",
    });
    expect(getStatisticsWindow("12w")).toEqual({
      comparisonLabel: "vs previous 12 weeks",
      end: "2025-03-15",
      label: "Last 12 weeks",
      previousEnd: "2024-12-21",
      previousStart: "2024-09-29",
      start: "2024-12-22",
    });
    expect(getStatisticsWindow("all")).toEqual({
      comparisonLabel: null,
      end: "2025-03-15",
      label: "All time",
      previousEnd: null,
      previousStart: null,
      start: null,
    });
  });

  it("builds summary, trend, options, and progression for current sessions", () => {
    const sessions = [
      createSession("session-prev", "2025-02-10", [
        createRecord("session-prev", {
          entryId: "entry-1",
          exerciseId: benchExerciseId,
          exerciseNameSnapshot: "Bench Press",
          exerciseCategorySnapshot: "Push",
          performedOn: "2025-02-10",
          reps: 5,
          setId: "set-1",
          setNumber: 1,
          unitSnapshot: "kg",
          weight: 80,
        }),
      ]),
      createSession("session-current-1", "2025-02-20", [
        createRecord("session-current-1", {
          entryId: "entry-2",
          exerciseId: benchExerciseId,
          exerciseNameSnapshot: "Bench Press",
          exerciseCategorySnapshot: "Push",
          performedOn: "2025-02-20",
          reps: 5,
          setId: "set-2",
          setNumber: 1,
          unitSnapshot: "kg",
          weight: 90,
        }),
        createRecord("session-current-1", {
          entryId: "entry-2",
          exerciseId: benchExerciseId,
          exerciseNameSnapshot: "Bench Press",
          exerciseCategorySnapshot: "Push",
          performedOn: "2025-02-20",
          reps: 3,
          setId: "set-3",
          setNumber: 2,
          unitSnapshot: "kg",
          weight: 100,
        }),
      ]),
      createSession(
        "session-current-2",
        "2025-03-01",
        [
          createRecord("session-current-2", {
            entryId: "entry-3",
            exerciseId: benchExerciseId,
            exerciseNameSnapshot: "Bench Press",
            exerciseCategorySnapshot: "Push",
            performedOn: "2025-03-01",
            reps: 6,
            setId: "set-4",
            setNumber: 1,
            unitSnapshot: "kg",
            weight: 95,
          }),
          createRecord("session-current-2", {
            entryId: "entry-4",
            exerciseId: pullExerciseId,
            exerciseNameSnapshot: "Pull Up",
            exerciseCategorySnapshot: "Pull",
            performedOn: "2025-03-01",
            reps: 10,
            setId: "set-5",
            setNumber: 1,
            sessionBodyweightKg: 80,
            unitSnapshot: "bodyweight",
            weight: 5,
          }),
        ],
        80,
      ),
    ];

    const result = getStatisticsPageDataFromSessions(sessions, {
      exerciseKey: benchExerciseId,
      range: "30d",
    });

    expect(result.hasCompletedWorkouts).toBe(true);
    expect(result.summary.label).toBe("Last 30 days");
    expect(result.summary.workouts).toEqual({
      delta: {
        comparisonLabel: "vs previous 30 days",
        currentValue: 2,
        previousValue: 1,
        value: 1,
      },
      value: 2,
    });
    expect(result.summary.sets.value).toBe(4);
    expect(result.summary.volumeKg.value).toBe(2170);
    expect(result.exerciseOptions).toEqual([
      {
        category: "Push",
        key: benchExerciseId,
        label: "Bench Press",
        sessionCount: 2,
        unit: "kg",
      },
      {
        category: "Pull",
        key: pullExerciseId,
        label: "Pull Up",
        sessionCount: 1,
        unit: "bodyweight",
      },
    ]);
    expect(result.selectedExercise).toEqual({
      category: "Push",
      chartHelpText:
        "Line shows the heaviest logged set in each finished workout.",
      chartMetric: "load",
      chartMetricLabel: "Best load",
      details: [
        {
          bestSetLabel: "95 kg · 6 reps",
          chartValue: 95,
          performedOn: "2025-03-01",
          sessionId: "session-current-2",
          totalSets: 1,
          volumeKg: 570,
        },
        {
          bestSetLabel: "100 kg · 3 reps",
          chartValue: 100,
          performedOn: "2025-02-20",
          sessionId: "session-current-1",
          totalSets: 2,
          volumeKg: 750,
        },
      ],
      exerciseKey: benchExerciseId,
      exerciseLabel: "Bench Press",
      points: [
        {
          performedOn: "2025-02-20",
          sessionId: "session-current-1",
          shortLabel: "20 Feb",
          tooltipLabel: "20 Feb · 100 kg · 3 reps",
          value: 100,
        },
        {
          performedOn: "2025-03-01",
          sessionId: "session-current-2",
          shortLabel: "1 Mar",
          tooltipLabel: "1 Mar · 95 kg · 6 reps",
          value: 95,
        },
      ],
      unit: "kg",
    });
    expect(result.bodyweightTrend).toEqual([
      {
        bodyweightKg: 80,
        performedOn: "2025-03-01",
        sessionId: "session-current-2",
        shortLabel: "1 Mar",
      },
    ]);
    expect(result.weeklyTrend.some((point) => point.volumeKg === 750)).toBe(
      true,
    );
    expect(result.weeklyTrend.some((point) => point.volumeKg === 1420)).toBe(
      true,
    );
  });

  it("builds progression for time and bodyweight exercises and supports snapshot keys", () => {
    const bodyweightSessions = [
      createSession(
        "session-bw",
        "2025-03-10",
        [
          createRecord("session-bw", {
            entryId: "entry-bw",
            exerciseId: null,
            exerciseNameSnapshot: " Pull Up ",
            exerciseCategorySnapshot: "Pull",
            performedOn: "2025-03-10",
            reps: 12,
            setId: "set-bw",
            setNumber: 1,
            sessionBodyweightKg: 80,
            unitSnapshot: "bodyweight",
            weight: 5,
          }),
        ],
        80,
      ),
    ];
    const timeSessions = [
      createSession("session-time", "2025-03-12", [
        createRecord("session-time", {
          entryId: "entry-time",
          exerciseId: "55555555-5555-4555-8555-555555555555",
          exerciseNameSnapshot: "Plank",
          exerciseCategorySnapshot: "Core",
          performedOn: "2025-03-12",
          reps: 1,
          setId: "set-time",
          setNumber: 1,
          unitSnapshot: "time",
          weight: 90,
        }),
      ]),
    ];

    expect(buildExerciseOptions(bodyweightSessions)).toEqual([
      {
        category: "Pull",
        key: "snapshot:pull up",
        label: " Pull Up ",
        sessionCount: 1,
        unit: "bodyweight",
      },
    ]);
    expect(
      buildExerciseProgression(bodyweightSessions, "snapshot:pull up"),
    ).toMatchObject({
      chartMetric: "load",
      chartMetricLabel: "Best effective load",
      details: [
        {
          bestSetLabel: "85 kg total (+5 BW) · 12 reps",
          chartValue: 85,
          volumeKg: 1020,
        },
      ],
    });
    expect(
      buildExerciseProgression(
        timeSessions,
        "55555555-5555-4555-8555-555555555555",
      ),
    ).toMatchObject({
      chartMetric: "duration",
      chartMetricLabel: "Longest duration",
      details: [
        {
          bestSetLabel: "1 reps · 90 sec",
          chartValue: 90,
          volumeKg: null,
        },
      ],
    });
  });

  it("returns safe empty states when no sessions or no matching exercise exist", () => {
    expect(
      getStatisticsPageDataFromSessions([], {
        exerciseKey: benchExerciseId,
        range: "all",
      }),
    ).toEqual({
      bodyweightTrend: [],
      exerciseOptions: [],
      hasCompletedWorkouts: false,
      selectedExercise: null,
      summary: {
        label: "All time",
        sets: {
          delta: null,
          value: 0,
        },
        workingSets: {
          delta: null,
          value: 0,
        },
        unclassifiedSets: {
          delta: null,
          value: 0,
        },
        volumeKg: {
          delta: null,
          value: 0,
        },
        workouts: {
          delta: null,
          value: 0,
        },
      },
      weeklyTrend: [],
    });
    expect(
      getStatisticsPageDataFromSessions(
        [
          createSession("session-1", "2025-03-10", [
            createRecord("session-1", {
              entryId: "entry-1",
              exerciseId: benchExerciseId,
              exerciseNameSnapshot: "Bench Press",
              exerciseCategorySnapshot: "Push",
              performedOn: "2025-03-10",
              reps: 5,
              setId: "set-1",
              setNumber: 1,
              unitSnapshot: "kg",
              weight: 100,
            }),
          ]),
        ],
        {
          exerciseKey: "missing",
          range: "all",
        },
      ).selectedExercise,
    ).toBeNull();
  });

  it("keeps legacy bodyweight sessions out of new load metrics", () => {
    const legacyBodyweightSession = createSession(
      "session-legacy",
      "2025-03-10",
      [
        createRecord("session-legacy", {
          entryId: "entry-legacy",
          exerciseId: null,
          exerciseNameSnapshot: "Pull Up",
          exerciseCategorySnapshot: "Pull",
          performedOn: "2025-03-10",
          reps: 10,
          setId: "set-legacy",
          setNumber: 1,
          unitSnapshot: "bodyweight",
          weight: 5,
        }),
      ],
    );

    const result = getStatisticsPageDataFromSessions(
      [legacyBodyweightSession],
      {
        exerciseKey: null,
        range: "all",
      },
    );

    expect(result.hasCompletedWorkouts).toBe(true);
    expect(result.summary.volumeKg.value).toBe(0);
    expect(result.exerciseOptions).toEqual([]);
    expect(result.bodyweightTrend).toEqual([]);
  });
});
