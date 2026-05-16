"use client";

import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { LineChart } from "@mui/x-charts";
import { useTheme } from "@mui/material/styles";

type WeightTrendPoint = {
  recordedOn: string;
  shortLabel: string;
  weightKg: number;
};

type WeightTrendCardProps = {
  currentWeightLabel: string | null;
  targetWeightLabel: string | null;
  trendDeltaKg: number | null;
  weightTrend: WeightTrendPoint[];
};

function formatDecimalValue(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function WeightTrendCard({
  currentWeightLabel,
  targetWeightLabel,
  trendDeltaKg,
  weightTrend,
}: WeightTrendCardProps) {
  const theme = useTheme();

  return (
    <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
      <Stack spacing={2.25}>
        <Stack spacing={0.75}>
          <Typography variant="h3">Weight trend</Typography>
          <Typography color="text.secondary">
            Review your recent check-ins against the target you set in your
            profile.
          </Typography>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: "8px",
              px: 1.75,
              py: 1.5,
              bgcolor: "rgba(255,255,255,0.02)",
            }}
          >
            <Stack spacing={0.35}>
              <Typography variant="overline" color="text.secondary">
                Current
              </Typography>
              <Typography variant="h3">
                {currentWeightLabel ? `${currentWeightLabel} kg` : "No data"}
              </Typography>
            </Stack>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: "8px",
              px: 1.75,
              py: 1.5,
              bgcolor: "rgba(255,255,255,0.02)",
            }}
          >
            <Stack spacing={0.35}>
              <Typography variant="overline" color="text.secondary">
                Target
              </Typography>
              <Typography variant="h3">
                {targetWeightLabel ? `${targetWeightLabel} kg` : "No target"}
              </Typography>
            </Stack>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: "8px",
              px: 1.75,
              py: 1.5,
              bgcolor: "rgba(255,255,255,0.02)",
            }}
          >
            <Stack spacing={0.35}>
              <Typography variant="overline" color="text.secondary">
                Trend
              </Typography>
              <Typography variant="h3">
                {trendDeltaKg === null
                  ? "No trend"
                  : `${trendDeltaKg > 0 ? "+" : ""}${formatDecimalValue(trendDeltaKg)} kg`}
              </Typography>
            </Stack>
          </Paper>
        </Stack>

        {weightTrend.length === 0 ? (
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
                No check-ins yet.
              </Typography>
              <Typography color="text.secondary">
                Save the first daily check-in to start a weight trend.
              </Typography>
            </Stack>
          </Paper>
        ) : (
          <LineChart
            axisHighlight={{ x: "line" }}
            grid={{ horizontal: true }}
            height={280}
            hideLegend
            margin={{ bottom: 28, left: 52, right: 12, top: 12 }}
            series={[
              {
                color: theme.palette.success.main,
                curve: "linear",
                data: weightTrend.map((point) => point.weightKg),
                label: "Weight",
                showMark: true,
                valueFormatter: (value: number | null) =>
                  `${formatDecimalValue(value ?? 0)} kg`,
              },
            ]}
            sx={{ width: "100%" }}
            xAxis={[
              {
                data: weightTrend.map((point) => point.shortLabel),
                scaleType: "point",
              },
            ]}
            yAxis={[
              {
                min: 0,
                valueFormatter: (value: number) => `${formatDecimalValue(value)} kg`,
              },
            ]}
          />
        )}
      </Stack>
    </Paper>
  );
}
