import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { expect, test, type Page } from "@playwright/test";
import { getE2ECredentials, loginAsE2EUser } from "./support/auth";
import {
  addExerciseToTemplate,
  createExercise,
  createTemplate,
  resetE2EUserData,
  uniqueName,
} from "./support/data";
import type { WorkoutExport } from "../../src/features/workouts/export-schema";

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(
  JSON.parse(
    readFileSync("docs/schemas/workout-export.v2.schema.json", "utf8"),
  ),
);

// Fetch inside the signed-in browser, using the same cookie handling as the UI.
async function fetchExport(
  page: Page,
  path = "/api/workouts/export",
): Promise<WorkoutExport> {
  const result = await page.evaluate(async (url) => {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
    });
    return { status: response.status, body: await response.json() };
  }, path);
  expect(result.status, JSON.stringify(result.body)).toBe(200);
  return result.body as WorkoutExport;
}

test.describe("complete strength history export", () => {
  test("closes empty aborted and skipped workouts and retains their prescriptions", async ({
    page,
  }) => {
    const exercise = uniqueName("Export empty outcome");
    await createExercise(page, { name: exercise, categories: "Legs" });
    await createTemplate(page, uniqueName("Export empty outcomes"));
    await addExerciseToTemplate(page, exercise);
    const templateUrl = page.url();
    for (const outcome of ["Abort workout", "Skip workout"]) {
      await page.goto(templateUrl);
      await page
        .getByRole("button", { name: "Start workout", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Start workout" })
        .getByRole("button", { name: "Start workout" })
        .click();
      await page.getByRole("button", { name: outcome, exact: true }).click();
      await expect(page).toHaveURL("/history");
    }
    const document = await fetchExport(page);
    expect(validate(document), JSON.stringify(validate.errors)).toBe(true);
    expect(document.sessions.map((session) => session.status).sort()).toEqual([
      "aborted",
      "skipped",
    ]);
    expect(document.coverage.set_count).toBe(0);
    for (const session of document.sessions) {
      expect(session.completed_at).toBeNull();
      expect(session.ended_at).not.toBeNull();
      expect(session.exercise_entries[0]).toMatchObject({
        status: "skipped",
        prescription_snapshot: { sets_reps: "4 x 4-6" },
        sets: [],
      });
    }
  });

  test.beforeEach(async ({ page }) => {
    const credentials = getE2ECredentials();
    resetE2EUserData(credentials);
    await loginAsE2EUser(page, credentials);
  });

  test("downloads all stored sessions beyond the UI limit and filters inclusive dates", async ({
    page,
  }) => {
    execFileSync(
      process.execPath,
      [
        "--env-file-if-exists=.env",
        "--import",
        "tsx",
        "scripts/seed-workout-export-e2e.ts",
        "--email",
        getE2ECredentials().email,
      ],
      { cwd: process.cwd(), stdio: "inherit", env: process.env },
    );
    await page.goto("/history");
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export all history (JSON)" })
      .click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).not.toBeNull();
    const document: WorkoutExport = JSON.parse(readFileSync(path!, "utf8"));
    expect(validate(document), JSON.stringify(validate.errors)).toBe(true);
    expect(document.sessions).toHaveLength(35);
    expect(document.coverage.set_count).toBe(175);
    expect(
      document.sessions.some((session) => session.status === "partial"),
    ).toBe(true);
    expect(
      document.sessions.some((session) => session.status === "aborted"),
    ).toBe(true);
    expect(document.skipped_planned_workouts).toHaveLength(1);
    expect(JSON.stringify(document)).not.toContain(getE2ECredentials().email);
    const repeated = await fetchExport(page);
    expect(repeated.sessions).toEqual(document.sessions);
    const selected = await fetchExport(
      page,
      "/api/workouts/export?start=2026-10-26&end=2026-10-27",
    );
    expect(selected.sessions.map((session) => session.performed_on)).toEqual([
      "2026-10-26",
      "2026-10-27",
    ]);
    expect(selected.coverage.set_count).toBe(10);
    expect(validate(selected), JSON.stringify(validate.errors)).toBe(true);
    const invalidRangeStatus = await page.evaluate(
      async () =>
        (
          await fetch("/api/workouts/export?start=2026-10-29&end=2026-10-27", {
            credentials: "same-origin",
          })
        ).status,
    );
    expect(invalidRangeStatus).toBe(400);
  });

  test("finishing early retains unperformed prescriptions and captures optional RIR accurately", async ({
    page,
  }) => {
    const first = uniqueName("Export first exercise");
    const second = uniqueName("Export unperformed exercise");
    await createExercise(page, { name: first, categories: "Legs" });
    await createExercise(page, { name: second, categories: "Back" });
    await createTemplate(page, uniqueName("Export early finish"));
    await addExerciseToTemplate(page, first);
    await addExerciseToTemplate(page, second);
    const templateUrl = page.url();
    await page
      .getByRole("button", { name: "Start workout", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Start workout" })
      .getByRole("button", { name: "Start workout" })
      .click();
    const firstForm = page.locator("form").filter({
      has: page.getByRole("button", { name: "Log first set", exact: true }),
    });
    await firstForm
      .getByRole("textbox", { name: "Reps", exact: true })
      .fill("6");
    await firstForm
      .getByRole("textbox", { name: "Weight (kg)", exact: true })
      .fill("20");
    await firstForm.getByLabel("RIR (optional)").fill("0");
    await firstForm.getByRole("button", { name: "Log first set" }).click();
    const nextForm = page.locator("form").filter({
      has: page.getByRole("button", { name: "Log next set", exact: true }),
    });
    await expect(nextForm.getByLabel("RIR (optional)")).toHaveValue("");
    await nextForm.getByLabel("RIR (optional)").fill("3");
    await nextForm.getByRole("button", { name: "Log next set" }).click();
    await page.getByRole("button", { name: "Keep", exact: true }).click();
    await page
      .getByRole("button", { name: "Finish workout", exact: true })
      .click();
    await expect(page).toHaveURL("/history");
    await expect(page.getByText("partial", { exact: true })).toBeVisible();
    const document = await fetchExport(page);
    expect(validate(document), JSON.stringify(validate.errors)).toBe(true);
    expect(document.sessions).toHaveLength(1);
    expect(document.sessions[0]).toMatchObject({
      status: "partial",
      completed_at: null,
    });
    expect(document.sessions[0].exercise_entries).toHaveLength(2);
    expect(
      document.sessions[0].exercise_entries[0].sets.map((set) => set.rir),
    ).toEqual([0, 3]);
    expect(document.sessions[0].exercise_entries[1]).toMatchObject({
      exercise_name_snapshot: second,
      status: "skipped",
      sets: [],
      prescription_snapshot: { sets_reps: "4 x 4-6", rest_time: "2-3 min" },
    });
    // A terminal partial session must no longer block starting another workout.
    await page.goto(templateUrl);
    await page
      .getByRole("button", { name: "Start workout", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Start workout" })
      .getByRole("button", { name: "Start workout" })
      .click();
    await expect(page).toHaveURL(/\/workouts\/[^/]+$/);
  });
});
