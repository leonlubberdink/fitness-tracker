"use client";

import { useActionState } from "react";

import { loginAction } from "@/features/auth/actions";
import { initialLoginActionState } from "@/features/auth/state";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialLoginActionState,
  );
  const emailError = state.fieldErrors.email?.[0];
  const passwordError = state.fieldErrors.password?.[0];

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values.email}
          aria-invalid={emailError ? "true" : "false"}
          className={`w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none placeholder:text-muted ${
            emailError ? "border border-red-300" : "border border-border"
          }`}
          required
        />
        {emailError ? <p className="text-sm text-red-700">{emailError}</p> : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={passwordError ? "true" : "false"}
          className={`w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none placeholder:text-muted ${
            passwordError ? "border border-red-300" : "border border-border"
          }`}
          required
        />
        {passwordError ? (
          <p className="text-sm text-red-700">{passwordError}</p>
        ) : null}
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-opacity disabled:opacity-70"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
