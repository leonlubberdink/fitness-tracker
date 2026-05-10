import { NextResponse } from "next/server";

import { getCurrentUser } from "@/features/auth/session";
import { searchExercisesForUser } from "@/features/exercises/queries";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const exercises = await searchExercisesForUser(user.id, searchQuery);

  return NextResponse.json({
    exercises,
  });
}
