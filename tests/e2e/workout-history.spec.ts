import { expect, test } from "@playwright/test";

import { getE2ECredentials, loginAsE2EUser } from "./support/auth";
import {
  addExerciseToTemplate,
  createExercise,
  createTemplate,
  resetE2EUserData,
  uniqueName,
} from "./support/data";

test.describe("workout and history flow", () => {
  test.beforeEach(async ({ page }) => {
    const credentials = getE2ECredentials();
    resetE2EUserData(credentials);
    await loginAsE2EUser(page, credentials);
  });

  test("logs a workout, finishes it, saves it as a template, and can delete it from history", async ({
    page,
  }) => {
    const firstExercise = uniqueName("E2E Squat");
    const secondExercise = uniqueName("E2E Plank");
    const templateName = uniqueName("E2E Workout Flow");
    const savedTemplateName = uniqueName("E2E Saved History Template");

    await createExercise(page, {
      name: firstExercise,
      categories: "Legs",
    });
    await createExercise(page, {
      name: secondExercise,
      categories: "Core",
      defaultUnit: "time",
    });

    await createTemplate(page, templateName);
    await addExerciseToTemplate(page, firstExercise);
    await addExerciseToTemplate(page, secondExercise);
    await page.getByRole("button", { name: "Start workout" }).click();

    const firstSetForm = page.locator("form").filter({
      has: page.getByRole("button", { name: "Log first set" }),
    });

    await expect(firstSetForm).toBeVisible();
    await firstSetForm.getByLabel("Reps").fill("5");
    await firstSetForm.getByLabel("Weight (kg)").fill("100");
    await firstSetForm.getByRole("button", { name: "Log first set" }).click();
    await expect(page.getByText("Set 1")).toBeVisible();

    await page.getByRole("button", { name: "Log next set" }).click();
    await expect(page.getByText("Set 2")).toBeVisible();

    const nextTimeRecommendation = page.getByRole("group", {
      name: "Next-time recommendation",
    });

    await nextTimeRecommendation.getByRole("button", { name: "Keep" }).click();
    await expect(page.getByRole("button", { name: "Next exercise" })).toBeEnabled();
    await page.getByRole("button", { name: "Next exercise" }).click();
    await expect(page.getByRole("button", { name: "Next exercise" })).toHaveCount(0);
    await expect(page.getByText(secondExercise, { exact: true }).first()).toBeVisible();

    const nextExerciseFirstSetForm = page.locator("form").filter({
      has: page.getByRole("button", { name: "Log first set" }),
    });

    await expect(nextExerciseFirstSetForm).toBeVisible();
    await nextExerciseFirstSetForm.getByLabel("Reps").fill("1");
    await nextExerciseFirstSetForm.getByLabel("Time (sec)").fill("90");
    await nextExerciseFirstSetForm
      .getByRole("button", { name: "Log first set" })
      .click();

    await nextTimeRecommendation.getByRole("button", { name: "Keep" }).click();
    await expect(page.getByRole("button", { name: "Finish workout" })).toBeEnabled();
    await page.getByRole("button", { name: "Finish workout" }).click();
    await expect(page).toHaveURL("/history");
    await expect(
      page.getByRole("heading", { name: "History", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /2 exercises 3 sets/i }).click();
    await expect(page.getByText(firstExercise, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(secondExercise, { exact: true }).first()).toBeVisible();

    await page.getByLabel("Template name").fill(savedTemplateName);
    await page.getByRole("button", { name: "Save template" }).click();
    await expect(page.getByText("Workout saved as a template.")).toBeVisible();

    await page
      .getByRole("button", { name: "Delete workout from history", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "No completed workouts yet.", exact: true }),
    ).toBeVisible();
  });
});
