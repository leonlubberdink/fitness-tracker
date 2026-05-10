import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { logError } from "@/lib/logger";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await db.execute(sql`select 1`);

    return NextResponse.json({
      status: "ok",
      app: "ok",
      database: "ok",
      timestamp,
    });
  } catch (error) {
    logError("health.database.unavailable", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        status: "degraded",
        app: "ok",
        database: "error",
        timestamp,
      },
      {
        status: 503,
      },
    );
  }
}
