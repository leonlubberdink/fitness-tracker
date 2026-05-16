import { test, expect } from "@playwright/test";

import { getE2ECredentials, loginAsE2EUser } from "./support/auth";
import { resetE2EUserData, uniqueName } from "./support/data";

test("creates a workout template", async ({ page }) => {
  const credentials = getE2ECredentials();
  resetE2EUserData(credentials);
  await loginAsE2EUser(page, credentials);
  const templateName = uniqueName("E2E Template");

  await page.goto("/workouts");
  await expect(page.getByRole("heading", { name: "Workouts" })).toBeVisible();

  await page.getByLabel("Template name").fill(templateName);
  await page.getByRole("button", { name: "Create template" }).click();

  await expect(page).toHaveURL(/\/workouts\/templates\/.+/);
  await expect(
    page.getByText("Template created. Add exercises before starting it."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: templateName })).toBeVisible();
});
