import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";

import { hash } from "@node-rs/argon2";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({
  path: ".env",
  override: true,
});

type SeedAction = "created" | "updated";

const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

function getStringArg(value: string | boolean | undefined, flagName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required --${flagName} argument.`);
  }

  return value.trim();
}

function getPasswordArg(value: string | boolean | undefined) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Missing required --password argument.");
  }

  return value;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

let poolToClose:
  | {
      end(): Promise<void>;
    }
  | undefined;

async function seedUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const [{ db, pool }, { users }] = await Promise.all([
    import("../src/db/client"),
    import("../src/db/schema"),
  ]);
  poolToClose = pool;

  if (!validateEmail(normalizedEmail)) {
    throw new Error("Email must be a valid email address.");
  }

  const passwordHash = await hash(password, ARGON2_OPTIONS);

  const [existingUser] = await db
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  if (!existingUser) {
    const [createdUser] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: normalizedEmail,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
      });

    return {
      action: "created" as SeedAction,
      user: createdUser,
    };
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .returning({
      id: users.id,
      email: users.email,
    });

  return {
    action: "updated" as SeedAction,
    user: updatedUser,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: {
        type: "string",
      },
      password: {
        type: "string",
      },
    },
    strict: true,
  });

  const email = getStringArg(values.email, "email");
  const password = getPasswordArg(values.password);

  const result = await seedUser(email, password);

  console.log(
    `${result.action === "created" ? "Created" : "Updated"} seeded user ${result.user.email} (${result.user.id})`,
  );
}

void (async () => {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Seed user failed: ${message}`);
    process.exitCode = 1;
  } finally {
    if (poolToClose) {
      await poolToClose.end();
    }
  }
})();
