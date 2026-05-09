import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8 sm:max-w-3xl sm:px-8">
      <div className="flex flex-1 flex-col justify-between gap-10">
        <section className="rounded-4xl border border-border bg-surface/90 p-6 shadow-[0_18px_60px_rgba(23,18,15,0.08)] backdrop-blur sm:p-10">
          <div className="mb-6 inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            V1 Foundation
          </div>
          <div className="space-y-4">
            <h1 className="max-w-sm text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Lift Log
            </h1>
            <p className="max-w-xl text-sm leading-6 text-muted sm:text-base">
              Greenfield scaffold for a personal workout tracking app built with
              Next.js, TypeScript, and Tailwind CSS.
            </p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/login"
            className="rounded-[1.75rem] border border-border bg-accent px-5 py-5 text-accent-foreground shadow-[0_14px_40px_rgba(24,96,69,0.18)] transition-transform hover:-translate-y-0.5"
          >
            <div className="text-sm font-medium uppercase tracking-[0.16em] opacity-80">
              Next Step
            </div>
            <div className="mt-2 text-xl font-semibold">Login Placeholder</div>
            <p className="mt-2 text-sm leading-6 opacity-90">
              Static screen now. Seeded-user authentication comes in the next
              implementation step.
            </p>
          </Link>

          <div className="rounded-[1.75rem] border border-border bg-surface px-5 py-5 shadow-[0_14px_40px_rgba(23,18,15,0.06)]">
            <div className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
              Plan Saved
            </div>
            <div className="mt-2 text-xl font-semibold text-foreground">
              Root Documentation
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              The approved implementation plan is stored at the project root in
              <span className="font-mono text-foreground">
                {" "}
                IMPLEMENTATION_PLAN.md
              </span>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
