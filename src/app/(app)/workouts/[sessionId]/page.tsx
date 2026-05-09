import Link from "next/link";

import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/session";
import {
  addExerciseEntryAction,
  addSetAction,
  updateSetAction,
} from "@/features/workouts/actions";
import { requireWorkoutSessionForLogging } from "@/features/workouts/queries";

type WorkoutPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

function formatWorkoutDate(performedOn: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
  }).format(new Date(`${performedOn}T00:00:00`));
}

function formatWorkoutTime(startedAt: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeStyle: "short",
  }).format(startedAt);
}

function formatUnit(unit: "kg" | "bodyweight") {
  return unit === "kg" ? "kg" : "BW";
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await requireWorkoutSessionForLogging(user.id, sessionId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-6 py-8 sm:max-w-4xl sm:px-8">
      <section className="rounded-4xl border border-border bg-surface/90 p-6 shadow-[0_18px_60px_rgba(23,18,15,0.08)] backdrop-blur sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Workout In Progress
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Log session
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted sm:text-base">
                {formatWorkoutDate(session.performedOn)} starting at{" "}
                {formatWorkoutTime(session.startedAt)}.
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

      <section className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-[0_14px_40px_rgba(23,18,15,0.06)]">
          <div className="mb-5 space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Add exercise
            </h2>
            <p className="text-sm leading-6 text-muted">
              Pick an exercise from your reusable library and the first set will
              be created automatically.
            </p>
          </div>

          {session.exerciseOptions.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 px-5 py-6">
              <p className="text-base font-medium text-foreground">
                No exercises available yet.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Create exercises first, then come back here to log your workout.
              </p>
              <Link
                href="/exercises"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground"
              >
                Go to exercises
              </Link>
            </div>
          ) : (
            <form action={addExerciseEntryAction} className="space-y-4">
              <input type="hidden" name="sessionId" value={session.id} />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Exercise
                </span>
                <select
                  name="exerciseId"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none"
                  required
                >
                  <option value="">Select an exercise</option>
                  {session.exerciseOptions.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name} · {exercise.category}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground"
              >
                Add to workout
              </button>
            </form>
          )}
        </div>

        <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-[0_14px_40px_rgba(23,18,15,0.06)]">
          <div className="mb-5 space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Exercise entries
            </h2>
            <p className="text-sm leading-6 text-muted">
              Update reps and weight inline. Add sets as you progress through
              the session.
            </p>
          </div>

          {session.entries.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 px-5 py-8 text-center">
              <p className="text-base font-medium text-foreground">
                No exercises in this session yet.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Add your first exercise from the panel on the left to start
                logging sets.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {session.entries.map((entry) => (
                <section
                  key={entry.id}
                  className="rounded-[1.5rem] border border-border bg-background/75 p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-foreground">
                        {entry.exerciseNameSnapshot}
                      </h3>
                      <p className="text-sm text-muted">
                        {entry.exerciseCategorySnapshot} ·{" "}
                        {formatUnit(entry.unitSnapshot)}
                      </p>
                    </div>

                    <form action={addSetAction}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
                      >
                        Add set
                      </button>
                    </form>
                  </div>

                  <div className="space-y-3">
                    {entry.sets.map((set) => (
                      <form
                        key={set.id}
                        action={updateSetAction}
                        className="grid gap-3 rounded-[1.25rem] border border-border bg-surface px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto]"
                      >
                        <input type="hidden" name="setId" value={set.id} />
                        <div className="flex items-center text-sm font-semibold text-foreground">
                          Set {set.setNumber}
                        </div>

                        <label className="block space-y-1">
                          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                            Reps
                          </span>
                          <input
                            type="number"
                            name="reps"
                            min="1"
                            step="1"
                            defaultValue={set.reps}
                            className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none"
                            required
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                            Weight
                          </span>
                          <input
                            type="number"
                            name="weight"
                            min="0"
                            step="0.5"
                            defaultValue={set.weight}
                            className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none"
                            required
                          />
                        </label>

                        <button
                          type="submit"
                          className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground sm:self-end"
                        >
                          Save
                        </button>
                      </form>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
