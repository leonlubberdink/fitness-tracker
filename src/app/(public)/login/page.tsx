import { redirectIfAuthenticated } from "@/features/auth/session";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login",
};

export default async function LoginPage() {
  await redirectIfAuthenticated();

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
            Use a seeded email and password to access the protected app.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
