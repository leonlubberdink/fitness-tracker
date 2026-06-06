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

  test("loads seeded statistics and drills into one exercise", async ({
    page,
  }) => {
    await page.goto("/statistics");
    await expect(page.getByRole("heading", { name: "Statistics" })).toBeVisible();
    await expect(page.getByText("Overall volume over time")).toBeVisible();

    await page.goto("/statistics?exercise=snapshot%3Abarbell%20bench%20press");

    await expect(page.getByText("Selected exercise")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Barbell Bench Press" })).toBeVisible();
    await expect(page.getByText("Best ever:").first()).toBeVisible();
    await expect(page.getByText(/Best that day:/).first()).toBeVisible();
  });
});
