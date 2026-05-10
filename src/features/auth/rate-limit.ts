import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db/client";
import { loginRateLimits } from "@/db/schema";

import {
  LOGIN_RATE_LIMIT_BLOCK_MS,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from "./constants";

type RateLimitStatus =
  | {
      blocked: false;
    }
  | {
      blocked: true;
      retryAfterMinutes: number;
    };

function getRateLimitIdentifier(ipAddress: string, email: string) {
  return `${ipAddress}:${email}`;
}

export async function getClientIpAddress() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return realIp?.trim() || "unknown";
}

export async function checkLoginRateLimit(
  ipAddress: string,
  email: string,
): Promise<RateLimitStatus> {
  const identifier = getRateLimitIdentifier(ipAddress, email);
  const [record] = await db
    .select({
      blockedUntil: loginRateLimits.blockedUntil,
    })
    .from(loginRateLimits)
    .where(eq(loginRateLimits.identifier, identifier))
    .limit(1);

  if (!record?.blockedUntil || record.blockedUntil <= new Date()) {
    return {
      blocked: false,
    };
  }

  const retryAfterMs = record.blockedUntil.getTime() - Date.now();

  return {
    blocked: true,
    retryAfterMinutes: Math.max(1, Math.ceil(retryAfterMs / 60_000)),
  };
}

export async function recordFailedLoginAttempt(ipAddress: string, email: string) {
  const identifier = getRateLimitIdentifier(ipAddress, email);
  const now = new Date();

  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({
        id: loginRateLimits.id,
        attemptCount: loginRateLimits.attemptCount,
        firstAttemptAt: loginRateLimits.firstAttemptAt,
        blockedUntil: loginRateLimits.blockedUntil,
      })
      .from(loginRateLimits)
      .where(eq(loginRateLimits.identifier, identifier))
      .limit(1);

    if (!record) {
      await tx.insert(loginRateLimits).values({
        id: randomUUID(),
        identifier,
        attemptCount: 1,
        firstAttemptAt: now,
      });
      return;
    }

    const windowExpired =
      now.getTime() - record.firstAttemptAt.getTime() > LOGIN_RATE_LIMIT_WINDOW_MS;

    const nextAttemptCount = windowExpired ? 1 : record.attemptCount + 1;
    const nextFirstAttemptAt = windowExpired ? now : record.firstAttemptAt;
    const blockedUntil =
      nextAttemptCount >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS
        ? new Date(now.getTime() + LOGIN_RATE_LIMIT_BLOCK_MS)
        : null;

    await tx
      .update(loginRateLimits)
      .set({
        attemptCount: nextAttemptCount,
        firstAttemptAt: nextFirstAttemptAt,
        blockedUntil,
        updatedAt: now,
      })
      .where(eq(loginRateLimits.id, record.id));
  });
}

export async function clearLoginRateLimit(ipAddress: string, email: string) {
  const identifier = getRateLimitIdentifier(ipAddress, email);

  await db
    .delete(loginRateLimits)
    .where(eq(loginRateLimits.identifier, identifier));
}
