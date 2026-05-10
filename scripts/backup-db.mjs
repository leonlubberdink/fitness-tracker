import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";

function pad(value) {
  return String(value).padStart(2, "0");
}

function getDefaultBackupPath() {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");

  return path.join(process.cwd(), "backups", `fitness-app-${timestamp}.sql`);
}

function ensureParentDirectory(filePath) {
  const directory = path.dirname(filePath);

  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

function runBackup(outputPath) {
  return new Promise((resolve, reject) => {
    ensureParentDirectory(outputPath);

    const outputStream = createWriteStream(outputPath, { flags: "w" });
    const child = spawn(
      "docker",
      [
        "compose",
        "exec",
        "-T",
        "db",
        "sh",
        "-lc",
        'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges',
      ],
      {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "inherit"],
      },
    );

    child.stdout.pipe(outputStream);

    child.on("error", (error) => {
      outputStream.destroy();
      reject(error);
    });

    child.on("close", (code) => {
      outputStream.end();

      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Backup command failed with exit code ${code ?? "unknown"}.`));
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      output: {
        type: "string",
      },
    },
    strict: true,
  });

  const outputPath = path.resolve(values.output ?? getDefaultBackupPath());
  await runBackup(outputPath);
  console.log(`Database backup written to ${outputPath}`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Backup failed: ${message}`);
  process.exitCode = 1;
});
