import { spawn } from "node:child_process";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

function runCommand(command, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      env,
      shell: true,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}.`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}.`));
        return;
      }

      resolve();
    });
  });
}

async function main() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
  const url = new URL(baseURL);
  const port = url.port || "3100";
  const hostname = url.hostname;
  const env = {
    ...process.env,
    HOSTNAME: hostname,
    PORT: port,
  };

  await runCommand("pnpm build", env);

  const standaloneDir = path.resolve(".next/standalone");
  const standaloneNextDir = path.join(standaloneDir, ".next");
  const staticSourceDir = path.resolve(".next/static");
  const staticTargetDir = path.join(standaloneNextDir, "static");
  const publicSourceDir = path.resolve("public");
  const publicTargetDir = path.join(standaloneDir, "public");

  await mkdir(standaloneNextDir, { recursive: true });
  await cp(staticSourceDir, staticTargetDir, { force: true, recursive: true });
  await cp(publicSourceDir, publicTargetDir, {
    errorOnExist: false,
    force: true,
    recursive: true,
  }).catch((error) => {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  });

  const server = spawn(`"${process.execPath}" ".next/standalone/server.js"`, {
    env,
    shell: true,
    stdio: "inherit",
  });

  const stopServer = () => {
    if (!server.killed) {
      server.kill("SIGTERM");
    }
  };

  process.on("SIGINT", stopServer);
  process.on("SIGTERM", stopServer);

  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.on("exit", (code, signal) => {
      process.off("SIGINT", stopServer);
      process.off("SIGTERM", stopServer);

      if (signal === "SIGTERM" || signal === "SIGINT") {
        resolve();
        return;
      }

      if (signal) {
        reject(new Error(`Playwright server exited with signal ${signal}.`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`Playwright server exited with code ${code}.`));
        return;
      }

      resolve();
    });
  });
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exitCode = 1;
});
