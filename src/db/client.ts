import { drizzle } from "drizzle-orm/node-postgres";
import { type PoolConfig, Pool } from "pg";

import * as schema from "./schema";

function getPoolConfig(): PoolConfig {
  const host = process.env.PGHOST;
  const port = process.env.PGPORT;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  if (host || port || user || password || database) {
    return {
      host: host ?? "localhost",
      port: port ? Number(port) : 5432,
      user,
      password,
      database,
    };
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Database connection is not configured. Set DATABASE_URL or the PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE variables.",
    );
  }

  return {
    connectionString: databaseUrl,
  };
}

const globalForDb = globalThis as typeof globalThis & {
  __fitnessAppPool?: Pool;
};

const pool =
  globalForDb.__fitnessAppPool ??
  new Pool(getPoolConfig());

if (process.env.NODE_ENV !== "production") {
  globalForDb.__fitnessAppPool = pool;
}

export { pool };

export const db = drizzle({
  client: pool,
  schema,
});
