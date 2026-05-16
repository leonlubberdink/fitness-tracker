import { expect, test } from "@playwright/test";

import { getE2ECredentials, loginAsE2EUser } from "./support/auth";
import { resetE2EUserData, seedStatisticsDemo } from "./support/data";

test.describe("statistics", () => {
  test.beforeEach(async ({ page }) => {
    const credentials = getE2ECredentials();
    resetE2EUserData(credentials);
    seedStatisticsDemo(credentials);
    await loginAsE2EUser(page, credentials);
  });

  test("loads seeded statistics, changes range, and drills into one exercise", async ({
    page,
  }) => {
    await page.goto("/statistics");
    await expect(page.getByRole("heading", { name: "Statistics" })).toBeVisible();
    await expect(page.getByRole("button", { name: "12 weeks" })).toBeVisible();

    await page.getByRole("button", { name: "30 days" }).click();
    await page.goto(
      "/statistics?range=30d&exercise=snapshot%3Abarbell%20bench%20press",
    );

    await expect(page.getByText("Selected exercise")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Barbell Bench Press" })).toBeVisible();
    await expect(page.getByText("Best ever:").first()).toBeVisible();
    await expect(page.getByText(/Best that day:/).first()).toBeVisible();
  });
});
