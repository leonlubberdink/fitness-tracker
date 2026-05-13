import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";

import { config } from "dotenv";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db, pool } from "../src/db/client";
import {
  exercises,
  users,
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
  workoutTemplateExercises,
  workoutTemplates,
} from "../src/db/schema";

config({
  path: ".env",
  override: true,
});

type ExerciseUnit = "kg" | "bodyweight";

type TemplateExerciseSeed = {
  category: string;
  defaultUnit: ExerciseUnit;
  name: string;
  progression: ExerciseProgression;
};

type TemplateSeed = {
  dayOffset: number;
  durationMinutes: number;
  name: string;
  startHour: number;
  startMinute: number;
  exercises: TemplateExerciseSeed[];
};

type ExerciseProgression =
  | {
      baseReps: number[];
      baseWeight: number;
      type: "kg";
      weeklyIncrement: number;
    }
  | {
      baseReps: number[];
      weightedBlockStartWeek: number;
      weightedStep: number;
      type: "bodyweight";
    };

type ExistingSessionSignature = {
  entryCount: number;
  firstExerciseName: string;
  performedOn: string;
};

const TOTAL_WEEKS = 12;
const DELOAD_WEEK_INDEXES = new Set([3, 7, 11]);

const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    dayOffset: 0,
    durationMinutes: 82,
    name: "Demo Push",
    startHour: 18,
    startMinute: 12,
    exercises: [
      {
        category: "Chest",
        defaultUnit: "kg",
        name: "Barbell Bench Press",
        progression: {
          baseReps: [8, 8, 7],
          baseWeight: 60,
          type: "kg",
          weeklyIncrement: 1.25,
        },
      },
      {
        category: "Chest",
        defaultUnit: "kg",
        name: "Incline Dumbbell Press",
        progression: {
          baseReps: [10, 9, 8],
          baseWeight: 22.5,
          type: "kg",
          weeklyIncrement: 1,
        },
      },
      {
        category: "Shoulders",
        defaultUnit: "kg",
        name: "Seated Overhead Press",
        progression: {
          baseReps: [8, 7, 6],
          baseWeight: 34,
          type: "kg",
          weeklyIncrement: 1,
        },
      },
      {
        category: "Shoulders",
        defaultUnit: "kg",
        name: "Cable Lateral Raise",
        progression: {
          baseReps: [14, 13, 12],
          baseWeight: 7.5,
          type: "kg",
          weeklyIncrement: 0.5,
        },
      },
      {
        category: "Triceps",
        defaultUnit: "kg",
        name: "Triceps Pushdown",
        progression: {
          baseReps: [12, 11, 10],
          baseWeight: 20,
          type: "kg",
          weeklyIncrement: 1,
        },
      },
    ],
  },
  {
    dayOffset: 2,
    durationMinutes: 78,
    name: "Demo Pull",
    startHour: 18,
    startMinute: 24,
    exercises: [
      {
        category: "Back",
        defaultUnit: "kg",
        name: "Barbell Row",
        progression: {
          baseReps: [8, 8, 7],
          baseWeight: 55,
          type: "kg",
          weeklyIncrement: 1.25,
        },
      },
      {
        category: "Back",
        defaultUnit: "bodyweight",
        name: "Pull-Up",
        progression: {
          baseReps: [6, 5, 4],
          type: "bodyweight",
          weightedBlockStartWeek: 8,
          weightedStep: 2.5,
        },
      },
      {
        category: "Back",
        defaultUnit: "kg",
        name: "Lat Pulldown",
        progression: {
          baseReps: [10, 10, 9],
          baseWeight: 45,
          type: "kg",
          weeklyIncrement: 2,
        },
      },
      {
        category: "Back",
        defaultUnit: "kg",
        name: "Seated Cable Row",
        progression: {
          baseReps: [12, 11, 10],
          baseWeight: 40,
          type: "kg",
          weeklyIncrement: 1.5,
        },
      },
      {
        category: "Biceps",
        defaultUnit: "kg",
        name: "Dumbbell Curl",
        progression: {
          baseReps: [12, 11, 10],
          baseWeight: 12.5,
          type: "kg",
          weeklyIncrement: 0.5,
        },
      },
      {
        category: "Rear Delts",
        defaultUnit: "kg",
        name: "Face Pull",
        progression: {
          baseReps: [15, 14, 13],
          baseWeight: 18,
          type: "kg",
          weeklyIncrement: 1,
        },
      },
    ],
  },
  {
    dayOffset: 4,
    durationMinutes: 86,
    name: "Demo Legs",
    startHour: 17,
    startMinute: 46,
    exercises: [
      {
        category: "Quads",
        defaultUnit: "kg",
        name: "Back Squat",
        progression: {
          baseReps: [6, 6, 5],
          baseWeight: 80,
          type: "kg",
          weeklyIncrement: 2.5,
        },
      },
      {
        category: "Hamstrings",
        defaultUnit: "kg",
        name: "Romanian Deadlift",
        progression: {
          baseReps: [8, 8, 7],
          baseWeight: 70,
          type: "kg",
          weeklyIncrement: 2,
        },
      },
      {
        category: "Quads",
        defaultUnit: "kg",
        name: "Leg Press",
        progression: {
          baseReps: [12, 12, 10],
          baseWeight: 140,
          type: "kg",
          weeklyIncrement: 5,
        },
      },
      {
        category: "Hamstrings",
        defaultUnit: "kg",
        name: "Seated Leg Curl",
        progression: {
          baseReps: [12, 11, 10],
          baseWeight: 35,
          type: "kg",
          weeklyIncrement: 1.5,
        },
      },
      {
        category: "Calves",
        defaultUnit: "kg",
        name: "Standing Calf Raise",
        progression: {
          baseReps: [15, 14, 13, 12],
          baseWeight: 40,
          type: "kg",
          weeklyIncrement: 2.5,
        },
      },
    ],
  },
];

function getStringArg(value: string | boolean | undefined, flagName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required --${flagName} argument.`);
  }

  return value.trim();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function roundToNearestHalf(value: number) {
  return Math.round(value * 2) / 2;
}

function padNumber(value: number) {
  return String(value).padStart(2, "0");
}

function toUtcDateOnly(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function addUtcDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function addUtcMinutes(value: Date, amount: number) {
  const next = new Date(value);
  next.setUTCMinutes(next.getUTCMinutes() + amount);
  return next;
}

function startOfUtcWeek(value: Date) {
  const day = value.getUTCDay();
  const difference = day === 0 ? -6 : 1 - day;
  return addUtcDays(value, difference);
}

function formatDateKey(value: Date) {
  return `${value.getUTCFullYear()}-${padNumber(value.getUTCMonth() + 1)}-${padNumber(value.getUTCDate())}`;
}

function createUtcDateAtTime(
  day: Date,
  hour: number,
  minute: number,
  minuteOffset = 0,
) {
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      hour,
      minute + minuteOffset,
      0,
      0,
    ),
  );
}

function getProgressStep(weekIndex: number) {
  return weekIndex - Math.floor((weekIndex + 1) / 4);
}

function getRepAdjustment(weekIndex: number, setIndex: number) {
  if (DELOAD_WEEK_INDEXES.has(weekIndex)) {
    return setIndex === 0 ? -1 : -2;
  }

  const phase = weekIndex % 4;

  if (phase === 1) {
    return setIndex === 0 ? 1 : 0;
  }

  if (phase === 2) {
    return setIndex === 1 ? 1 : 0;
  }

  return 0;
}

function getKgExerciseSets(
  progression: Extract<ExerciseProgression, { type: "kg" }>,
  weekIndex: number,
) {
  const progressStep = getProgressStep(weekIndex);
  const isDeloadWeek = DELOAD_WEEK_INDEXES.has(weekIndex);
  const baseWeight =
    progression.baseWeight + progressStep * progression.weeklyIncrement;
  const targetWeight = roundToNearestHalf(
    isDeloadWeek
      ? baseWeight - progression.weeklyIncrement * 0.75
      : baseWeight,
  );

  return progression.baseReps.map((baseReps, setIndex, baseRepsList) => {
    const adjustedReps = Math.max(4, baseReps + getRepAdjustment(weekIndex, setIndex));
    const setWeight =
      setIndex === baseRepsList.length - 1 && baseRepsList.length >= 4
        ? roundToNearestHalf(Math.max(0, targetWeight - 2.5))
        : targetWeight;

    return {
      reps: adjustedReps,
      weight: setWeight,
    };
  });
}

function getBodyweightExerciseSets(
  progression: Extract<ExerciseProgression, { type: "bodyweight" }>,
  weekIndex: number,
) {
  const progressStep = getProgressStep(weekIndex);
  const weightedStepCount = Math.max(
    0,
    Math.floor((weekIndex - progression.weightedBlockStartWeek) / 2) + 1,
  );
  const addedWeight =
    weekIndex < progression.weightedBlockStartWeek
      ? 0
      : roundToNearestHalf(weightedStepCount * progression.weightedStep);
  const weightedRepPenalty = addedWeight > 0 ? 1 : 0;

  return progression.baseReps.map((baseReps, setIndex) => {
    const repGrowth = Math.min(4, Math.floor((progressStep + setIndex) / 2));
    const deloadPenalty = DELOAD_WEEK_INDEXES.has(weekIndex)
      ? setIndex === 0
        ? 1
        : 2
      : 0;

    return {
      reps: Math.max(
        4,
        baseReps + repGrowth - weightedRepPenalty - deloadPenalty,
      ),
      weight: addedWeight,
    };
  });
}

function getExerciseSets(
  progression: ExerciseProgression,
  weekIndex: number,
): Array<{
  reps: number;
  weight: number;
}> {
  if (progression.type === "kg") {
    return getKgExerciseSets(progression, weekIndex);
  }

  return getBodyweightExerciseSets(progression, weekIndex);
}

function getTargetWorkoutDays() {
  const currentWeekStart = startOfUtcWeek(toUtcDateOnly(new Date()));
  const firstWeekStart = addUtcDays(currentWeekStart, -(TOTAL_WEEKS * 7));

  return Array.from({ length: TOTAL_WEEKS }, (_, weekIndex) => ({
    weekIndex,
    weekStart: addUtcDays(firstWeekStart, weekIndex * 7),
  }));
}

function buildExistingSessionSignature(session: ExistingSessionSignature) {
  return `${session.performedOn}|${session.firstExerciseName.toLowerCase()}|${session.entryCount}`;
}

async function getUserByEmail(email: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  return user ?? null;
}

async function ensureExercises(userId: string) {
  const allExercises = TEMPLATE_SEEDS.flatMap((template) => template.exercises);
  const exerciseNames = [...new Set(allExercises.map((exercise) => exercise.name))];
  const existingExercises = exerciseNames.length
    ? await db
        .select({
          id: exercises.id,
          name: exercises.name,
        })
        .from(exercises)
        .where(
          and(eq(exercises.userId, userId), inArray(exercises.name, exerciseNames)),
        )
    : [];
  const exerciseIdByName = new Map(
    existingExercises.map((exercise) => [exercise.name, exercise.id]),
  );
  let createdCount = 0;
  let updatedCount = 0;

  for (const exerciseSeed of allExercises) {
    const existingExerciseId = exerciseIdByName.get(exerciseSeed.name);

    if (!existingExerciseId) {
      const exerciseId = randomUUID();

      await db.insert(exercises).values({
        id: exerciseId,
        userId,
        name: exerciseSeed.name,
        category: exerciseSeed.category,
        defaultUnit: exerciseSeed.defaultUnit,
      });

      exerciseIdByName.set(exerciseSeed.name, exerciseId);
      createdCount += 1;
      continue;
    }

    await db
      .update(exercises)
      .set({
        category: exerciseSeed.category,
        defaultUnit: exerciseSeed.defaultUnit,
        updatedAt: new Date(),
      })
      .where(eq(exercises.id, existingExerciseId));

    updatedCount += 1;
  }

  return {
    createdCount,
    exerciseIdByName,
    updatedCount,
  };
}

async function ensureTemplates(
  userId: string,
  exerciseIdByName: Map<string, string>,
) {
  const templateNames = TEMPLATE_SEEDS.map((template) => template.name);
  const existingTemplates = await db
    .select({
      id: workoutTemplates.id,
      name: workoutTemplates.name,
    })
    .from(workoutTemplates)
    .where(
      and(
        eq(workoutTemplates.userId, userId),
        inArray(workoutTemplates.name, templateNames),
      ),
    );
  const existingTemplateIdByName = new Map(
    existingTemplates.map((template) => [template.name, template.id]),
  );
  let createdCount = 0;
  let updatedCount = 0;

  for (const templateSeed of TEMPLATE_SEEDS) {
    const existingTemplateId = existingTemplateIdByName.get(templateSeed.name);
    const templateId = existingTemplateId ?? randomUUID();

    if (!existingTemplateId) {
      await db.insert(workoutTemplates).values({
        id: templateId,
        userId,
        name: templateSeed.name,
      });
      createdCount += 1;
    } else {
      await db
        .update(workoutTemplates)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(workoutTemplates.id, existingTemplateId));
      await db
        .delete(workoutTemplateExercises)
        .where(eq(workoutTemplateExercises.workoutTemplateId, existingTemplateId));
      updatedCount += 1;
    }

    await db.insert(workoutTemplateExercises).values(
      templateSeed.exercises.map((exerciseSeed, index) => {
        const exerciseId = exerciseIdByName.get(exerciseSeed.name);

        if (!exerciseId) {
          throw new Error(`Exercise ${exerciseSeed.name} was not created.`);
        }

        return {
          id: randomUUID(),
          workoutTemplateId: templateId,
          exerciseId,
          sortOrder: index + 1,
        };
      }),
    );
  }

  return {
    createdCount,
    updatedCount,
  };
}

async function getExistingSessionSignatures(userId: string, startDate: string) {
  const rows = await db
    .select({
      sessionId: workoutSessions.id,
      performedOn: workoutSessions.performedOn,
      exerciseNameSnapshot: workoutExerciseEntries.exerciseNameSnapshot,
      sortOrder: workoutExerciseEntries.sortOrder,
    })
    .from(workoutExerciseEntries)
    .innerJoin(
      workoutSessions,
      eq(workoutExerciseEntries.workoutSessionId, workoutSessions.id),
    )
    .where(
      and(
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.performedOn} >= ${startDate}`,
        sql`${workoutSessions.completedAt} is not null`,
      ),
    )
    .orderBy(
      asc(workoutSessions.performedOn),
      asc(workoutSessions.startedAt),
      asc(workoutExerciseEntries.sortOrder),
    );

  const sessionMap = new Map<
    string,
    {
      entryCount: number;
      firstExerciseName: string;
      performedOn: string;
    }
  >();

  for (const row of rows) {
    const existingSession = sessionMap.get(row.sessionId);

    if (existingSession) {
      existingSession.entryCount += 1;
      continue;
    }

    sessionMap.set(row.sessionId, {
      entryCount: 1,
      firstExerciseName: row.exerciseNameSnapshot,
      performedOn: row.performedOn,
    });
  }

  return new Set(
    Array.from(sessionMap.values()).map((session) =>
      buildExistingSessionSignature(session),
    ),
  );
}

async function seedCompletedSessions(userId: string) {
  const targetWeeks = getTargetWorkoutDays();
  const startDate = formatDateKey(targetWeeks[0].weekStart);
  const existingSignatures = await getExistingSessionSignatures(userId, startDate);
  let createdSessionCount = 0;
  let skippedSessionCount = 0;

  for (const { weekIndex, weekStart } of targetWeeks) {
    for (const templateSeed of TEMPLATE_SEEDS) {
      const workoutDay = addUtcDays(weekStart, templateSeed.dayOffset);
      const performedOn = formatDateKey(workoutDay);
      const signature = buildExistingSessionSignature({
        entryCount: templateSeed.exercises.length,
        firstExerciseName: templateSeed.exercises[0].name,
        performedOn,
      });

      if (existingSignatures.has(signature)) {
        skippedSessionCount += 1;
        continue;
      }

      const sessionId = randomUUID();
      const minuteVariation = (weekIndex % 3) * 4;
      const startedAt = createUtcDateAtTime(
        workoutDay,
        templateSeed.startHour,
        templateSeed.startMinute,
        minuteVariation,
      );
      const completedAt = addUtcMinutes(startedAt, templateSeed.durationMinutes);

      await db.insert(workoutSessions).values({
        id: sessionId,
        userId,
        performedOn,
        startedAt,
        completedAt,
        activeEntrySortOrder: null,
        createdAt: startedAt,
        updatedAt: completedAt,
      });

      for (const [exerciseIndex, exerciseSeed] of templateSeed.exercises.entries()) {
        const entryId = randomUUID();
        const entryCreatedAt = addUtcMinutes(startedAt, exerciseIndex * 11);

        await db.insert(workoutExerciseEntries).values({
          id: entryId,
          workoutSessionId: sessionId,
          exerciseId: null,
          exerciseNameSnapshot: exerciseSeed.name,
          exerciseCategorySnapshot: exerciseSeed.category,
          unitSnapshot: exerciseSeed.defaultUnit,
          sortOrder: exerciseIndex + 1,
          createdAt: entryCreatedAt,
        });

        const sets = getExerciseSets(exerciseSeed.progression, weekIndex);

        await db.insert(workoutSets).values(
          sets.map((set, setIndex) => ({
            id: randomUUID(),
            workoutExerciseEntryId: entryId,
            setNumber: setIndex + 1,
            reps: set.reps,
            weight: set.weight,
            createdAt: addUtcMinutes(entryCreatedAt, setIndex * 3),
          })),
        );
      }

      existingSignatures.add(signature);
      createdSessionCount += 1;
    }
  }

  return {
    createdSessionCount,
    skippedSessionCount,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: {
        type: "string",
      },
    },
    strict: true,
  });
  const email = normalizeEmail(getStringArg(values.email, "email"));
  const user = await getUserByEmail(email);

  if (!user) {
    throw new Error(`User ${email} does not exist. Seed a login user first.`);
  }

  const { createdCount: createdExercises, exerciseIdByName, updatedCount: updatedExercises } =
    await ensureExercises(user.id);
  const { createdCount: createdTemplates, updatedCount: updatedTemplates } =
    await ensureTemplates(user.id, exerciseIdByName);
  const { createdSessionCount, skippedSessionCount } =
    await seedCompletedSessions(user.id);

  console.log(`Seeded demo statistics data for ${user.email}`);
  console.log(`Exercises: ${createdExercises} created, ${updatedExercises} updated`);
  console.log(`Templates: ${createdTemplates} created, ${updatedTemplates} updated`);
  console.log(
    `Completed workouts: ${createdSessionCount} created, ${skippedSessionCount} skipped because matching sessions already exist`,
  );
}

void (async () => {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Seed statistics demo failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
