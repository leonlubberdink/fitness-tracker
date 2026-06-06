import { describe, expect, it } from "vitest";

import {
  DEFAULT_TIME_ZONE,
  addDaysToDateKey,
  coerceTimeZone,
  compareDateKeys,
  formatDateForDisplay,
  formatInstantForDisplay,
  getDateKeyDifferenceInDays,
  getDateKeyInTimeZone,
  getScheduledDateKey,
  getStartOfWeekDateKey,
  getWeekdayFromDateKey,
} from "@/lib/date";

describe("date utilities", () => {
  it("falls back to UTC for blank or invalid time zones", () => {
    expect(coerceTimeZone("")).toBe(DEFAULT_TIME_ZONE);
    expect(coerceTimeZone("  ")).toBe(DEFAULT_TIME_ZONE);
    expect(coerceTimeZone("Mars/Olympus")).toBe(DEFAULT_TIME_ZONE);
    expect(coerceTimeZone("Europe/Amsterdam")).toBe("Europe/Amsterdam");
  });

  it("derives date keys in the requested time zone", () => {
    const value = new Date("2025-01-06T01:30:00.000Z");

    expect(getDateKeyInTimeZone(value, "UTC")).toBe("2025-01-06");
    expect(getDateKeyInTimeZone(value, "America/Los_Angeles")).toBe("2025-01-05");
  });

  it("computes weekday, week start, and scheduled dates from a plan start date", () => {
    expect(getWeekdayFromDateKey("2025-01-08")).toBe(3);
    expect(getStartOfWeekDateKey("2025-01-08")).toBe("2025-01-06");
    expect(getScheduledDateKey("2025-01-08", 1, 1)).toBe("2025-01-06");
    expect(getScheduledDateKey("2025-01-08", 2, 7)).toBe("2025-01-19");
  });

  it("supports date arithmetic, comparisons, and display formatting", () => {
    expect(addDaysToDateKey("2025-01-06", 10)).toBe("2025-01-16");
    expect(compareDateKeys("2025-01-06", "2025-01-06")).toBe(0);
    expect(compareDateKeys("2025-01-05", "2025-01-06")).toBe(-1);
    expect(compareDateKeys("2025-01-07", "2025-01-06")).toBe(1);
    expect(getDateKeyDifferenceInDays("2025-01-10", "2025-01-06")).toBe(4);
    expect(
      formatDateForDisplay("2025-01-06", "America/New_York", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    ).toBe("Monday 6 January");
  });

  it("formats instants in the requested time zone", () => {
    expect(
      formatInstantForDisplay(new Date("2025-06-06T08:30:00.000Z"), "Europe/Berlin", {
        timeStyle: "short",
      }),
    ).toBe("10:30");
  });
});
