import { expect, test } from "@playwright/test";

import { getE2ECredentials, loginAsE2EUser } from "./support/auth";
import {
  addExerciseToTemplate,
  createExercise,
  createTemplate,
  resetE2EUserData,
  uniqueName,
} from "./support/data";

test.describe("template management", () => {
  test.beforeEach(async ({ page }) => {
    const credentials = getE2ECredentials();
    resetE2EUserData(credentials);
    await loginAsE2EUser(page, credentials);
  });

  test("creates a template, adds exercises, renames it, and can start a workout", async ({
    page,
  }) => {
    const pushExercise = uniqueName("E2E Push");
    const pullExercise = uniqueName("E2E Pull");
    const templateName = uniqueName("E2E Template");
    const renamedTemplateName = uniqueName("E2E Template Updated");

    await createExercise(page, {
      name: pushExercise,
      categories: "Chest, Push",
    });
    await createExercise(page, {
      name: pullExercise,
      categories: "Back, Pull",
      defaultUnit: "bodyweight",
    });

    await createTemplate(page, templateName);
    await addExerciseToTemplate(page, pushExercise);
    await addExerciseToTemplate(page, pullExercise);

    await page.getByLabel("Template name").fill(renamedTemplateName);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Template details saved.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: renamedTemplateName }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Start workout" }).click();
    await expect(page).toHaveURL(/\/workouts\/(?!templates\/)[^/?#]+/);
    await expect(page.getByRole("heading", { name: "Current workout." })).toBeVisible();
    await expect(page.getByText(pushExercise, { exact: true }).first()).toBeVisible();
  });

  test("shows live workout notes and prescription from the template on an active workout", async ({
    page,
  }) => {
    const pushExercise = uniqueName("E2E Push");
    const templateName = uniqueName("E2E Notes Template");
    const initialNotes = "Keep rest short and stay smooth.";
    const updatedNotes = "Use two minutes of rest and pause the last rep.";
    const prescription = {
      setsReps: "4 x 4-6",
      restTime: "2-3 min",
      notes: "Primary strength exercise",
    };

    await createExercise(page, {
      name: pushExercise,
      categories: "Chest, Push",
    });

    await createTemplate(page, templateName);
    const templateUrl = page.url();

    await page.getByLabel("Workout description").fill(initialNotes);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Template details saved.")).toBeVisible();

    await addExerciseToTemplate(page, pushExercise, prescription);
    await page.getByRole("button", { name: "Start workout" }).click();

    await expect(page).toHaveURL(/\/workouts\/(?!templates\/)[^/?#]+$/);
    const workoutUrl = page.url();

    await expect(page.getByText("Workout notes")).toBeVisible();
    await expect(page.getByText(initialNotes)).toBeVisible();
    await expect(page.getByText("Prescription")).toBeVisible();
    await expect(page.getByText(prescription.setsReps, { exact: true })).toBeVisible();
    await expect(page.getByText(prescription.restTime, { exact: true })).toBeVisible();
    await expect(page.getByText(prescription.notes, { exact: true })).toBeVisible();

    await page.goto(templateUrl);
    await page.getByLabel("Workout description").fill(updatedNotes);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Template details saved.")).toBeVisible();

    await page.goto(workoutUrl);
    await expect(page).toHaveURL(workoutUrl);
    await expect(page.getByText("Workout notes")).toBeVisible();
    await expect(page.getByText(updatedNotes)).toBeVisible();
    await expect(page.getByText(initialNotes)).toHaveCount(0);
  });
});
