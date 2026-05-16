import { randomUUID } from "node:crypto";

import OpenAI from "openai";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type {
  ResponseCreateParamsNonStreaming,
  ResponseInputItem,
  Tool,
} from "openai/resources/responses/responses";

import { db } from "@/db/client";
import {
  healthCoachConversations,
  healthCoachMessages,
  healthCoachToolEvents,
  workoutExerciseEntries,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { getExercisesForUser } from "@/features/exercises/queries";
import { getPlanByIdForUser, getPlansPageData } from "@/features/plans/queries";
import { getStatisticsPageData } from "@/features/statistics/queries";
import { getWorkoutTemplatesForUser } from "@/features/workout-templates/queries";
import { getCompletedWorkoutHistoryForUser } from "@/features/workouts/queries";
import { formatDateForDisplay, getTodayDateKey } from "@/lib/date";
import { logError, logInfo, logWarn } from "@/lib/logger";

import {
  createExerciseCreateProposal,
  createExerciseUpdateProposal,
  createPlanCreateProposal,
  createPlanUpdateProposal,
  createPlanWorkoutUpsertProposal,
  createWorkoutTemplateCreateProposal,
  createWorkoutTemplateUpdateProposal,
} from "./proposals";
import { getHealthCoachPageData } from "./queries";

type HealthCoachCitation = {
  endIndex: number;
  startIndex: number;
  title: string | null;
  url: string;
};

type HealthCoachFunctionCall = {
  arguments: string;
  callId: string;
  name: string;
};

const HEALTH_COACH_MODEL = process.env.HEALTH_COACH_MODEL?.trim() || "gpt-5";
const MAX_TOOL_ROUNDS = 6;
const NULLABLE_STRING_SCHEMA = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;
const NULLABLE_DURATION_WEEKS_SCHEMA = {
  anyOf: [
    {
      maximum: 52,
      minimum: 1,
      type: "integer",
    },
    { type: "null" },
  ],
} as const;
const NULLABLE_PLAN_WORKOUTS_SCHEMA = {
  anyOf: [
    {
      items: {
        additionalProperties: false,
        properties: {
          weekNumber: {
            minimum: 1,
            type: "integer",
          },
          weekday: {
            maximum: 7,
            minimum: 1,
            type: "integer",
          },
          workoutTemplateId: {
            type: "string",
          },
        },
        required: ["weekNumber", "weekday", "workoutTemplateId"],
        type: "object",
      },
      type: "array",
    },
    { type: "null" },
  ],
} as const;

const HEALTH_COACH_TOOLS: Tool[] = [
  {
    description:
      "Read the member's health profile, recent daily check-ins, current weight trend, and coach readiness context.",
    name: "get_member_profile",
    parameters: {
      additionalProperties: false,
      properties: {},
      required: [],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Read the member's current open workout session, including exercises and logged sets.",
    name: "get_current_workout",
    parameters: {
      additionalProperties: false,
      properties: {},
      required: [],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Read recent completed workout history. Use this for questions about progress, recent workouts, and exercise performance.",
    name: "get_recent_workout_history",
    parameters: {
      additionalProperties: false,
      properties: {
        limit: {
          description: "Maximum number of completed sessions to summarize, from 1 to 20.",
          maximum: 20,
          minimum: 1,
          type: "integer",
        },
      },
      required: ["limit"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Read the exercise library. Optionally filter it by a search phrase.",
    name: "get_exercise_library",
    parameters: {
      additionalProperties: false,
      properties: {
        searchQuery: {
          description: "Optional search phrase for exercise names or categories.",
          ...NULLABLE_STRING_SCHEMA,
        },
      },
      required: ["searchQuery"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Read workout templates with their exercise order. Use this for questions about templates or when composing future workouts.",
    name: "get_workout_templates",
    parameters: {
      additionalProperties: false,
      properties: {
        searchQuery: {
          description: "Optional search phrase for template names.",
          ...NULLABLE_STRING_SCHEMA,
        },
      },
      required: ["searchQuery"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Read the member's plans. Without a plan ID, return active, draft, and past plan summaries. With a plan ID, return detailed information for that plan.",
    name: "get_plan_overview",
    parameters: {
      additionalProperties: false,
      properties: {
        planId: {
          description: "Optional plan ID for a detailed single-plan view.",
          ...NULLABLE_STRING_SCHEMA,
        },
      },
      required: ["planId"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Read training statistics summaries and trends. Use this for performance and adherence questions.",
    name: "get_statistics_summary",
    parameters: {
      additionalProperties: false,
      properties: {
        exerciseKey: {
          description: "Optional exercise key from the statistics page if the question is about one exercise.",
          ...NULLABLE_STRING_SCHEMA,
        },
        range: {
          description: "Time range for the statistics summary.",
          enum: ["30d", "12w", "all"],
          type: "string",
        },
      },
      required: ["exerciseKey", "range"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Create a pending proposal to add a new exercise to the member's library. Never claim it is already applied.",
    name: "propose_create_exercise",
    parameters: {
      additionalProperties: false,
      properties: {
        category: {
          description: "One or more exercise categories as a comma-separated string.",
          type: "string",
        },
        defaultUnit: {
          enum: ["kg", "bodyweight", "time"],
          type: "string",
        },
        name: {
          type: "string",
        },
        note: {
          ...NULLABLE_STRING_SCHEMA,
        },
      },
      required: ["name", "category", "defaultUnit", "note"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Create a pending proposal to update an existing exercise in the member's library. Never use this for active workout history.",
    name: "propose_update_exercise",
    parameters: {
      additionalProperties: false,
      properties: {
        category: {
          description: "One or more exercise categories as a comma-separated string.",
          type: "string",
        },
        defaultUnit: {
          enum: ["kg", "bodyweight", "time"],
          type: "string",
        },
        exerciseId: {
          type: "string",
        },
        name: {
          type: "string",
        },
        note: {
          ...NULLABLE_STRING_SCHEMA,
        },
      },
      required: ["exerciseId", "name", "category", "defaultUnit", "note"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Create a pending proposal to create a workout template with an ordered list of exercise IDs.",
    name: "propose_create_workout_template",
    parameters: {
      additionalProperties: false,
      properties: {
        exerciseIds: {
          items: {
            type: "string",
          },
          minItems: 1,
          type: "array",
        },
        name: {
          type: "string",
        },
      },
      required: ["name", "exerciseIds"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Create a pending proposal to update a workout template name and/or replace its exercise order. Never claim it is already applied.",
    name: "propose_update_workout_template",
    parameters: {
      additionalProperties: false,
      properties: {
        exerciseIds: {
          anyOf: [
            {
              items: {
                type: "string",
              },
              minItems: 1,
              type: "array",
            },
            { type: "null" },
          ],
        },
        name: {
          ...NULLABLE_STRING_SCHEMA,
        },
        templateId: {
          type: "string",
        },
      },
      required: ["templateId", "name", "exerciseIds"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Create a pending proposal to create a new plan. Use workouts when the user wants scheduled template days added immediately.",
    name: "propose_create_plan",
    parameters: {
      additionalProperties: false,
      properties: {
        durationWeeks: {
          maximum: 52,
          minimum: 1,
          type: "integer",
        },
        goal: {
          type: "string",
        },
        name: {
          type: "string",
        },
        workouts: {
          ...NULLABLE_PLAN_WORKOUTS_SCHEMA,
        },
      },
      required: ["name", "goal", "durationWeeks", "workouts"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Create a pending proposal to update an existing plan's name, goal, or duration. Never use this on archived or completed plans.",
    name: "propose_update_plan",
    parameters: {
      additionalProperties: false,
      properties: {
        durationWeeks: {
          ...NULLABLE_DURATION_WEEKS_SCHEMA,
        },
        goal: {
          ...NULLABLE_STRING_SCHEMA,
        },
        name: {
          ...NULLABLE_STRING_SCHEMA,
        },
        planId: {
          type: "string",
        },
      },
      required: ["planId", "name", "goal", "durationWeeks"],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    description:
      "Create a pending proposal to add or update a future scheduled plan workout. Never use this for past, skipped, completed, or current workout history.",
    name: "propose_upsert_plan_workout",
    parameters: {
      additionalProperties: false,
      properties: {
        existingPlanWorkoutId: {
          ...NULLABLE_STRING_SCHEMA,
        },
        planId: {
          type: "string",
        },
        weekNumber: {
          minimum: 1,
          type: "integer",
        },
        weekday: {
          maximum: 7,
          minimum: 1,
          type: "integer",
        },
        workoutTemplateId: {
          type: "string",
        },
      },
      required: [
        "existingPlanWorkoutId",
        "planId",
        "weekNumber",
        "weekday",
        "workoutTemplateId",
      ],
      type: "object",
    },
    strict: true,
    type: "function",
  },
  {
    type: "web_search",
  },
] as const;

function getHealthCoachInstructions(timeZone: string) {
  const todayDateKey = getTodayDateKey(timeZone);

  return [
    "You are the Health coach for a fitness app.",
    "Always answer in English.",
    "Use metric units only.",
    "Assume the member is in the Netherlands and use EU-style health and nutrition context when relevant.",
    `Today's local date for the member is ${todayDateKey}.`,
    "You can answer questions about workout plans, workouts, exercises, nutrition, and weight loss.",
    "Be explicit about what is based on the member's app data versus general guidance.",
    "If you use web information, cite it clearly in the answer.",
    "Never diagnose, treat, or manage injuries or medical conditions. For medical risk, eating disorder risk, severe pain, or alarming symptoms, refuse and direct the member to a qualified professional.",
    "You must never claim that a database change has been applied unless a pending proposal was explicitly approved and applied by the app after your response.",
    "For any requested write change, create a proposal with the fixed proposal tools instead of pretending to edit data directly.",
    "Do not ask to access files, folders, shell commands, or anything outside the app tools. You have no filesystem access.",
    "Do not propose or request edits to an active workout session, completed workout history, or past plan days.",
    "Keep answers practical and concise.",
    "Structure personalized answers with these headings when helpful: Based on your data, General guidance, Sources.",
  ].join("\n");
}

function omitNullValues(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== null),
  );
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Health coach is not configured yet.");
  }

  return new OpenAI({ apiKey });
}

export function isHealthCoachConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getHealthCoachModel() {
  return HEALTH_COACH_MODEL;
}

function isMissingToolOutputError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("No tool output found for function call")
  );
}

async function resolveHealthCoachConversation(userId: string) {
  const [existingConversation] = await db
    .select({
      id: healthCoachConversations.id,
      openaiConversationId: healthCoachConversations.openaiConversationId,
    })
    .from(healthCoachConversations)
    .where(eq(healthCoachConversations.userId, userId))
    .limit(1);

  if (existingConversation) {
    return existingConversation;
  }

  const client = getOpenAIClient();
  const openaiConversation = await client.conversations.create({
    metadata: {
      user_id: userId,
    },
  });
  const conversationId = randomUUID();

  await db.insert(healthCoachConversations).values({
    id: conversationId,
    openaiConversationId: openaiConversation.id,
    userId,
  });

  return {
    id: conversationId,
    openaiConversationId: openaiConversation.id,
  };
}

async function replaceOpenAIConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const client = getOpenAIClient();
  const openaiConversation = await client.conversations.create({
    metadata: {
      user_id: userId,
    },
  });

  await db
    .update(healthCoachConversations)
    .set({
      openaiConversationId: openaiConversation.id,
      updatedAt: new Date(),
    })
    .where(eq(healthCoachConversations.id, conversationId));

  return {
    id: conversationId,
    openaiConversationId: openaiConversation.id,
  };
}

async function touchConversation(conversationId: string) {
  await db
    .update(healthCoachConversations)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(healthCoachConversations.id, conversationId));
}

async function appendHealthCoachMessage({
  citations,
  content,
  conversationId,
  openaiResponseId,
  role,
}: {
  citations?: HealthCoachCitation[];
  content: string;
  conversationId: string;
  openaiResponseId?: string | null;
  role: "assistant" | "user";
}) {
  const messageId = randomUUID();

  await db.insert(healthCoachMessages).values({
    citations: citations && citations.length > 0 ? citations : null,
    content,
    conversationId,
    id: messageId,
    openaiResponseId: openaiResponseId ?? null,
    role,
  });

  await touchConversation(conversationId);

  return messageId;
}

export async function appendHealthCoachAssistantMessage({
  content,
  conversationId,
}: {
  content: string;
  conversationId: string;
}) {
  await appendHealthCoachMessage({
    content,
    conversationId,
    role: "assistant",
  });
}

async function logHealthCoachToolEvent({
  conversationId,
  errorMessage,
  proposalId,
  requestPayload,
  responsePayload,
  status,
  toolCallId,
  toolName,
  type,
}: {
  conversationId: string;
  errorMessage?: string;
  proposalId?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  status: string;
  toolCallId?: string;
  toolName: string;
  type: "function" | "web_search";
}) {
  await db.insert(healthCoachToolEvents).values({
    conversationId,
    errorMessage: errorMessage ?? null,
    id: randomUUID(),
    proposalId: proposalId ?? null,
    requestPayload: requestPayload ?? null,
    responsePayload: responsePayload ?? null,
    status,
    toolCallId: toolCallId ?? null,
    toolName,
    type,
  });
}

async function getMemberProfileToolData(userId: string, timeZone: string) {
  const pageData = await getHealthCoachPageData(userId, timeZone);

  return {
    currentWeightKg: pageData.latestCheckin?.weightKg ?? null,
    goalMode: pageData.profile?.goalMode ?? null,
    hasTodayCheckin: pageData.hasTodayCheckin,
    latestCheckin: pageData.latestCheckin
      ? {
          note: pageData.latestCheckin.note,
          readinessRating: pageData.latestCheckin.readinessRating,
          recordedOn: pageData.latestCheckin.recordedOn,
          sorenessPainRating: pageData.latestCheckin.sorenessPainRating,
          weightKg: pageData.latestCheckin.weightKg,
        }
      : null,
    profile: pageData.profile,
    readiness: pageData.readiness,
    recentCheckins: pageData.recentCheckins.slice(0, 14),
    targetWeightKg: pageData.profile?.targetWeightKg ?? null,
    todayDateKey: pageData.todayDateKey,
  };
}

async function getCurrentWorkoutToolData(userId: string) {
  const [session] = await db
    .select({
      id: workoutSessions.id,
      note: workoutSessions.note,
      performedOn: workoutSessions.performedOn,
      startedAt: workoutSessions.startedAt,
    })
    .from(workoutSessions)
    .where(
      and(eq(workoutSessions.userId, userId), isNull(workoutSessions.completedAt)),
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);

  if (!session) {
    return null;
  }

  const rows = await db
    .select({
      entryId: workoutExerciseEntries.id,
      exerciseCategorySnapshot: workoutExerciseEntries.exerciseCategorySnapshot,
      exerciseNameSnapshot: workoutExerciseEntries.exerciseNameSnapshot,
      setId: workoutSets.id,
      setNumber: workoutSets.setNumber,
      reps: workoutSets.reps,
      sortOrder: workoutExerciseEntries.sortOrder,
      unitSnapshot: workoutExerciseEntries.unitSnapshot,
      weight: workoutSets.weight,
    })
    .from(workoutExerciseEntries)
    .leftJoin(
      workoutSets,
      eq(workoutSets.workoutExerciseEntryId, workoutExerciseEntries.id),
    )
    .where(eq(workoutExerciseEntries.workoutSessionId, session.id))
    .orderBy(asc(workoutExerciseEntries.sortOrder), asc(workoutSets.setNumber));

  const entries = new Map<
    string,
    {
      category: string;
      name: string;
      sets: Array<{
        reps: number;
        setNumber: number;
        weight: number;
      }>;
      sortOrder: number;
      unit: string;
    }
  >();

  for (const row of rows) {
    const entry =
      entries.get(row.entryId) ??
      ({
        category: row.exerciseCategorySnapshot,
        name: row.exerciseNameSnapshot,
        sets: [],
        sortOrder: row.sortOrder,
        unit: row.unitSnapshot,
      } satisfies {
        category: string;
        name: string;
        sets: Array<{
          reps: number;
          setNumber: number;
          weight: number;
        }>;
        sortOrder: number;
        unit: string;
      });

    if (row.setId) {
      entry.sets.push({
        reps: row.reps as number,
        setNumber: row.setNumber as number,
        weight: row.weight as number,
      });
    }

    entries.set(row.entryId, entry);
  }

  return {
    exercises: Array.from(entries.values()).sort(
      (left, right) => left.sortOrder - right.sortOrder,
    ),
    note: session.note,
    performedOn: session.performedOn,
    sessionId: session.id,
    startedAt: session.startedAt.toISOString(),
  };
}

async function getRecentWorkoutHistoryToolData(userId: string, limit: number) {
  const history = await getCompletedWorkoutHistoryForUser(userId, limit);

  return history.flatMap((day) =>
    day.sessions.map((session) => ({
      exerciseCount: session.exerciseCount,
      note: session.note,
      performedOn: session.performedOn,
      sessionId: session.id,
      totalSets: session.totalSets,
      workouts: session.entries.map((entry) => ({
        category: entry.exerciseCategorySnapshot,
        name: entry.exerciseNameSnapshot,
        setCount: entry.sets.length,
        unit: entry.unitSnapshot,
      })),
    })),
  );
}

async function executeHealthCoachTool({
  argumentsText,
  conversationId,
  name,
  timeZone,
  userId,
}: {
  argumentsText: string;
  conversationId: string;
  name: string;
  timeZone: string;
  userId: string;
}) {
  let parsedArguments: Record<string, unknown> = {};

  try {
    if (argumentsText.trim()) {
      parsedArguments = JSON.parse(argumentsText) as Record<string, unknown>;
    }

    switch (name) {
      case "get_member_profile": {
        const result = await getMemberProfileToolData(userId, timeZone);

        await logHealthCoachToolEvent({
          conversationId,
          requestPayload: parsedArguments,
          responsePayload: {
            hasProfile: Boolean(result.profile),
            recentCheckinCount: result.recentCheckins.length,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          result,
        };
      }

      case "get_current_workout": {
        const result = await getCurrentWorkoutToolData(userId);

        await logHealthCoachToolEvent({
          conversationId,
          requestPayload: parsedArguments,
          responsePayload: {
            hasOpenWorkout: Boolean(result),
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          result,
        };
      }

      case "get_recent_workout_history": {
        const limit = Math.min(
          20,
          Math.max(
            1,
            typeof parsedArguments.limit === "number" ? parsedArguments.limit : 8,
          ),
        );
        const result = await getRecentWorkoutHistoryToolData(userId, limit);

        await logHealthCoachToolEvent({
          conversationId,
          requestPayload: parsedArguments,
          responsePayload: {
            returnedSessions: result.length,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          result,
        };
      }

      case "get_exercise_library": {
        const searchQuery =
          typeof parsedArguments.searchQuery === "string" &&
          parsedArguments.searchQuery.trim()
            ? parsedArguments.searchQuery
            : undefined;
        const exercises = await getExercisesForUser(userId, searchQuery);
        const result = exercises.slice(0, 50).map((exercise) => ({
          category: exercise.category,
          defaultUnit: exercise.defaultUnit,
          exerciseId: exercise.id,
          name: exercise.name,
          note: exercise.note,
        }));

        await logHealthCoachToolEvent({
          conversationId,
          requestPayload: parsedArguments,
          responsePayload: {
            returnedExercises: result.length,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          result,
        };
      }

      case "get_workout_templates": {
        const searchQuery =
          typeof parsedArguments.searchQuery === "string"
            ? parsedArguments.searchQuery.trim().toLowerCase()
            : "";
        const templates = await getWorkoutTemplatesForUser(userId);
        const filteredTemplates = templates.filter((template) =>
          searchQuery ? template.name.toLowerCase().includes(searchQuery) : true,
        );
        const result = filteredTemplates.slice(0, 30).map((template) => ({
          exerciseCount: template.exerciseCount,
          exercises: template.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            name: exercise.exerciseName,
            sortOrder: exercise.sortOrder,
            unit: exercise.defaultUnit,
          })),
          name: template.name,
          templateId: template.id,
        }));

        await logHealthCoachToolEvent({
          conversationId,
          requestPayload: parsedArguments,
          responsePayload: {
            returnedTemplates: result.length,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          result,
        };
      }

      case "get_plan_overview": {
        const planId =
          typeof parsedArguments.planId === "string" && parsedArguments.planId.trim()
            ? parsedArguments.planId
            : null;
        const result = planId
          ? await getPlanByIdForUser(userId, planId, timeZone)
          : await getPlansPageData(userId, timeZone);

        await logHealthCoachToolEvent({
          conversationId,
          requestPayload: parsedArguments,
          responsePayload: {
            hasPlan: Boolean(result),
            mode: planId ? "single" : "overview",
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          result,
        };
      }

      case "get_statistics_summary": {
        const range =
          parsedArguments.range === "12w" ||
          parsedArguments.range === "all" ||
          parsedArguments.range === "30d"
            ? parsedArguments.range
            : "30d";
        const exerciseKey =
          typeof parsedArguments.exerciseKey === "string" &&
          parsedArguments.exerciseKey.trim()
            ? parsedArguments.exerciseKey
            : null;
        const result = await getStatisticsPageData(userId, {
          exerciseKey,
          range,
        });

        await logHealthCoachToolEvent({
          conversationId,
          requestPayload: parsedArguments,
          responsePayload: {
            exerciseOptionCount: result.exerciseOptions.length,
            range,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          result,
        };
      }

      case "propose_create_exercise": {
        const proposal = await createExerciseCreateProposal({
          conversationId,
          input: omitNullValues(parsedArguments),
          userId,
        });

        await logHealthCoachToolEvent({
          conversationId,
          proposalId: proposal.id,
          requestPayload: parsedArguments,
          responsePayload: {
            proposalId: proposal.id,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          proposal,
        };
      }

      case "propose_update_exercise": {
        const proposal = await createExerciseUpdateProposal({
          conversationId,
          input: omitNullValues(parsedArguments),
          userId,
        });

        await logHealthCoachToolEvent({
          conversationId,
          proposalId: proposal.id,
          requestPayload: parsedArguments,
          responsePayload: {
            proposalId: proposal.id,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          proposal,
        };
      }

      case "propose_create_workout_template": {
        const proposal = await createWorkoutTemplateCreateProposal({
          conversationId,
          input: omitNullValues(parsedArguments),
          userId,
        });

        await logHealthCoachToolEvent({
          conversationId,
          proposalId: proposal.id,
          requestPayload: parsedArguments,
          responsePayload: {
            proposalId: proposal.id,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          proposal,
        };
      }

      case "propose_update_workout_template": {
        const proposal = await createWorkoutTemplateUpdateProposal({
          conversationId,
          input: omitNullValues(parsedArguments),
          userId,
        });

        await logHealthCoachToolEvent({
          conversationId,
          proposalId: proposal.id,
          requestPayload: parsedArguments,
          responsePayload: {
            proposalId: proposal.id,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          proposal,
        };
      }

      case "propose_create_plan": {
        const proposal = await createPlanCreateProposal({
          conversationId,
          input: omitNullValues(parsedArguments),
          userId,
        });

        await logHealthCoachToolEvent({
          conversationId,
          proposalId: proposal.id,
          requestPayload: parsedArguments,
          responsePayload: {
            proposalId: proposal.id,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          proposal,
        };
      }

      case "propose_update_plan": {
        const proposal = await createPlanUpdateProposal({
          conversationId,
          input: omitNullValues(parsedArguments),
          userId,
        });

        await logHealthCoachToolEvent({
          conversationId,
          proposalId: proposal.id,
          requestPayload: parsedArguments,
          responsePayload: {
            proposalId: proposal.id,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          proposal,
        };
      }

      case "propose_upsert_plan_workout": {
        const proposal = await createPlanWorkoutUpsertProposal({
          conversationId,
          input: omitNullValues(parsedArguments),
          userId,
        });

        await logHealthCoachToolEvent({
          conversationId,
          proposalId: proposal.id,
          requestPayload: parsedArguments,
          responsePayload: {
            proposalId: proposal.id,
          },
          status: "completed",
          toolName: name,
          type: "function",
        });

        return {
          ok: true,
          proposal,
        };
      }

      default:
        throw new Error("Unsupported health coach tool.");
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "The requested tool call failed.";

    await logHealthCoachToolEvent({
      conversationId,
      errorMessage,
      requestPayload: parsedArguments,
      status: "error",
      toolName: name,
      type: "function",
    });

    return {
      error: errorMessage,
      ok: false,
    };
  }
}

function extractFunctionCalls(response: unknown): HealthCoachFunctionCall[] {
  if (!response || typeof response !== "object" || !("output" in response)) {
    return [];
  }

  const output = Array.isArray(response.output) ? response.output : [];

  return output
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === "object" &&
        item.type === "function_call" &&
        typeof item.name === "string" &&
        typeof item.call_id === "string" &&
        typeof item.arguments === "string",
    )
    .map((item) => ({
      arguments: item.arguments as string,
      callId: item.call_id as string,
      name: item.name as string,
    }));
}

function extractAssistantMessage(response: unknown) {
  if (!response || typeof response !== "object" || !("output" in response)) {
    return {
      citations: [] as HealthCoachCitation[],
      content: "",
      openaiResponseId: null as string | null,
    };
  }

  const responseId =
    "id" in response && typeof response.id === "string" ? response.id : null;
  const output = Array.isArray(response.output) ? response.output : [];
  let content = "";
  const citations: HealthCoachCitation[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object" || item.type !== "message") {
      continue;
    }

    const messageContent = Array.isArray(item.content) ? item.content : [];

    for (const part of messageContent) {
      if (!part || typeof part !== "object" || part.type !== "output_text") {
        continue;
      }

      const text = typeof part.text === "string" ? part.text : "";
      content = content ? `${content}\n\n${text}` : text;
      const partOffset = content.length - text.length;
      const annotations = Array.isArray(part.annotations) ? part.annotations : [];

      for (const annotation of annotations) {
        if (!annotation || typeof annotation !== "object") {
          continue;
        }

        const url =
          typeof annotation.url === "string" ? annotation.url : null;
        const startIndex =
          typeof annotation.start_index === "number"
            ? annotation.start_index
            : null;
        const endIndex =
          typeof annotation.end_index === "number" ? annotation.end_index : null;

        if (!url || startIndex === null || endIndex === null) {
          continue;
        }

        citations.push({
          endIndex: partOffset + endIndex,
          startIndex: partOffset + startIndex,
          title:
            typeof annotation.title === "string" ? annotation.title : null,
          url,
        });
      }
    }
  }

  return {
    citations,
    content,
    openaiResponseId: responseId,
  };
}

async function logWebSearchCalls({
  conversationId,
  response,
}: {
  conversationId: string;
  response: unknown;
}) {
  if (!response || typeof response !== "object" || !("output" in response)) {
    return;
  }

  const output = Array.isArray(response.output) ? response.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object" || item.type !== "web_search_call") {
      continue;
    }

    const action =
      item.action && typeof item.action === "object"
        ? (item.action as Record<string, unknown>)
        : null;

    await logHealthCoachToolEvent({
      conversationId,
      requestPayload: action
        ? {
            query:
              typeof action.query === "string" ? action.query : undefined,
            type: typeof action.type === "string" ? action.type : undefined,
          }
        : undefined,
      responsePayload: {
        status: typeof item.status === "string" ? item.status : undefined,
      },
      status: typeof item.status === "string" ? item.status : "completed",
      toolCallId: typeof item.id === "string" ? item.id : undefined,
      toolName: "web_search",
      type: "web_search",
    });
  }
}

export async function sendHealthCoachUserMessage({
  message,
  timeZone,
  userId,
}: {
  message: string;
  timeZone: string;
  userId: string;
}) {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error("Enter a message for the Health coach.");
  }

  if (!isHealthCoachConfigured()) {
    throw new Error("Add OPENAI_API_KEY before using the Health coach.");
  }

  const conversation = await resolveHealthCoachConversation(userId);
  const client = getOpenAIClient();

  await appendHealthCoachMessage({
    content: trimmedMessage,
    conversationId: conversation.id,
    role: "user",
  });

  let activeConversation = conversation;

  try {
    let response = await client.responses.create({
      conversation: activeConversation.openaiConversationId,
      include: ["web_search_call.action.sources"],
      input: [
        {
          content: trimmedMessage,
          role: "user",
        },
      ],
      instructions: getHealthCoachInstructions(timeZone),
      max_output_tokens: 1200,
      model: HEALTH_COACH_MODEL,
      store: true,
      tool_choice: "auto",
      tools: HEALTH_COACH_TOOLS,
    } satisfies ResponseCreateParamsNonStreaming);

    await logWebSearchCalls({
      conversationId: activeConversation.id,
      response,
    });

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const functionCalls = extractFunctionCalls(response);

      if (functionCalls.length === 0) {
        break;
      }

      const toolOutputs: ResponseInputItem[] = await Promise.all(
        functionCalls.map(async (call) => {
          try {
            const result = await executeHealthCoachTool({
              argumentsText: call.arguments,
              conversationId: activeConversation.id,
              name: call.name,
              timeZone,
              userId,
            });

            return {
              call_id: call.callId,
              output: JSON.stringify(result),
              type: "function_call_output" as const,
            };
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "The requested tool call failed before completion.";

            await logHealthCoachToolEvent({
              conversationId: activeConversation.id,
              errorMessage,
              requestPayload: {
                argumentsText: call.arguments,
              },
              status: "error",
              toolCallId: call.callId,
              toolName: call.name,
              type: "function",
            });

            return {
              call_id: call.callId,
              output: JSON.stringify({
                error: errorMessage,
                ok: false,
              }),
              type: "function_call_output" as const,
            };
          }
        }),
      );

      response = await client.responses.create({
        conversation: activeConversation.openaiConversationId,
        include: ["web_search_call.action.sources"],
        input: toolOutputs,
        instructions: getHealthCoachInstructions(timeZone),
        max_output_tokens: 1200,
        model: HEALTH_COACH_MODEL,
        store: true,
        tool_choice: "auto",
        tools: HEALTH_COACH_TOOLS,
      } satisfies ResponseCreateParamsNonStreaming);

      await logWebSearchCalls({
        conversationId: activeConversation.id,
        response,
      });
    }

    const assistantMessage = extractAssistantMessage(response);

    if (!assistantMessage.content.trim()) {
      throw new Error("The Health coach returned an empty response.");
    }

    await appendHealthCoachMessage({
      citations: assistantMessage.citations,
      content: assistantMessage.content.trim(),
      conversationId: activeConversation.id,
      openaiResponseId: assistantMessage.openaiResponseId,
      role: "assistant",
    });

    logInfo("health_coach.message.completed", {
      citationCount: assistantMessage.citations.length,
      conversationId: activeConversation.id,
      userId,
    });

    return {
      conversationId: activeConversation.id,
    };
  } catch (error) {
    if (isMissingToolOutputError(error)) {
      activeConversation = await replaceOpenAIConversation({
        conversationId: activeConversation.id,
        userId,
      });

      logWarn("health_coach.conversation.reset_after_missing_tool_output", {
        conversationId: activeConversation.id,
        userId,
      });

      await appendHealthCoachAssistantMessage({
        content:
          "The coach conversation was reset after an interrupted tool call. Please send your last request again.",
        conversationId: activeConversation.id,
      });

      return {
        conversationId: activeConversation.id,
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : "The Health coach request failed.";

    logError("health_coach.message.failed", {
      conversationId: conversation.id,
      userId,
    });

    await appendHealthCoachAssistantMessage({
      content:
        "I couldn't complete that request right now. Please try again in a moment.",
      conversationId: conversation.id,
    });

    throw new Error(errorMessage);
  }
}

export function formatHealthCoachTimestamp(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

export function formatHealthCoachCheckinDate(dateKey: string, timeZone: string) {
  return formatDateForDisplay(dateKey, timeZone, {
    dateStyle: "medium",
  });
}
