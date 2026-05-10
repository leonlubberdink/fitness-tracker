import EastRounded from "@mui/icons-material/EastRounded";
import FitnessCenterRounded from "@mui/icons-material/FitnessCenterRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import TimerRounded from "@mui/icons-material/TimerRounded";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
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
  const currentEntry = workoutSession?.entries.at(-1) ?? null;

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
          borderRadius: "12px",
          px: 2.5,
          py: 3,
        }}
      >
        <Stack spacing={2.5}>
          <Stack spacing={1.25}>
            <Typography variant="h1">
              {workoutSession ? "Continue workout." : "Start new workout."}
            </Typography>
            <Typography color="text.secondary">
              {workoutSession &&
                `Open session from ${formatPerformedOn(workoutSession.performedOn)}.`}
            </Typography>
          </Stack>

          {workoutSession ? (
            <Stack spacing={2.5}>
              {currentEntry ? (
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.75,
                    borderRadius: "8px",
                    bgcolor: "rgba(139,194,172,0.06)",
                    borderColor: "rgba(139,194,172,0.14)",
                  }}
                >
                  <Stack spacing={0.75}>
                    <Typography variant="overline" color="primary.light">
                      Current exercise
                    </Typography>
                    <Typography variant="h3">
                      {currentEntry.exerciseNameSnapshot}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentEntry.exerciseCategorySnapshot} ·{" "}
                      {currentEntry.sets.length} logged sets
                    </Typography>
                  </Stack>
                </Paper>
              ) : null}

              <Grid container spacing={1.5}>
                <Grid size={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.75,
                      borderRadius: "8px",
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
                      borderRadius: "8px",
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
                      borderRadius: "8px",
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
              <FormStatusButton
                type="submit"
                variant="contained"
                endIcon={<FitnessCenterRounded />}
                loadingLabel="Starting workout..."
                fullWidth
              >
                Start workout
              </FormStatusButton>
            </form>
          )}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 0.5, py: 0.5 }}>
        <Stack spacing={0.5}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ px: 1.5, pt: 1 }}
          >
            Quick routes
          </Typography>
          <List disablePadding>
            <ListItemButton
              component={NextLink}
              href="/exercises"
              sx={{ borderRadius: "8px", px: 1.5, py: 1.25 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}>
                <LibraryBooksRounded />
              </ListItemIcon>
              <ListItemText
                primary="Exercises"
                secondary="Build the reusable library that feeds the workout flow."
                secondaryTypographyProps={{
                  variant: "caption",
                  color: "text.secondary",
                }}
              />
              <ChevronRightRounded color="action" />
            </ListItemButton>
            <Divider sx={{ mx: 1.5 }} />
            <ListItemButton
              component={NextLink}
              href="/history"
              sx={{ borderRadius: "8px", px: 1.5, py: 1.25 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}>
                <HistoryRounded />
              </ListItemIcon>
              <ListItemText
                primary="History"
                secondary="Review completed sessions and compare what you logged."
                secondaryTypographyProps={{
                  variant: "caption",
                  color: "text.secondary",
                }}
              />
              <ChevronRightRounded color="action" />
            </ListItemButton>
          </List>
        </Stack>
      </Paper>
    </Stack>
  );
}
