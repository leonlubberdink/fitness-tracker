import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeExportSource } from "@/test/fixtures/workout-export";
import { buildWorkoutExport } from "@/features/workouts/export";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getWorkoutExportForUser: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/features/workouts/export-queries", () => ({
  getWorkoutExportForUser: mocks.getWorkoutExportForUser,
}));
import { GET } from "./route";

describe("workout JSON download endpoint", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.getWorkoutExportForUser.mockReset();
  });
  it("denies anonymous downloads without querying history", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await GET(
      new Request("http://localhost/api/workouts/export"),
    );
    expect(response.status).toBe(401);
    expect(mocks.getWorkoutExportForUser).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("rejects invalid date ranges before reading the database", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "authenticated-user",
      timeZone: "UTC",
    });
    const response = await GET(
      new Request(
        "http://localhost/api/workouts/export?start=2026-10-29&end=2026-10-28",
      ),
    );
    expect(response.status).toBe(400);
    expect(mocks.getWorkoutExportForUser).not.toHaveBeenCalled();
  });
  it("uses the authenticated user, provides parseable JSON and disables caching", async () => {
    const user = { id: "authenticated-user", timeZone: "UTC" };
    mocks.getCurrentUser.mockResolvedValue(user);
    const document = buildWorkoutExport(makeExportSource(), {
      timeZone: "UTC",
      appVersion: "0.1.0",
      range: {},
    });
    mocks.getWorkoutExportForUser.mockResolvedValue(document);
    const response = await GET(
      new Request("http://localhost/api/workouts/export?userId=someone-else"),
    );
    expect(mocks.getWorkoutExportForUser).toHaveBeenCalledWith(user, {});
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain(
      "attachment;",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual(document);
  });
});
