import { test, expect } from "@playwright/test";

import { getE2ECredentials, loginAsE2EUser } from "./support/auth";
import { resetE2EUserData } from "./support/data";

test.describe("home", () => {
  test("shows shortcut cards when the user has no active plan or open workout", async ({
    page,
  }) => {
    const credentials = getE2ECredentials();
    resetE2EUserData(credentials);

    await loginAsE2EUser(page, credentials);
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Welcome back.", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Start by creating exercises, building a workout template, or planning your next block.",
      ),
    ).toBeVisible();

    const main = page.getByRole("main");

    await expect(
      main.getByRole("link", {
        name: /Exercises Create your exercise library first\./,
      }),
    ).toBeVisible();
    await expect(
      main.getByRole("link", {
        name: /Workout templates Build a reusable workout and start training\./,
      }),
    ).toBeVisible();
    await expect(
      main.getByRole("link", {
        name: /Plans Schedule a multi-week block around your templates\./,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Continue workout" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open active plan" }),
    ).toHaveCount(0);
  });
});
