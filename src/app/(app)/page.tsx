import EventNoteRounded from "@mui/icons-material/EventNoteRounded";
import EastRounded from "@mui/icons-material/EastRounded";
import FitnessCenterRounded from "@mui/icons-material/FitnessCenterRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import { getPlansPageData } from "@/features/plans/queries";
import {
  getOpenWorkoutSessionForUser,
  getWorkoutSessionForLogging,
} from "@/features/workouts/queries";

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
  const { activePlan } = await getPlansPageData(user.id, user.timeZone);
  const openSession = await getOpenWorkoutSessionForUser(user.id);
  const workoutSession = openSession
    ? await getWorkoutSessionForLogging(user.id, openSession.id)
    : null;
  const fallbackEntry = workoutSession?.entries.at(-1) ?? null;
  const currentEntry =
    workoutSession?.entries.find(
      (entry) => entry.sortOrder === workoutSession.activeEntrySortOrder,
    ) ??
    fallbackEntry ??
    null;

  const totalSets =
    workoutSession?.entries.reduce(
      (count, entry) => count + entry.sets.length,
      0,
    ) ?? 0;

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: "12px",
          px: 2.75,
          py: 3.25,
        }}
      >
        <Stack spacing={2.75}>
          <Stack spacing={1}>
            <Typography variant="h1">
              {workoutSession ? "Continue workout." : "Choose a workout."}
            </Typography>
            <Typography color="text.secondary">
              {workoutSession
                ? `Open session from ${formatPerformedOn(workoutSession.performedOn)}.`
                : "Create or select a template before logging begins."}
            </Typography>
          </Stack>

          {workoutSession ? (
            <Stack spacing={2.25}>
              {currentEntry ? (
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 2,
                    borderRadius: "8px",
                    bgcolor: "rgba(139,194,172,0.06)",
                    borderColor: "rgba(139,194,172,0.14)",
                  }}
                >
                  <Stack spacing={0.5}>
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

              <Grid container spacing={1.25}>
                <Grid size={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: "8px",
                      bgcolor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Stack spacing={0.35}>
                      <Typography variant="overline" color="text.secondary">
                        Started
                      </Typography>
                      <Typography variant="h3">
                        {formatTime(workoutSession.startedAt)}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid size={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: "8px",
                      bgcolor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Stack spacing={0.35}>
                      <Typography variant="overline" color="text.secondary">
                        Exercises
                      </Typography>
                      <Typography variant="h3">
                        {workoutSession.entries.length}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid size={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: "8px",
                      bgcolor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Stack spacing={0.35}>
                      <Typography variant="overline" color="text.secondary">
                        Sets
                      </Typography>
                      <Typography variant="h3">{totalSets}</Typography>
                    </Stack>
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
            <Button
              component={NextLink}
              href="/workouts"
              variant="contained"
              endIcon={<FitnessCenterRounded />}
              fullWidth
            >
              Open workout hub
            </Button>
          )}
        </Stack>
      </Paper>

      {activePlan ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: "12px",
            px: 2.75,
            py: 2.75,
            bgcolor: "rgba(152, 168, 216, 0.06)",
            borderColor: "rgba(152, 168, 216, 0.16)",
          }}
        >
          <Stack spacing={2.25}>
            <Stack spacing={0.75}>
              <Typography variant="overline" color="secondary.light">
                Active plan
              </Typography>
              <Typography variant="h2">{activePlan.name}</Typography>
              <Typography color="text.secondary">{activePlan.goal}</Typography>
            </Stack>

            <Grid container spacing={1.25}>
              <Grid size={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: "8px",
                    bgcolor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Stack spacing={0.35}>
                    <Typography variant="overline" color="text.secondary">
                      Week
                    </Typography>
                    <Typography variant="h3">{activePlan.currentWeekNumber}</Typography>
                  </Stack>
                </Paper>
              </Grid>
              <Grid size={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: "8px",
                    bgcolor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Stack spacing={0.35}>
                    <Typography variant="overline" color="text.secondary">
                      Done
                    </Typography>
                    <Typography variant="h3">
                      {activePlan.progress.resolved}/{activePlan.progress.total}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
              <Grid size={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: "8px",
                    bgcolor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Stack spacing={0.35}>
                    <Typography variant="overline" color="text.secondary">
                      Next
                    </Typography>
                    <Typography variant="h3">
                      {activePlan.nextWorkout?.weekdayLabel ?? "Rest"}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            <Paper
              elevation={0}
              sx={{
                borderRadius: "8px",
                px: 2,
                py: 1.75,
                bgcolor: "rgba(255,255,255,0.03)",
              }}
            >
              <Stack spacing={0.5}>
                <Typography variant="body1" fontWeight={700}>
                  {activePlan.todayWorkout
                    ? `${activePlan.todayWorkout.weekdayLabel} · ${activePlan.todayWorkout.templateName}`
                    : activePlan.nextWorkout
                      ? `${activePlan.nextWorkout.weekdayLabel} · ${activePlan.nextWorkout.templateName}`
                      : "No upcoming workout in this plan."}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activePlan.todayWorkout
                    ? "Today is scheduled. Open the plan to start or manage it."
                    : activePlan.nextWorkout?.displayDateLabel
                      ? `Next scheduled day: ${activePlan.nextWorkout.displayDateLabel}.`
                      : "This plan has no remaining scheduled workouts."}
                </Typography>
              </Stack>
            </Paper>

            <Button
              component={NextLink}
              href="/plans"
              variant="contained"
              color="secondary"
              startIcon={<EventNoteRounded />}
              fullWidth
            >
              Open active plan
            </Button>
          </Stack>
        </Paper>
      ) : null}

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 1, py: 1 }}>
        <Stack spacing={0.75}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ px: 1.25, pt: 0.75 }}
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
                slotProps={{
                  secondary: {
                    variant: "caption",
                    color: "text.secondary",
                  },
                }}
              />
              <ChevronRightRounded color="action" />
            </ListItemButton>
            <Divider sx={{ mx: 1.5 }} />
            <ListItemButton
              component={NextLink}
              href="/plans"
              sx={{ borderRadius: "8px", px: 1.5, py: 1.25 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}>
                <EventNoteRounded />
              </ListItemIcon>
              <ListItemText
                primary="Plans"
                secondary="Shape a multi-week block and keep the next workout in view."
                slotProps={{
                  secondary: {
                    variant: "caption",
                    color: "text.secondary",
                  },
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
                slotProps={{
                  secondary: {
                    variant: "caption",
                    color: "text.secondary",
                  },
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
