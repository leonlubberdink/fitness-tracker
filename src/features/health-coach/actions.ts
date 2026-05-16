"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";

import { db } from "@/db/client";
import {
  dailyHealthCheckins,
  healthCoachChangeProposals,
  userHealthProfiles,
} from "@/db/schema";
import { requireUser } from "@/features/auth/session";
import { getTodayDateKey } from "@/lib/date";

import type { HealthCoachChatActionState } from "./chat-state";
import { getHealthCoachChatActionState } from "./chat-state";
import {
  appendHealthCoachAssistantMessage,
  sendHealthCoachUserMessage,
} from "./coach";
import { applyHealthCoachProposal } from "./proposals";
import type {
  DailyHealthCheckinActionState,
  HealthProfileActionState,
} from "./state";
import {
  getDailyHealthCheckinActionState,
  getHealthProfileActionState,
} from "./state";
import {
  healthCoachProposalMutationSchema,
  sendHealthCoachMessageSchema,
  upsertDailyHealthCheckinSchema,
  upsertHealthProfileSchema,
} from "./validation";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function normalizeHealthProfileValues(formData: FormData) {
  return {
    sex: getStringValue(formData, "sex"),
    birthDate: getStringValue(formData, "birthDate"),
    heightCm: getStringValue(formData, "heightCm"),
    activityLevel: getStringValue(formData, "activityLevel"),
    dietPreference: getStringValue(formData, "dietPreference"),
    allergies: getStringValue(formData, "allergies"),
    injuriesLimitations: getStringValue(formData, "injuriesLimitations"),
    goalMode: getStringValue(formData, "goalMode"),
    targetWeightKg: getStringValue(formData, "targetWeightKg"),
    paceKgPerMonth: getStringValue(formData, "paceKgPerMonth"),
  };
}

function getHealthProfileFormStateValues(
  values: ReturnType<typeof normalizeHealthProfileValues>,
) {
  return getHealthProfileActionState({
    sex: values.sex as HealthProfileActionState["values"]["sex"],
    birthDate: values.birthDate,
    heightCm: values.heightCm,
    activityLevel:
      values.activityLevel as HealthProfileActionState["values"]["activityLevel"],
    dietPreference: values.dietPreference,
    allergies: values.allergies,
    injuriesLimitations: values.injuriesLimitations,
    goalMode: values.goalMode as HealthProfileActionState["values"]["goalMode"],
    targetWeightKg: values.targetWeightKg,
    paceKgPerMonth: values.paceKgPerMonth,
  }).values;
}

function normalizeDailyHealthCheckinValues(formData: FormData) {
  return {
    recordedOn: getStringValue(formData, "recordedOn"),
    weightKg: getStringValue(formData, "weightKg"),
    readinessRating: getStringValue(formData, "readinessRating"),
    sorenessPainRating: getStringValue(formData, "sorenessPainRating"),
    note: getStringValue(formData, "note"),
  };
}

function revalidateHealthCoachPaths() {
  revalidatePath("/health-coach");
  revalidatePath("/health-coach/chat");
}

export async function upsertHealthProfileAction(
  _previousState: HealthProfileActionState,
  formData: FormData,
): Promise<HealthProfileActionState> {
  const user = await requireUser();
  const rawValues = normalizeHealthProfileValues(formData);
  const parsedInput = upsertHealthProfileSchema.safeParse(rawValues);

  if (!parsedInput.success) {
    return {
      error: "Check the highlighted fields.",
      success: null,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      values: getHealthProfileFormStateValues(rawValues),
    };
  }

  if (parsedInput.data.birthDate > getTodayDateKey(user.timeZone)) {
    return {
      error: "Check the highlighted fields.",
      success: null,
      fieldErrors: {
        birthDate: ["Birth date cannot be in the future."],
      },
      values: getHealthProfileFormStateValues(rawValues),
    };
  }

  const nextValues = {
    sex: parsedInput.data.sex,
    birthDate: parsedInput.data.birthDate,
    heightCm: parsedInput.data.heightCm,
    activityLevel: parsedInput.data.activityLevel ?? null,
    dietPreference: parsedInput.data.dietPreference || null,
    allergies: parsedInput.data.allergies || null,
    injuriesLimitations: parsedInput.data.injuriesLimitations || null,
    goalMode: parsedInput.data.goalMode,
    targetWeightKg: parsedInput.data.targetWeightKg,
    paceKgPerMonth: parsedInput.data.paceKgPerMonth,
    updatedAt: new Date(),
  };

  const [existingProfile] = await db
    .select({
      userId: userHealthProfiles.userId,
    })
    .from(userHealthProfiles)
    .where(eq(userHealthProfiles.userId, user.id))
    .limit(1);

  if (existingProfile) {
    await db
      .update(userHealthProfiles)
      .set(nextValues)
      .where(eq(userHealthProfiles.userId, user.id));
  } else {
    await db.insert(userHealthProfiles).values({
      userId: user.id,
      ...nextValues,
    });
  }

  revalidatePath("/");
  revalidateHealthCoachPaths();
  refresh();

  return {
    error: null,
    success: "Profile saved.",
    fieldErrors: {},
    values: {
      sex: parsedInput.data.sex,
      birthDate: parsedInput.data.birthDate,
      heightCm: String(parsedInput.data.heightCm),
      activityLevel: parsedInput.data.activityLevel ?? "",
      dietPreference: parsedInput.data.dietPreference,
      allergies: parsedInput.data.allergies,
      injuriesLimitations: parsedInput.data.injuriesLimitations,
      goalMode: parsedInput.data.goalMode,
      targetWeightKg: String(parsedInput.data.targetWeightKg),
      paceKgPerMonth:
        parsedInput.data.paceKgPerMonth === null
          ? ""
          : String(parsedInput.data.paceKgPerMonth),
    },
  };
}

export async function upsertDailyHealthCheckinAction(
  _previousState: DailyHealthCheckinActionState,
  formData: FormData,
): Promise<DailyHealthCheckinActionState> {
  const user = await requireUser();
  const rawValues = normalizeDailyHealthCheckinValues(formData);
  const parsedInput = upsertDailyHealthCheckinSchema.safeParse(rawValues);

  if (!parsedInput.success) {
    return {
      error: "Check the highlighted fields.",
      success: null,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      values: getDailyHealthCheckinActionState(rawValues).values,
    };
  }

  if (parsedInput.data.recordedOn > getTodayDateKey(user.timeZone)) {
    return {
      error: "Check the highlighted fields.",
      success: null,
      fieldErrors: {
        recordedOn: ["Check-in dates cannot be in the future."],
      },
      values: getDailyHealthCheckinActionState(rawValues).values,
    };
  }

  await db
    .insert(dailyHealthCheckins)
    .values({
      id: randomUUID(),
      userId: user.id,
      recordedOn: parsedInput.data.recordedOn,
      weightKg: parsedInput.data.weightKg,
      readinessRating: parsedInput.data.readinessRating,
      sorenessPainRating: parsedInput.data.sorenessPainRating,
      note: parsedInput.data.note || null,
    })
    .onConflictDoUpdate({
      target: [
        dailyHealthCheckins.userId,
        dailyHealthCheckins.recordedOn,
      ],
      set: {
        weightKg: parsedInput.data.weightKg,
        readinessRating: parsedInput.data.readinessRating,
        sorenessPainRating: parsedInput.data.sorenessPainRating,
        note: parsedInput.data.note || null,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/");
  revalidateHealthCoachPaths();
  refresh();

  return {
    error: null,
    success: "Check-in saved.",
    fieldErrors: {},
    values: {
      recordedOn: parsedInput.data.recordedOn,
      weightKg: String(parsedInput.data.weightKg),
      readinessRating: String(parsedInput.data.readinessRating),
      sorenessPainRating: String(parsedInput.data.sorenessPainRating),
      note: parsedInput.data.note,
    },
  };
}

export async function sendHealthCoachMessageAction(
  _previousState: HealthCoachChatActionState,
  formData: FormData,
): Promise<HealthCoachChatActionState> {
  const user = await requireUser();
  const rawMessage = getStringValue(formData, "message");
  const parsedInput = sendHealthCoachMessageSchema.safeParse({
    message: rawMessage,
  });

  if (!parsedInput.success) {
    return {
      error:
        parsedInput.error.issues[0]?.message ??
        "Enter a message for the Health coach.",
      message: rawMessage,
      success: null,
    };
  }

  try {
    await sendHealthCoachUserMessage({
      message: parsedInput.data.message,
      timeZone: user.timeZone,
      userId: user.id,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The Health coach request failed.",
      message: parsedInput.data.message,
      success: null,
    };
  }

  revalidateHealthCoachPaths();
  refresh();

  return getHealthCoachChatActionState();
}

export async function rejectHealthCoachProposalAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = healthCoachProposalMutationSchema.safeParse({
    proposalId: getStringValue(formData, "proposalId"),
  });

  if (!parsedInput.success) {
    return;
  }

  const [proposal] = await db
    .select({
      conversationId: healthCoachChangeProposals.conversationId,
      id: healthCoachChangeProposals.id,
      status: healthCoachChangeProposals.status,
      title: healthCoachChangeProposals.title,
    })
    .from(healthCoachChangeProposals)
    .where(
      and(
        eq(healthCoachChangeProposals.id, parsedInput.data.proposalId),
        eq(healthCoachChangeProposals.userId, user.id),
      ),
    )
    .limit(1);

  if (!proposal || proposal.status !== "pending") {
    return;
  }

  await db
    .update(healthCoachChangeProposals)
    .set({
      rejectedAt: new Date(),
      status: "rejected",
      updatedAt: new Date(),
    })
    .where(eq(healthCoachChangeProposals.id, proposal.id));

  await appendHealthCoachAssistantMessage({
    content: `The pending coach proposal "${proposal.title}" was rejected.`,
    conversationId: proposal.conversationId,
  });

  revalidateHealthCoachPaths();
  refresh();
}

export async function approveHealthCoachProposalAction(formData: FormData) {
  const user = await requireUser();
  const parsedInput = healthCoachProposalMutationSchema.safeParse({
    proposalId: getStringValue(formData, "proposalId"),
  });

  if (!parsedInput.success) {
    return;
  }

  const [proposal] = await db
    .select({
      conversationId: healthCoachChangeProposals.conversationId,
      id: healthCoachChangeProposals.id,
      status: healthCoachChangeProposals.status,
      title: healthCoachChangeProposals.title,
    })
    .from(healthCoachChangeProposals)
    .where(
      and(
        eq(healthCoachChangeProposals.id, parsedInput.data.proposalId),
        eq(healthCoachChangeProposals.userId, user.id),
      ),
    )
    .limit(1);

  if (!proposal || proposal.status !== "pending") {
    return;
  }

  await db
    .update(healthCoachChangeProposals)
    .set({
      approvedAt: new Date(),
      status: "approved",
      updatedAt: new Date(),
    })
    .where(eq(healthCoachChangeProposals.id, proposal.id));

  try {
    const result = await applyHealthCoachProposal({
      proposalId: proposal.id,
      userId: user.id,
    });

    await appendHealthCoachAssistantMessage({
      content: result.successMessage,
      conversationId: proposal.conversationId,
    });

    revalidatePath("/");
    revalidatePath("/exercises");
    revalidatePath("/workouts");
    revalidatePath("/plans");
    revalidatePath("/history");
    revalidatePath("/statistics");
    revalidateHealthCoachPaths();
    revalidatePath(result.path);
    refresh();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "The proposal could not be applied.";

    await db
      .update(healthCoachChangeProposals)
      .set({
        errorMessage,
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(healthCoachChangeProposals.id, proposal.id));

    await appendHealthCoachAssistantMessage({
      content: `The proposal "${proposal.title}" could not be applied: ${errorMessage}`,
      conversationId: proposal.conversationId,
    });

    revalidateHealthCoachPaths();
    refresh();
  }
}
