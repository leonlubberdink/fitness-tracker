import { mkdir, writeFile } from "node:fs/promises";
import { getWorkoutExportJsonSchema } from "../src/features/workouts/export-schema";
import { buildWorkoutExport } from "../src/features/workouts/export";
import { makeExportSource } from "../src/test/fixtures/workout-export";
import { version } from "../package.json";

async function main() {
  await mkdir("docs/schemas", { recursive: true });
  await mkdir("docs/examples", { recursive: true });
  await writeFile(
    "docs/schemas/workout-export.v2.schema.json",
    JSON.stringify(getWorkoutExportJsonSchema(), null, 2) + "\n",
  );
  const source = makeExportSource();
  const options = {
    timeZone: "Europe/Amsterdam",
    appVersion: version,
    range: {},
    exportedAt: new Date("2026-10-29T12:00:00Z"),
  };
  await writeFile(
    "docs/examples/workout-export-v2.example.json",
    JSON.stringify(buildWorkoutExport(source, options), null, 2) + "\n",
  );
  console.log(
    "Published workout export schema and synthetic mixed-history example.",
  );
}

void main();
