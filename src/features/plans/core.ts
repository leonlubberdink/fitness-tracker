import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { planWorkouts, plans } from "@/db/schema";
import { getTodayDateKey } from "@/lib/date";

import { getPlanCompletionState, getPlanWorkoutScheduledDate } from "./utils";

type DbExecutor = Pick<typeof db, "select" | "update">;

export async function syncPlanCompletionState(
  dbOrTx: DbExecutor,
  {
    planId,
    timeZone,
  }: {
    planId: string;
    timeZone: string;
  },
) {
  const [plan] = await dbOrTx
    .select({
      id: plans.id,
      startDate: plans.startDate,
      status: plans.status,
    })
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);

  if (!plan || plan.status !== "active" || !plan.startDate) {
    return;
  }

  const startDate = plan.startDate;

  const workouts = await dbOrTx
    .select({
      state: planWorkouts.state,
      weekNumber: planWorkouts.weekNumber,
      weekday: planWorkouts.weekday,
    })
    .from(planWorkouts)
    .where(eq(planWorkouts.planId, planId));

  const todayDateKey = getTodayDateKey(timeZone);
  const completionReady = getPlanCompletionState(
    workouts.map((workout) => ({
      scheduledDate: getPlanWorkoutScheduledDate(
        startDate,
        workout.weekNumber,
        workout.weekday,
      ),
      state: workout.state,
    })),
    todayDateKey,
  );

  if (!completionReady) {
    return;
  }

  await dbOrTx
    .update(plans)
    .set({
      completedAt: new Date(),
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(plans.id, planId));
}
