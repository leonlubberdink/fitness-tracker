import { expect, test } from "@playwright/test";

import { getE2ECredentials, loginAsE2EUser } from "./support/auth";
import {
  createExercise,
  resetE2EUserData,
  uniqueName,
} from "./support/data";

test.describe("exercise library", () => {
  test.beforeEach(async ({ page }) => {
    const credentials = getE2ECredentials();
    resetE2EUserData(credentials);
    await loginAsE2EUser(page, credentials);
  });

  test("creates, filters, edits, and deletes an exercise", async ({ page }) => {
    const exerciseName = uniqueName("E2E Bench");
    const updatedExerciseName = uniqueName("E2E Incline Bench");

    await createExercise(page, {
      name: exerciseName,
      categories: "Chest, Push",
    });

    await createExercise(page, {
      name: uniqueName("E2E Row"),
      categories: "Back, Pull",
    });

    await page.getByPlaceholder("Search exercises").fill("bench");
    await expect(page.getByText(exerciseName)).toBeVisible();

    await page
      .getByRole("button", { name: `Edit ${exerciseName}` })
      .evaluate((button: HTMLButtonElement) => button.click());
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel("Name").fill(updatedExerciseName);
    await editDialog.getByLabel("Categories").fill("Chest, Upper");
    await editDialog.getByRole("combobox", { name: "Default unit" }).click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await editDialog.getByRole("button", { name: "Save changes" }).click();

    await expect(editDialog).not.toBeVisible();
    await expect(page.getByText(updatedExerciseName, { exact: true })).toBeVisible();
    await expect(page.getByText(exerciseName, { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: `Delete ${updatedExerciseName}` }).click();
    await expect(
      page.getByText(`Removed ${updatedExerciseName} from your exercise library.`),
    ).toBeVisible();
    await expect(page.getByText(updatedExerciseName, { exact: true })).toHaveCount(0);
  });
});
