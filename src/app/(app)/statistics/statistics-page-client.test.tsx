import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StatisticsPageClient } from "./statistics-page-client";

const replaceMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/statistics",
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => searchParams,
}));

vi.mock("@mui/x-charts", () => ({
  BarChart: ({
    series,
  }: {
    series: Array<{
      data: number[];
      label: string;
    }>;
  }) => (
    <div
      data-testid="bar-chart"
      data-values={series[0]?.data.join(",") ?? ""}
      data-label={series[0]?.label ?? ""}
    />
  ),
  LineChart: ({
    series,
  }: {
    series: Array<{
      data: number[];
      label: string;
    }>;
  }) => (
    <div
      data-testid="line-chart"
      data-values={series[0]?.data.join(",") ?? ""}
      data-label={series[0]?.label ?? ""}
    />
  ),
}));

const exerciseOptions = [
  {
    key: "bench-press",
    label: "Bench Press",
    category: "Push",
    unit: "kg" as const,
    sessionCount: 3,
  },
];

const selectedExercise = {
  exerciseKey: "bench-press",
  exerciseLabel: "Bench Press",
  category: "Push",
  unit: "kg" as const,
  chartMetric: "load" as const,
  chartMetricLabel: "Best top set",
  chartHelpText: "Best load per session.",
  points: [
    {
      performedOn: "2025-01-06",
      sessionId: "session-1",
      shortLabel: "W1",
      tooltipLabel: "6 Jan 2025",
      value: 80,
    },
    {
      performedOn: "2025-01-13",
      sessionId: "session-2",
      shortLabel: "W2",
      tooltipLabel: "13 Jan 2025",
      value: 85,
    },
  ],
  details: [
    {
      sessionId: "session-1",
      performedOn: "2025-01-06",
      bestSetLabel: "80 kg x 5",
      chartValue: 80,
      totalSets: 4,
      volumeKg: 1600,
    },
  ],
};

describe("StatisticsPageClient", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    searchParams = new URLSearchParams();
  });

  it("shows the empty-state copy when no exercise is selected", () => {
    render(
      <StatisticsPageClient
        exerciseOptions={exerciseOptions}
        selectedExercise={null}
        weeklyTrend={[]}
      />,
    );

    expect(screen.getByText("No exercise selected yet.")).toBeVisible();
    expect(
      screen.getByText(
        "Search for one exercise above to load a progression chart and per-session detail list.",
      ),
    ).toBeVisible();
  });

  it("renders selected exercise details and chart data", () => {
    render(
      <StatisticsPageClient
        exerciseOptions={exerciseOptions}
        selectedExercise={selectedExercise}
        weeklyTrend={[
          {
            shortLabel: "W1",
            volumeKg: 500,
            weekStart: "2025-01-06",
            workoutCount: 2,
          },
        ]}
      />,
    );

    expect(screen.getByText("Selected exercise")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Bench Press" })).toBeVisible();
    expect(screen.getByText("Best ever:")).toBeVisible();
    expect(screen.getByText("85 kg")).toBeVisible();
    expect(screen.getByText("80 kg x 5")).toBeVisible();
    expect(screen.getByTestId("bar-chart")).toBeVisible();
    expect(screen.getByTestId("line-chart")).toBeVisible();
  });
});
