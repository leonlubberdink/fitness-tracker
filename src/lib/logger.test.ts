import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashLogValue, logError, logInfo, logWarn } from "@/lib/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-06T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("hashes log values deterministically", () => {
    expect(hashLogValue("user@example.com")).toBe(hashLogValue("user@example.com"));
    expect(hashLogValue("user@example.com")).toHaveLength(12);
    expect(hashLogValue("user@example.com")).not.toBe(
      hashLogValue("other@example.com"),
    );
  });

  it("writes info and warning entries as structured JSON", () => {
    const infoSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logInfo("session.started", { attempts: 2, source: "test" });
    logWarn("session.slow", { cached: false });

    expect(JSON.parse(infoSpy.mock.calls[0][0] as string)).toEqual({
      attempts: 2,
      event: "session.started",
      level: "info",
      source: "test",
      timestamp: "2025-01-06T12:00:00.000Z",
    });
    expect(JSON.parse(warnSpy.mock.calls[0][0] as string)).toEqual({
      cached: false,
      event: "session.slow",
      level: "warn",
      timestamp: "2025-01-06T12:00:00.000Z",
    });
  });

  it("writes error entries to console.error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError("session.failed", { retryable: true });

    expect(JSON.parse(errorSpy.mock.calls[0][0] as string)).toEqual({
      event: "session.failed",
      level: "error",
      retryable: true,
      timestamp: "2025-01-06T12:00:00.000Z",
    });
  });
});
