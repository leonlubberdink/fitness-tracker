import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { workoutSessions, workoutSets } from "@/db/schema";

export function openSessionPredicate() {
  return and(
    isNull(workoutSessions.completedAt),
    isNull(workoutSessions.endedAt),
  );
}

export function closedSessionPredicate() {
  return or(
    isNotNull(workoutSessions.completedAt),
    isNotNull(workoutSessions.endedAt),
  );
}

// Legacy measurements can still be displayed as recorded history, without claiming
// they were observed working sets.
export function recordedWorkSetPredicate() {
  return and(
    or(isNull(workoutSets.setType), eq(workoutSets.setType, "working")),
    isNotNull(workoutSets.reps),
    isNotNull(workoutSets.weight),
  );
}
