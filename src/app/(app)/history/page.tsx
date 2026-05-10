import Link from "next/link";

import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/session";
import { getCompletedWorkoutHistoryForUser } from "@/features/workouts/queries";

function formatPerformedOn(performedOn: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
  }).format(new Date(`${performedOn}T00:00:00`));
}

function formatTime(value: Date | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeStyle: "short",
  }).format(value);
}

function formatSetWeight(unit: "kg" | "bodyweight", weight: number) {
  if (unit === "bodyweight") {
    return weight === 0 ? "BW" : `${weight} BW`;
  }

  return `${weight} kg`;
}

export default async function HistoryPage() {
  const user = await requireUser();
  const historyGroups = await getCompletedWorkoutHistoryForUser(user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-6 py-8 sm:max-w-4xl sm:px-8">
      <section className="rounded-4xl border border-border bg-surface/90 p-6 shadow-[0_18px_60px_rgba(23,18,15,0.08)] backdrop-blur sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Workout History
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Completed sessions
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Review finished workouts by date. Expand any session to inspect
                each exercise entry and its logged sets.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Home
            </Link>
            <Link
              href="/exercises"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Exercises
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </section>

      {historyGroups.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-border bg-surface px-6 py-10 text-center shadow-[0_14px_40px_rgba(23,18,15,0.06)]">
          <p className="text-lg font-semibold text-foreground">
            No completed workouts yet.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Finish your first session and it will appear here with its exercise
            and set details.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground"
          >
            Start a workout
          </Link>
        </section>
      ) : (
        <div className="space-y-6">
          {historyGroups.map((group) => (
            <section
              key={group.performedOn}
              className="rounded-[2rem] border border-border bg-surface p-5 shadow-[0_14px_40px_rgba(23,18,15,0.06)]"
            >
              <h2 className="text-lg font-semibold text-foreground">
                {formatPerformedOn(group.performedOn)}
              </h2>

              <div className="mt-4 space-y-3">
                {group.sessions.map((session) => (
                  <details
                    key={session.id}
                    className="rounded-[1.5rem] border border-border bg-background/75 p-4"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
                            {formatTime(session.startedAt)} to{" "}
                            {formatTime(session.completedAt)}
                          </div>
                          <div className="mt-1 text-base font-semibold text-foreground">
                            {session.exerciseCount} exercises · {session.totalSets}{" "}
                            sets
                          </div>
                        </div>
                        <div className="text-sm text-muted">
                          Tap to expand
                        </div>
                      </div>
                    </summary>

                    <div className="mt-4 space-y-4 border-t border-border pt-4">
                      {session.entries.map((entry) => (
                        <section
                          key={entry.id}
                          className="rounded-[1.25rem] border border-border bg-surface px-4 py-4"
                        >
                          <div className="mb-3">
                            <h3 className="text-base font-semibold text-foreground">
                              {entry.exerciseNameSnapshot}
                            </h3>
                            <p className="text-sm text-muted">
                              {entry.exerciseCategorySnapshot} ·{" "}
                              {entry.unitSnapshot === "kg" ? "kg" : "BW"}
                            </p>
                          </div>

                          <div className="space-y-2">
                            {entry.sets.map((set) => (
                              <div
                                key={set.id}
                                className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-3 rounded-2xl border border-border bg-background px-3 py-3 text-sm"
                              >
                                <div className="font-semibold text-foreground">
                                  Set {set.setNumber}
                                </div>
                                <div className="text-muted">
                                  {set.reps} reps
                                </div>
                                <div className="text-right font-medium text-foreground">
                                  {formatSetWeight(entry.unitSnapshot, set.weight)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
