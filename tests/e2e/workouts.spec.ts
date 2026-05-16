import { test, expect } from "@playwright/test";

function getUniqueTemplateName() {
  return `E2E Template ${Date.now()}`;
}

test("creates a workout template", async ({ page }) => {
  const templateName = getUniqueTemplateName();

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
