export const DEFAULT_TIME_ZONE = "UTC";

function getUtcDateAtNoon(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function coerceTimeZone(value: string | null | undefined) {
  const nextValue = value?.trim();

  if (!nextValue) {
    return DEFAULT_TIME_ZONE;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: nextValue }).format(new Date());
    return nextValue;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function parseDateKey(dateKey: string) {
  return getUtcDateAtNoon(dateKey);
}

export function formatDateKey(value: Date) {
  return `${value.getUTCFullYear()}-${padDatePart(value.getUTCMonth() + 1)}-${padDatePart(value.getUTCDate())}`;
}

export function addDaysToDateKey(dateKey: string, amount: number) {
  const nextDate = parseDateKey(dateKey);
  nextDate.setUTCDate(nextDate.getUTCDate() + amount);
  return formatDateKey(nextDate);
}

export function getDateKeyInTimeZone(
  value: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return getDateKeyInTimeZone(value, DEFAULT_TIME_ZONE);
  }

  return `${year}-${month}-${day}`;
}

export function getTodayDateKey(timeZone: string = DEFAULT_TIME_ZONE) {
  return getDateKeyInTimeZone(new Date(), timeZone);
}

export function getWeekdayFromDateKey(dateKey: string) {
  const day = parseDateKey(dateKey).getUTCDay();
  return day === 0 ? 7 : day;
}

export function getStartOfWeekDateKey(dateKey: string) {
  const weekday = getWeekdayFromDateKey(dateKey);
  return addDaysToDateKey(dateKey, -(weekday - 1));
}

export function getScheduledDateKey(
  startDate: string,
  weekNumber: number,
  weekday: number,
) {
  const weekStart = getStartOfWeekDateKey(startDate);
  return addDaysToDateKey(weekStart, (weekNumber - 1) * 7 + (weekday - 1));
}

export function compareDateKeys(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function getDateKeyDifferenceInDays(left: string, right: string) {
  const leftTime = parseDateKey(left).getTime();
  const rightTime = parseDateKey(right).getTime();
  return Math.round((leftTime - rightTime) / (24 * 60 * 60 * 1000));
}

export function formatDateForDisplay(
  dateKey: string,
  timeZone: string = DEFAULT_TIME_ZONE,
  options: Intl.DateTimeFormatOptions,
) {
  return formatInstantForDisplay(parseDateKey(dateKey), timeZone, options);
}

export function formatInstantForDisplay(
  value: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    ...options,
  }).format(value);
}
