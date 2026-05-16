import { test, expect } from "@playwright/test";

import { getE2ECredentials, loginAsE2EUser } from "./support/auth";
import {
  addExerciseToTemplate,
  createExercise,
  createTemplate,
  resetE2EUserData,
  uniqueName,
} from "./support/data";

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayWeekday() {
  const day = new Date(`${getTodayDateKey()}T00:00:00.000Z`).getUTCDay();
  return String(day === 0 ? 7 : day);
}

test("creates, starts, and launches a scheduled plan workout", async ({ page }) => {
  const credentials = getE2ECredentials();
  resetE2EUserData(credentials);
  await loginAsE2EUser(page, credentials);
  const templateName = uniqueName("E2E Plan Template");
  const exerciseName = uniqueName("E2E Plan Exercise");
  const planName = uniqueName("E2E Plan");

  await createExercise(page, {
    name: exerciseName,
    categories: "Full Body",
  });
  await createTemplate(page, templateName);
  await addExerciseToTemplate(page, exerciseName);

  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: "Plans", exact: true })).toBeVisible();

  await page.getByLabel("Plan name").fill(planName);
  await page.getByLabel("Goal").fill("Verify the first Playwright plan flow.");
  await page.getByLabel("Weeks").fill("6");
  await page.getByRole("button", { name: "Create draft" }).click();

  await expect(page).toHaveURL(/\/plans\/.+/);
  await expect(page.getByText("Plan created. Add workouts week by week.")).toBeVisible();
  await expect(page.getByRole("heading", { name: planName })).toBeVisible();

  await page.locator('input[name="weekday"]').evaluate((element, value) => {
    const input = element as HTMLInputElement;
    input.value = value as string;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, getTodayWeekday());
  await page.getByRole("button", { name: "Add planned workout" }).click();
  await expect(page.getByText(templateName)).toBeVisible();

  await page.getByLabel("Start date").fill(getTodayDateKey());
  await page.getByRole("button", { name: "Start plan" }).click();
  await expect(page.getByText("Plan started.")).toBeVisible();
  await expect(page.getByText(/· Today$/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start today's workout" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Start (today's|scheduled) workout/i }).click();
  await expect(page).toHaveURL(/\/workouts\/.+/);
  await expect(page.getByRole("heading", { name: "Current workout." })).toBeVisible();
  await expect(page.getByText(exerciseName, { exact: true }).first()).toBeVisible();
});
