import Link from "next/link";

import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/session";
import { getOpenWorkoutSessionForUser } from "@/features/workouts/queries";
import { startWorkoutSessionAction } from "@/features/workouts/actions";

function formatPerformedOn(performedOn: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(`${performedOn}T00:00:00`));
}

export default async function Home() {
  const user = await requireUser();
  const openSession = await getOpenWorkoutSessionForUser(user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8 sm:max-w-3xl sm:px-8">
      <div className="flex flex-1 flex-col justify-between gap-10">
        <section className="rounded-4xl border border-border bg-surface/90 p-6 shadow-[0_18px_60px_rgba(23,18,15,0.08)] backdrop-blur sm:p-10">
          <div className="mb-6 inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Auth Enabled
          </div>
          <div className="space-y-4">
            <h1 className="max-w-sm text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Lift Log
            </h1>
            <p className="max-w-xl text-sm leading-6 text-muted sm:text-base">
              You are signed in as{" "}
              <span className="font-semibold text-foreground">{user.email}</span>
              . The authenticated app shell is now active and ready for the
              workout features that follow.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          {openSession ? (
            <Link
              href={`/workouts/${openSession.id}`}
              className="rounded-[1.75rem] border border-border bg-accent px-5 py-5 text-accent-foreground shadow-[0_14px_40px_rgba(24,96,69,0.18)] transition-transform hover:-translate-y-0.5"
            >
              <div className="text-sm font-medium uppercase tracking-[0.16em] opacity-80">
                In Progress
              </div>
              <div className="mt-2 text-xl font-semibold">Continue workout</div>
              <p className="mt-2 text-sm leading-6 opacity-90">
                Open session from {formatPerformedOn(openSession.performedOn)}.
                Jump back into logging exercises and sets.
              </p>
            </Link>
          ) : (
            <form
              action={startWorkoutSessionAction}
              className="rounded-[1.75rem] border border-border bg-accent px-5 py-5 text-accent-foreground shadow-[0_14px_40px_rgba(24,96,69,0.18)]"
            >
              <div className="text-sm font-medium uppercase tracking-[0.16em] opacity-80">
                Today
              </div>
              <div className="mt-2 text-xl font-semibold">Start workout</div>
              <p className="mt-2 text-sm leading-6 opacity-90">
                Begin a new session for today and go straight into the logging
                screen.
              </p>
              <button
                type="submit"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/14 px-4 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-white/24"
              >
                Start session
              </button>
            </form>
          )}

          <Link
            href="/exercises"
            className="rounded-[1.75rem] border border-border bg-surface px-5 py-5 shadow-[0_14px_40px_rgba(23,18,15,0.06)] transition-transform hover:-translate-y-0.5"
          >
            <div className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
              Foundation
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">
              Exercise Library
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Manage reusable exercises before adding them into an active
              workout.
            </p>
          </Link>

          <form
            action={logoutAction}
            className="rounded-[1.75rem] border border-border bg-surface px-5 py-5 shadow-[0_14px_40px_rgba(23,18,15,0.06)] lg:col-span-2"
          >
            <div className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
              Account
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">
              End Session
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Clear the current session cookie and return to the login page.
            </p>
            <button
              type="submit"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Log out
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
