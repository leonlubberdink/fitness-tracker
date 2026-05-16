import { parseArgs } from "node:util";

import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";

config({
  path: ".env",
  override: true,
});

function getStringArg(value: string | boolean | undefined, flagName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required --${flagName} argument.`);
  }

  return value.trim();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

let poolToClose:
  | {
      end(): Promise<void>;
    }
  | undefined;

async function resetUserData(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const [{ db, pool }, schema] = await Promise.all([
    import("../src/db/client"),
    import("../src/db/schema"),
  ]);
  poolToClose = pool;

  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
    })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${normalizedEmail}`)
    .limit(1);

  if (!user) {
    throw new Error(`User ${normalizedEmail} does not exist.`);
  }

  await db.transaction(async (tx) => {
    await tx.delete(schema.plans).where(eq(schema.plans.userId, user.id));
    await tx
      .delete(schema.workoutSessions)
      .where(eq(schema.workoutSessions.userId, user.id));
    await tx
      .delete(schema.workoutTemplates)
      .where(eq(schema.workoutTemplates.userId, user.id));
    await tx.delete(schema.exercises).where(eq(schema.exercises.userId, user.id));
  });

  return user.email;
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

  const email = getStringArg(values.email, "email");
  const resetEmail = await resetUserData(email);

  console.log(`Reset E2E data for ${resetEmail}`);
}

void (async () => {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Reset E2E data failed: ${message}`);
    process.exitCode = 1;
  } finally {
    if (poolToClose) {
      await poolToClose.end();
    }
  }
})();
