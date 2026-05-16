import { test, expect } from "@playwright/test";

function getUniquePlanName() {
  return `E2E Plan ${Date.now()}`;
}

test("creates a draft plan", async ({ page }) => {
  const planName = getUniquePlanName();

  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: "Plans", exact: true })).toBeVisible();

  await page.getByLabel("Plan name").fill(planName);
  await page.getByLabel("Goal").fill("Verify the first Playwright plan flow.");
  await page.getByLabel("Weeks").fill("6");
  await page.getByRole("button", { name: "Create draft" }).click();

  await expect(page).toHaveURL(/\/plans\/.+/);
  await expect(page.getByText("Plan created. Add workouts week by week.")).toBeVisible();
  await expect(page.getByRole("heading", { name: planName })).toBeVisible();
});
