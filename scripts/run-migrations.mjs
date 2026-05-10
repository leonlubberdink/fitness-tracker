import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "node:path";

config({
  path: ".env",
  override: false,
});

function getPoolConfig() {
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

const pool = new Pool(getPoolConfig());

const db = drizzle(pool);

try {
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });

  console.log("Database migrations completed.");
} finally {
  await pool.end();
}
