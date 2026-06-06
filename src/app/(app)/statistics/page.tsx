import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import { getStatisticsPageData } from "@/features/statistics/queries";

import { StatisticsPageClient } from "./statistics-page-client";

type StatisticsPageProps = {
  searchParams?: Promise<{
    exercise?: string;
  }>;
};

export default async function StatisticsPage({
  searchParams,
}: StatisticsPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedExerciseKey = resolvedSearchParams?.exercise?.trim() || null;
  const statistics = await getStatisticsPageData(user.id, {
    exerciseKey: selectedExerciseKey,
    range: "12w",
  });

  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ borderRadius: "12px", px: 2.75, py: 3.25 }}>
        <Stack spacing={1}>
          <Typography variant="h1">Statistics</Typography>
        </Stack>
      </Paper>

      {!statistics.hasCompletedWorkouts ? (
        <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.5 }}>
          <Stack spacing={1.25}>
            <Typography variant="h3">No completed workouts yet.</Typography>
            <Typography color="text.secondary">
              Finish a workout first, then this page will turn those logged sets
              into progression charts and weekly summaries.
            </Typography>
            <Button component={NextLink} href="/workouts" variant="contained">
              Start a workout
            </Button>
          </Stack>
        </Paper>
      ) : statistics.summary.workouts.value === 0 ? (
        <>
          <Alert severity="info" variant="filled">
            No completed workouts were found in the last 12 weeks.
          </Alert>
          <StatisticsPageClient
            exerciseOptions={statistics.exerciseOptions}
            selectedExercise={statistics.selectedExercise}
            weeklyTrend={statistics.weeklyTrend}
          />
        </>
      ) : (
        <StatisticsPageClient
          exerciseOptions={statistics.exerciseOptions}
          selectedExercise={statistics.selectedExercise}
          weeklyTrend={statistics.weeklyTrend}
        />
      )}
    </Stack>
  );
}
