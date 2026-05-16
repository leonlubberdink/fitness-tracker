import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  dailyHealthCheckins,
  healthCoachChangeProposals,
  healthCoachConversations,
  healthCoachMessages,
  userHealthProfiles,
} from "@/db/schema";
import { formatDateForDisplay, getTodayDateKey } from "@/lib/date";

import {
  HEALTH_ACTIVITY_LEVEL_LABELS,
  HEALTH_GOAL_MODE_LABELS,
  HEALTH_SEX_LABELS,
} from "./constants";
import { isDateKey } from "./validation";

function formatWeightValue(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getResolvedSelectedDateKey(
  requestedDateKey: string | null | undefined,
  timeZone: string,
) {
  const todayDateKey = getTodayDateKey(timeZone);

  if (
    requestedDateKey &&
    isDateKey(requestedDateKey) &&
    requestedDateKey <= todayDateKey
  ) {
    return requestedDateKey;
  }

  return todayDateKey;
}

function buildCoachReadiness({
  hasAnyCheckin,
  profile,
}: {
  hasAnyCheckin: boolean;
  profile:
    | {
        birthDate: string | null;
        goalMode: "gain" | "lose" | "maintain" | null;
        heightCm: number | null;
        paceKgPerMonth: number | null;
        sex: "female" | "intersex" | "male" | "prefer_not_to_say" | null;
        targetWeightKg: number | null;
      }
    | null;
}) {
  const missingItems: string[] = [];

  if (!profile?.sex) {
    missingItems.push("Sex");
  }

  if (!profile?.birthDate) {
    missingItems.push("Birth date");
  }

  if (!profile?.heightCm) {
    missingItems.push("Height");
  }

  if (!profile?.goalMode) {
    missingItems.push("Goal mode");
  }

  if (!profile?.targetWeightKg) {
    missingItems.push("Target weight");
  }

  if (
    profile?.goalMode &&
    profile.goalMode !== "maintain" &&
    !profile.paceKgPerMonth
  ) {
    missingItems.push("Preferred monthly pace");
  }

  if (!hasAnyCheckin) {
    missingItems.push("At least one daily check-in");
  }

  return {
    isReady: missingItems.length === 0,
    missingItems,
  };
}

export async function getTodayHealthCheckinStatus(
  userId: string,
  timeZone: string,
) {
  const todayDateKey = getTodayDateKey(timeZone);
  const [todayCheckin] = await db
    .select({
      id: dailyHealthCheckins.id,
    })
    .from(dailyHealthCheckins)
    .where(
      and(
        eq(dailyHealthCheckins.userId, userId),
        eq(dailyHealthCheckins.recordedOn, todayDateKey),
      ),
    )
    .limit(1);

  return {
    todayDateKey,
    hasTodayCheckin: Boolean(todayCheckin),
  };
}

export async function getHealthCoachPageData(
  userId: string,
  timeZone: string,
  requestedDateKey?: string | null,
) {
  const todayDateKey = getTodayDateKey(timeZone);
  const selectedDateKey = getResolvedSelectedDateKey(requestedDateKey, timeZone);
  const [profile, recentCheckins, selectedCheckin] = await Promise.all([
    db
      .select({
        sex: userHealthProfiles.sex,
        birthDate: userHealthProfiles.birthDate,
        heightCm: userHealthProfiles.heightCm,
        activityLevel: userHealthProfiles.activityLevel,
        dietPreference: userHealthProfiles.dietPreference,
        allergies: userHealthProfiles.allergies,
        injuriesLimitations: userHealthProfiles.injuriesLimitations,
        goalMode: userHealthProfiles.goalMode,
        targetWeightKg: userHealthProfiles.targetWeightKg,
        paceKgPerMonth: userHealthProfiles.paceKgPerMonth,
      })
      .from(userHealthProfiles)
      .where(eq(userHealthProfiles.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: dailyHealthCheckins.id,
        recordedOn: dailyHealthCheckins.recordedOn,
        weightKg: dailyHealthCheckins.weightKg,
        readinessRating: dailyHealthCheckins.readinessRating,
        sorenessPainRating: dailyHealthCheckins.sorenessPainRating,
        note: dailyHealthCheckins.note,
      })
      .from(dailyHealthCheckins)
      .where(eq(dailyHealthCheckins.userId, userId))
      .orderBy(desc(dailyHealthCheckins.recordedOn))
      .limit(30),
    db
      .select({
        id: dailyHealthCheckins.id,
        recordedOn: dailyHealthCheckins.recordedOn,
        weightKg: dailyHealthCheckins.weightKg,
        readinessRating: dailyHealthCheckins.readinessRating,
        sorenessPainRating: dailyHealthCheckins.sorenessPainRating,
        note: dailyHealthCheckins.note,
      })
      .from(dailyHealthCheckins)
      .where(
        and(
          eq(dailyHealthCheckins.userId, userId),
          eq(dailyHealthCheckins.recordedOn, selectedDateKey),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const latestCheckin = recentCheckins[0] ?? null;
  const hasTodayCheckin = recentCheckins.some(
    (checkin) => checkin.recordedOn === todayDateKey,
  );
  const readiness = buildCoachReadiness({
    hasAnyCheckin: recentCheckins.length > 0,
    profile,
  });
  const weightTrend = [...recentCheckins]
    .reverse()
    .map((checkin) => ({
      recordedOn: checkin.recordedOn,
      shortLabel: formatDateForDisplay(checkin.recordedOn, timeZone, {
        day: "numeric",
        month: "short",
      }),
      weightKg: checkin.weightKg,
    }));
  const firstTrendPoint = weightTrend[0] ?? null;
  const latestTrendPoint = weightTrend.at(-1) ?? null;
  const trendDeltaKg =
    firstTrendPoint && latestTrendPoint
      ? Math.round((latestTrendPoint.weightKg - firstTrendPoint.weightKg) * 100) /
        100
      : null;

  return {
    hasTodayCheckin,
    latestCheckin,
    profile,
    readiness,
    recentCheckins,
    selectedCheckin,
    selectedDateKey,
    todayDateKey,
    weightSummary: {
      currentWeightLabel: formatWeightValue(latestCheckin?.weightKg),
      targetWeightLabel: formatWeightValue(profile?.targetWeightKg),
      trendDeltaKg,
    },
    weightTrend,
    labels: {
      activityLevel: profile?.activityLevel
        ? HEALTH_ACTIVITY_LEVEL_LABELS[profile.activityLevel]
        : null,
      goalMode: profile?.goalMode
        ? HEALTH_GOAL_MODE_LABELS[profile.goalMode]
        : null,
      sex: profile?.sex ? HEALTH_SEX_LABELS[profile.sex] : null,
    },
  };
}

export async function getHealthCoachChatPageData(userId: string) {
  const [conversation] = await db
    .select({
      id: healthCoachConversations.id,
      openaiConversationId: healthCoachConversations.openaiConversationId,
    })
    .from(healthCoachConversations)
    .where(eq(healthCoachConversations.userId, userId))
    .limit(1);

  if (!conversation) {
    return {
      conversationId: null,
      messages: [],
      pendingProposals: [],
      recentProposals: [],
    };
  }

  const [messages, pendingProposals, recentProposals] = await Promise.all([
    db
      .select({
        citations: healthCoachMessages.citations,
        content: healthCoachMessages.content,
        createdAt: healthCoachMessages.createdAt,
        id: healthCoachMessages.id,
        role: healthCoachMessages.role,
      })
      .from(healthCoachMessages)
      .where(eq(healthCoachMessages.conversationId, conversation.id))
      .orderBy(healthCoachMessages.createdAt)
      .limit(100),
    db
      .select({
        createdAt: healthCoachChangeProposals.createdAt,
        diff: healthCoachChangeProposals.diff,
        id: healthCoachChangeProposals.id,
        kind: healthCoachChangeProposals.kind,
        status: healthCoachChangeProposals.status,
        summary: healthCoachChangeProposals.summary,
        title: healthCoachChangeProposals.title,
      })
      .from(healthCoachChangeProposals)
      .where(
        and(
          eq(healthCoachChangeProposals.conversationId, conversation.id),
          eq(healthCoachChangeProposals.status, "pending"),
        ),
      )
      .orderBy(desc(healthCoachChangeProposals.createdAt)),
    db
      .select({
        appliedAt: healthCoachChangeProposals.appliedAt,
        createdAt: healthCoachChangeProposals.createdAt,
        errorMessage: healthCoachChangeProposals.errorMessage,
        id: healthCoachChangeProposals.id,
        kind: healthCoachChangeProposals.kind,
        rejectedAt: healthCoachChangeProposals.rejectedAt,
        status: healthCoachChangeProposals.status,
        summary: healthCoachChangeProposals.summary,
        title: healthCoachChangeProposals.title,
      })
      .from(healthCoachChangeProposals)
      .where(eq(healthCoachChangeProposals.conversationId, conversation.id))
      .orderBy(desc(healthCoachChangeProposals.createdAt))
      .limit(10),
  ]);

  return {
    conversationId: conversation.id,
    messages,
    pendingProposals,
    recentProposals,
  };
}
