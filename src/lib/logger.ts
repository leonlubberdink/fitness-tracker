import { createHash } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type LogDetails = Record<string, string | number | boolean | null | undefined>;

function writeLog(level: LogLevel, event: string, details: LogDetails = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  };

  const message = JSON.stringify(entry);

  if (level === "error") {
    console.error(message);
    return;
  }

  if (level === "warn") {
    console.warn(message);
    return;
  }

  console.log(message);
}

export function hashLogValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function logInfo(event: string, details?: LogDetails) {
  writeLog("info", event, details);
}

export function logWarn(event: string, details?: LogDetails) {
  writeLog("warn", event, details);
}

export function logError(event: string, details?: LogDetails) {
  writeLog("error", event, details);
}
