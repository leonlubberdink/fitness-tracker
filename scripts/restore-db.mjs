import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";

function assertFileExists(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Backup file not found: ${filePath}`);
  }
}

function runRestore(inputPath) {
  return new Promise((resolve, reject) => {
    const inputStream = createReadStream(inputPath);
    const child = spawn(
      "docker",
      [
        "compose",
        "exec",
        "-T",
        "db",
        "sh",
        "-lc",
        'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
      ],
      {
        cwd: process.cwd(),
        stdio: ["pipe", "inherit", "inherit"],
      },
    );

    inputStream.pipe(child.stdin);

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Restore command failed with exit code ${code ?? "unknown"}.`));
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      file: {
        type: "string",
      },
    },
    strict: true,
  });

  if (!values.file) {
    throw new Error("Missing required --file argument.");
  }

  const inputPath = path.resolve(values.file);
  assertFileExists(inputPath);
  await runRestore(inputPath);
  console.log(`Database restore completed from ${inputPath}`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Restore failed: ${message}`);
  process.exitCode = 1;
});
