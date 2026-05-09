import Link from "next/link";

import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/session";
import { getExercisesForUser } from "@/features/exercises/queries";

import { ExerciseCreateForm } from "./exercise-create-form";

type ExercisesPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

function formatDefaultUnit(unit: "kg" | "bodyweight") {
  return unit === "kg" ? "kg" : "bodyweight";
}

export default async function ExercisesPage({
  searchParams,
}: ExercisesPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim() ?? "";
  const exerciseList = await getExercisesForUser(user.id, query);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-6 py-8 sm:max-w-3xl sm:px-8">
      <section className="rounded-4xl border border-border bg-surface/90 p-6 shadow-[0_18px_60px_rgba(23,18,15,0.08)] backdrop-blur sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Reusable Exercises
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Exercises
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted sm:text-base">
                Create exercises once, search them quickly, and reuse them in
                workout logging later. Signed in as{" "}
                <span className="font-semibold text-foreground">{user.email}</span>
                .
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
              Create exercise
            </h2>
            <p className="text-sm leading-6 text-muted">
              Keep naming consistent so your workout history stays easy to scan.
            </p>
          </div>

          <ExerciseCreateForm />
        </div>

        <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-[0_14px_40px_rgba(23,18,15,0.06)]">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Exercise library
              </h2>
              <p className="text-sm leading-6 text-muted">
                Search by exercise name and reuse the list as your foundation
                for workout entry.
              </p>
            </div>

            <form className="w-full sm:max-w-xs">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Search
                </span>
                <div className="flex gap-2">
                  <input
                    type="search"
                    name="q"
                    defaultValue={query}
                    placeholder="Search exercises"
                    className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
                  >
                    Search
                  </button>
                </div>
              </label>
            </form>
          </div>

          {exerciseList.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 px-5 py-8 text-center">
              <p className="text-base font-medium text-foreground">
                {query ? "No exercises match that search." : "No exercises yet."}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {query
                  ? "Try a different name or clear the search."
                  : "Create your first exercise to start building the reusable library."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {exerciseList.map((exercise) => (
                <li
                  key={exercise.id}
                  className="rounded-[1.5rem] border border-border bg-background/75 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-base font-semibold text-foreground">
                        {exercise.name}
                      </p>
                      <p className="text-sm text-muted">{exercise.category}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted">
                      {formatDefaultUnit(exercise.defaultUnit)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
