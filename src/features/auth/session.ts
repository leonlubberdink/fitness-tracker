import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cache } from "react";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { SESSION_COOKIE_NAME } from "./constants";
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? "30");
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

type SessionUser = {
  id: string;
  email: string;
  isActive: boolean;
  timeZone: string;
};

type CurrentSession = {
  sessionId: string;
  user: SessionUser;
} | null;

function getSessionExpiryDate() {
  return new Date(Date.now() + SESSION_TTL_MS);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function readSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function createUserSession(userId: string) {
  const sessionToken = randomBytes(32).toString("base64url");
  const sessionTokenHash = hashSessionToken(sessionToken);
  const expiresAt = getSessionExpiryDate();

  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: sessionTokenHash,
    expiresAt,
  });

  await setSessionCookie(sessionToken, expiresAt);
}

export async function deleteSessionByToken(sessionToken: string) {
  await db
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashSessionToken(sessionToken)));
}

export const getCurrentSession = cache(async (): Promise<CurrentSession> => {
  const sessionToken = await readSessionToken();

  if (!sessionToken) {
    return null;
  }

  const sessionTokenHash = hashSessionToken(sessionToken);
  const [result] = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      isActive: users.isActive,
      timeZone: users.timeZone,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, sessionTokenHash),
        gt(sessions.expiresAt, new Date()),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    sessionId: result.sessionId,
    user: {
      id: result.userId,
      email: result.email,
      isActive: result.isActive,
      timeZone: result.timeZone,
    },
  };
});

export async function getCurrentUser() {
  const currentSession = await getCurrentSession();
  return currentSession?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }
}
