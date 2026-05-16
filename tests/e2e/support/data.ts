import { execFileSync } from "node:child_process";

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import type { E2ECredentials } from "./auth";

function runScript(scriptPath: string, args: string[]) {
  execFileSync(
    process.execPath,
    ["--env-file-if-exists=.env", "--import", "tsx", scriptPath, ...args],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    },
  );
}

export function resetE2EUserData(credentials: E2ECredentials) {
  runScript("scripts/reset-e2e-user-data.ts", ["--email", credentials.email]);
}

export function seedStatisticsDemo(credentials: E2ECredentials) {
  runScript("scripts/seed-statistics-demo.ts", ["--email", credentials.email]);
}

export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()}`;
}

export async function createExercise(
  page: Page,
  {
    name,
    categories,
    defaultUnit,
  }: {
    name: string;
    categories: string;
    defaultUnit?: "bodyweight" | "kg" | "time";
  },
) {
  await page.goto("/exercises");
  await expect(
    page.getByRole("heading", { name: "Exercises", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Categories").fill(categories);

  if (defaultUnit) {
    const selectField = page.getByRole("combobox", { name: "Default unit" });
    const stepCount = defaultUnit === "bodyweight" ? 1 : defaultUnit === "time" ? 2 : 0;

    await selectField.click();

    for (let index = 0; index < stepCount; index += 1) {
      await page.keyboard.press("ArrowDown");
    }

    await page.keyboard.press("Enter");
  }

  await page.getByRole("button", { name: "Create exercise" }).click();
  await expect(page.getByText(`Created ${name}.`)).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

export async function createTemplate(page: Page, templateName: string) {
  await page.goto("/workouts");
  await expect(
    page.getByRole("heading", { name: "Workouts", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Template name").fill(templateName);
  await page.getByRole("button", { name: "Create template" }).click();
  await expect(page).toHaveURL(/\/workouts\/templates\/.+/);
  await expect(
    page.getByText("Template created. Add exercises before starting it."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: templateName })).toBeVisible();
}

export async function addExerciseToTemplate(page: Page, exerciseName: string) {
  await page.getByRole("searchbox", { name: "Exercise" }).fill(exerciseName);
  await page
    .getByRole("button", {
      name: `Add ${exerciseName} to template`,
    })
    .evaluate((button: HTMLButtonElement) => button.click());
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("button", { name: `Remove ${exerciseName}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start workout" }),
  ).toBeEnabled();
}
