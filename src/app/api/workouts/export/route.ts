import { getCurrentUser } from "@/features/auth/session";
import { exportRangeSchema } from "@/features/workouts/export-schema";
import { getWorkoutExportForUser } from "@/features/workouts/export-queries";

export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers },
    );
  const params = new URL(request.url).searchParams;
  const range = exportRangeSchema.safeParse({
    start: params.get("start") || undefined,
    end: params.get("end") || undefined,
  });
  if (!range.success)
    return Response.json(
      { error: range.error.issues[0]?.message ?? "Invalid date range." },
      { status: 400, headers },
    );
  const document = await getWorkoutExportForUser(user, range.data);
  return new Response(JSON.stringify(document, null, 2) + "\n", {
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="workout-history-${range.data.start ?? "all"}-${range.data.end ?? "latest"}.json"`,
    },
  });
}
