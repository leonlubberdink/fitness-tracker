import { execFileSync } from "node:child_process";

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export type E2ECredentials = {
  email: string;
  password: string;
};

export function getE2ECredentials(): E2ECredentials {
  const email = process.env.E2E_USER_EMAIL?.trim();
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing E2E_USER_EMAIL or E2E_USER_PASSWORD. Set both before running Playwright.",
    );
  }

  return {
    email,
    password,
  };
}

export function seedE2EUser(credentials: E2ECredentials) {
  execFileSync(
    process.execPath,
    [
      "--env-file-if-exists=.env",
      "--import",
      "tsx",
      "scripts/seed-user.ts",
      "--email",
      credentials.email,
      "--password",
      credentials.password,
    ],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    },
  );
}

export async function loginAsE2EUser(page: Page, credentials: E2ECredentials) {
  await page.goto("/login");
  if (!page.url().endsWith("/login")) {
    await expect(page.getByText(credentials.email)).toBeVisible();
    return;
  }

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Personal Training App" })).toBeVisible();
  await expect(page.getByText(credentials.email)).toBeVisible();
}
