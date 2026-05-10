import EastRounded from "@mui/icons-material/EastRounded";
import FitnessCenterRounded from "@mui/icons-material/FitnessCenterRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import TimerRounded from "@mui/icons-material/TimerRounded";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import {
  getOpenWorkoutSessionForUser,
  getWorkoutSessionForLogging,
} from "@/features/workouts/queries";
import { startWorkoutSessionAction } from "@/features/workouts/actions";

function formatPerformedOn(performedOn: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(`${performedOn}T00:00:00`));
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeStyle: "short",
  }).format(value);
}

export default async function Home() {
  const user = await requireUser();
  const openSession = await getOpenWorkoutSessionForUser(user.id);
  const workoutSession = openSession
    ? await getWorkoutSessionForLogging(user.id, openSession.id)
    : null;

  const totalSets =
    workoutSession?.entries.reduce(
      (count, entry) => count + entry.sets.length,
      0,
    ) ?? 0;

  return (
    <Stack spacing={2.5}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: "16px",
          px: 3,
          py: 3.5,
        }}
      >
        <Stack spacing={2.5}>
          <Chip
            label={workoutSession ? "Workout in progress" : "Today"}
            color="primary"
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
          />

          <Stack spacing={1.25}>
            <Typography variant="h1">
              {workoutSession
                ? "Pick!!!!! up the next set fast."
                : "Start clean, stay in flow."}
            </Typography>
            <Typography color="text.secondary">
              {workoutSession
                ? `Open session from ${formatPerformedOn(workoutSession.performedOn)}. Keep the logging surface close and avoid extra taps while you train.`
                : "This app is tuned for quick workout logging in the gym: glance, compare, log, move on."}
            </Typography>
          </Stack>

          {workoutSession ? (
            <Stack spacing={2.5}>
              <Grid container spacing={1.5}>
                <Grid size={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.75,
                      borderRadius: "12px",
                      bgcolor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      Started
                    </Typography>
                    <Typography variant="h3">
                      {formatTime(workoutSession.startedAt)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.75,
                      borderRadius: "12px",
                      bgcolor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      Exercises
                    </Typography>
                    <Typography variant="h3">
                      {workoutSession.entries.length}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.75,
                      borderRadius: "12px",
                      bgcolor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      Sets
                    </Typography>
                    <Typography variant="h3">{totalSets}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Button
                component={NextLink}
                href={`/workouts/${workoutSession.id}`}
                variant="contained"
                endIcon={<EastRounded />}
                fullWidth
              >
                Continue workout
              </Button>
            </Stack>
          ) : (
            <form action={startWorkoutSessionAction}>
              <Button
                type="submit"
                variant="contained"
                endIcon={<FitnessCenterRounded />}
                fullWidth
              >
                Start workout
              </Button>
            </form>
          )}
        </Stack>
      </Paper>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card elevation={0}>
            <CardActionArea
              component={NextLink}
              href="/exercises"
              sx={{ p: 2.5 }}
            >
              <Stack spacing={1.5}>
                <LibraryBooksRounded color="primary" />
                <Stack spacing={0.75}>
                  <Typography variant="h3">Exercises</Typography>
                  <Typography color="text.secondary">
                    Build the reusable library that feeds the workout flow.
                  </Typography>
                </Stack>
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card elevation={0}>
            <CardActionArea
              component={NextLink}
              href="/history"
              sx={{ p: 2.5 }}
            >
              <Stack spacing={1.5}>
                <HistoryRounded color="primary" />
                <Stack spacing={0.75}>
                  <Typography variant="h3">History</Typography>
                  <Typography color="text.secondary">
                    Review completed sessions and compare what you logged.
                  </Typography>
                </Stack>
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "14px",
          px: 2.5,
          py: 2.25,
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <TimerRounded color="primary" />
            <Typography variant="h3">How this session stays fast</Typography>
          </Stack>
          <Divider flexItem />
          <Typography color="text.secondary">
            Keep the workout screen focused on the current set, use the library
            to add the next exercise inline, and let history stay out of the way
            until the session is done.
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}
