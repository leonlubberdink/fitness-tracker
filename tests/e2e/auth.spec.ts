import { test, expect } from "@playwright/test";

import { getE2ECredentials, loginAsE2EUser } from "./support/auth";

test.describe("authentication", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects protected routes to login", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByText("Use your seeded email and password to enter the protected app."),
    ).toBeVisible();
  });

  test("signs in and signs out with the seeded user", async ({ page }) => {
    await loginAsE2EUser(page, getE2ECredentials());
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
