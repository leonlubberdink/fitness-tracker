import { getWorkoutExportJsonSchema } from "@/features/workouts/export-schema";

export function GET() {
  return Response.json(getWorkoutExportJsonSchema());
}
