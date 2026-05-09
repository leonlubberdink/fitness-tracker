export const metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-8">
      <section className="w-full rounded-[2rem] border border-border bg-surface/95 p-6 shadow-[0_18px_60px_rgba(23,18,15,0.08)] backdrop-blur">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Seeded Users Only
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="text-sm leading-6 text-muted">
            This screen is scaffolded now so the auth flow can be wired in the
            next implementation step.
          </p>
        </div>

        <form className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted"
              readOnly
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Password</span>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted"
              readOnly
            />
          </label>

          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground opacity-60"
          >
            Authentication wiring starts in Step 2
          </button>
        </form>
      </section>
    </main>
  );
}
