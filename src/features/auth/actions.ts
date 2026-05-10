"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashLogValue, logInfo, logWarn } from "@/lib/logger";

import {
  clearSessionCookie,
  createUserSession,
  deleteSessionByToken,
  getCurrentSession,
  readSessionToken,
} from "./session";
import { verifyPassword } from "./password";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  getClientIpAddress,
  recordFailedLoginAttempt,
} from "./rate-limit";
import type { LoginActionState } from "./state";
import { loginSchema } from "./validation";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const rawEmail = typeof emailValue === "string" ? emailValue : "";

  if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
    return {
      error: "Enter your email and password.",
      fieldErrors: {},
      values: {
        email: rawEmail.trim(),
      },
    };
  }

  const parsedInput = loginSchema.safeParse({
    email: emailValue,
    password: passwordValue,
  });

  if (!parsedInput.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      values: {
        email: rawEmail.trim(),
      },
    };
  }

  const email = normalizeEmail(parsedInput.data.email);
  const password = parsedInput.data.password;
  const ipAddress = await getClientIpAddress();
  const rateLimitStatus = await checkLoginRateLimit(ipAddress, email);

  if (rateLimitStatus.blocked) {
    logWarn("auth.login.rate_limited", {
      emailHash: hashLogValue(email),
      ipHash: hashLogValue(ipAddress),
      retryAfterMinutes: rateLimitStatus.retryAfterMinutes,
    });

    return {
      error: `Too many login attempts. Try again in about ${rateLimitStatus.retryAfterMinutes} minute${rateLimitStatus.retryAfterMinutes === 1 ? "" : "s"}.`,
      fieldErrors: {},
      values: {
        email,
      },
    };
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (!user || !user.isActive) {
    await recordFailedLoginAttempt(ipAddress, email);
    logWarn("auth.login.failed", {
      emailHash: hashLogValue(email),
      ipHash: hashLogValue(ipAddress),
      reason: "user_not_found_or_inactive",
    });

    return {
      error: "Invalid email or password.",
      fieldErrors: {},
      values: {
        email,
      },
    };
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    await recordFailedLoginAttempt(ipAddress, email);
    logWarn("auth.login.failed", {
      emailHash: hashLogValue(email),
      ipHash: hashLogValue(ipAddress),
      reason: "invalid_password",
    });

    return {
      error: "Invalid email or password.",
      fieldErrors: {},
      values: {
        email,
      },
    };
  }

  await db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await clearLoginRateLimit(ipAddress, email);
  await createUserSession(user.id);
  logInfo("auth.login.succeeded", {
    userId: user.id,
    emailHash: hashLogValue(email),
    ipHash: hashLogValue(ipAddress),
  });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction() {
  const currentSession = await getCurrentSession();

  if (currentSession) {
    const sessionToken = await readSessionToken();

    if (sessionToken) {
      await deleteSessionByToken(sessionToken);
    }

    logInfo("auth.logout", {
      userId: currentSession.user.id,
      sessionId: currentSession.sessionId,
    });
  }

  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/login");
}
