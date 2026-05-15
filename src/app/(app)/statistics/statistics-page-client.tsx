"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import type {
  StatisticsExerciseOption,
  StatisticsExerciseProgression,
  StatisticsRangeKey,
  StatisticsWeeklyTrendPoint,
} from "@/features/statistics/queries";
import { formatExerciseUnitShort } from "@/lib/exercise-units";

const RANGE_OPTIONS: Array<{
  key: StatisticsRangeKey;
  label: string;
}> = [
  { key: "30d", label: "30 days" },
  { key: "12w", label: "12 weeks" },
  { key: "all", label: "All time" },
];

type StatisticsPageClientProps = {
  exerciseOptions: StatisticsExerciseOption[];
  selectedExercise: StatisticsExerciseProgression | null;
  selectedRange: StatisticsRangeKey;
  weeklyTrend: StatisticsWeeklyTrendPoint[];
};

function formatDecimalValue(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatChartMetricValue(
  metric: "duration" | "load" | "reps",
  value: number,
) {
  if (metric === "load") {
    return `${formatDecimalValue(value)} kg`;
  }

  if (metric === "duration") {
    return `${formatDecimalValue(value)} sec`;
  }

  return `${formatDecimalValue(value)} reps`;
}

function ChartCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.25 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.5}>
          <Typography variant="h3">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

export function StatisticsPageClient({
  exerciseOptions,
  selectedExercise,
  selectedRange,
  weeklyTrend,
}: StatisticsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const [isPending, startTransition] = useTransition();
  const selectedOption = selectedExercise
    ? (exerciseOptions.find(
        (option) => option.key === selectedExercise.exerciseKey,
      ) ?? null)
    : null;
  const overallBestChartValue = selectedExercise
    ? selectedExercise.points.reduce(
        (bestValue, point) => Math.max(bestValue, point.value),
        0,
      )
    : null;

  function updateSearchParams(updater: (params: URLSearchParams) => void) {
    const nextParams = new URLSearchParams(searchParams.toString());
    updater(nextParams);
    const nextSearch = nextParams.toString();

    startTransition(() => {
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
        <Stack spacing={2.25}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Filters</Typography>
            <Typography color="text.secondary">
              Narrow the dashboard by time range before reviewing exercise
              progression below.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.key}
                variant={
                  selectedRange === option.key ? "contained" : "outlined"
                }
                color={selectedRange === option.key ? "primary" : "inherit"}
                disabled={isPending}
                onClick={() =>
                  updateSearchParams((params) => {
                    params.set("range", option.key);
                  })
                }
              >
                {option.label}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Paper>

      {weeklyTrend.length > 0 ? (
        <ChartCard
          title="Overall volume over time"
          description="Each point shows total kg volume across all exercises in that week. This is not cumulative."
        >
          <LineChart
            axisHighlight={{ x: "line" }}
            grid={{ horizontal: true }}
            height={260}
            hideLegend
            margin={{ bottom: 28, left: 52, right: 12, top: 12 }}
            series={[
              {
                color: theme.palette.success.main,
                curve: "linear",
                data: weeklyTrend.map((point) => point.volumeKg),
                label: "Overall volume",
                showMark: weeklyTrend.length <= 18,
                valueFormatter: (value: number | null) =>
                  `${formatDecimalValue(value ?? 0)} kg`,
              },
            ]}
            sx={{ width: "100%" }}
            xAxis={[
              {
                data: weeklyTrend.map((point) => point.shortLabel),
                scaleType: "point",
              },
            ]}
            yAxis={[
              {
                min: 0,
                valueFormatter: (value: number) => formatDecimalValue(value),
              },
            ]}
          />
        </ChartCard>
      ) : null}

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
        <Stack spacing={2.25}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Exercise progression</Typography>
            <Typography color="text.secondary">
              Choose one exercise above to compare completed sessions visually,
              then use History when you want full set-by-set review.
            </Typography>
          </Stack>

          <Autocomplete
            options={exerciseOptions}
            value={selectedOption}
            disabled={exerciseOptions.length === 0 || isPending}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.key === value.key}
            onChange={(_event, nextValue) =>
              updateSearchParams((params) => {
                if (nextValue) {
                  params.set("exercise", nextValue.key);
                  return;
                }

                params.delete("exercise");
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Exercise selection"
                placeholder={
                  exerciseOptions.length === 0
                    ? "No exercises in this range"
                    : "Search exercise"
                }
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.key}>
                <Stack spacing={0.25} sx={{ py: 0.25 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {option.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.category} · {option.sessionCount} sessions ·{" "}
                    {formatExerciseUnitShort(option.unit)}
                  </Typography>
                </Stack>
              </li>
            )}
          />

          {selectedExercise ? (
            <Stack spacing={2.25}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: "8px",
                  px: 1.75,
                  py: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  borderColor: alpha(theme.palette.primary.main, 0.14),
                }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="overline" color="primary.light">
                    Selected exercise
                  </Typography>
                  <Typography variant="h3">
                    {selectedExercise.exerciseLabel}
                  </Typography>
                  <Typography color="text.secondary">
                    {selectedExercise.category} ·{" "}
                    {formatExerciseUnitShort(selectedExercise.unit)}
                  </Typography>
                </Stack>
              </Paper>

              <ChartCard
                title={selectedExercise.chartMetricLabel}
                description={selectedExercise.chartHelpText}
              >
                <LineChart
                  axisHighlight={{ x: "line" }}
                  grid={{ horizontal: true }}
                  height={280}
                  hideLegend
                  margin={{ bottom: 28, left: 42, right: 12, top: 12 }}
                  series={[
                    {
                      color: theme.palette.secondary.main,
                      curve: "linear",
                      data: selectedExercise.points.map((point) => point.value),
                      label: selectedExercise.chartMetricLabel,
                      showMark: true,
                      valueFormatter: (value: number | null) =>
                        formatChartMetricValue(
                          selectedExercise.chartMetric,
                          value ?? 0,
                        ),
                    },
                  ]}
                  sx={{ width: "100%" }}
                  xAxis={[
                    {
                      data: selectedExercise.points.map(
                        (point) => point.shortLabel,
                      ),
                      scaleType: "point",
                    },
                  ]}
                  yAxis={[
                    {
                      min: 0,
                      valueFormatter: (value: number) =>
                        selectedExercise.chartMetric === "load"
                          ? `${formatDecimalValue(value)} kg`
                          : selectedExercise.chartMetric === "duration"
                            ? `${formatDecimalValue(value)} sec`
                            : `${value}`,
                    },
                  ]}
                />
              </ChartCard>

              <Stack spacing={1.25}>
                {selectedExercise.details.map((detail) => (
                  <Paper
                    key={detail.sessionId}
                    elevation={0}
                    sx={{
                      borderRadius: "8px",
                      px: 2,
                      py: 1.75,
                      bgcolor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Typography variant="body1" fontWeight={700}>
                          {formatFullDate(detail.performedOn)}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          flexWrap="wrap"
                          justifyContent="flex-end"
                        >
                          <Typography variant="body1" color="text.secondary">
                            Best ever:
                          </Typography>
                          <Chip
                            label={formatChartMetricValue(
                              selectedExercise.chartMetric,
                              overallBestChartValue ?? 0,
                            )}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>
                      </Stack>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={2}
                      >
                        <Typography variant="body2" fontWeight={400}>
                          Best that day:
                        </Typography>
                        <Typography variant="body2" fontWeight={200}>
                          {detail.bestSetLabel}
                        </Typography>
                        <Chip
                          label={`${detail.totalSets} sets`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Paper
              elevation={0}
              sx={{
                borderRadius: "8px",
                px: 2,
                py: 2.5,
                bgcolor: "rgba(255,255,255,0.02)",
              }}
            >
              <Stack spacing={0.75}>
                <Typography variant="h3" sx={{ fontSize: "1rem" }}>
                  No exercise selected yet.
                </Typography>
                <Typography color="text.secondary">
                  Search for one exercise above to load a progression chart and
                  per-session detail list.
                </Typography>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
