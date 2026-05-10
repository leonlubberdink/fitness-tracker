import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import RepeatRounded from "@mui/icons-material/RepeatRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import {
  addExerciseEntryAction,
  addSetAction,
  completeWorkoutSessionAction,
  removeExerciseEntryAction,
  removeSetAction,
  updateSetAction,
} from "@/features/workouts/actions";
import { requireWorkoutSessionForLogging } from "@/features/workouts/queries";

import { ExercisePickerForm } from "./exercise-picker-form";

type WorkoutPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

function formatWorkoutDate(performedOn: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
  }).format(new Date(`${performedOn}T00:00:00`));
}

function formatWorkoutTime(startedAt: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeStyle: "short",
  }).format(startedAt);
}

function formatUnit(unit: "kg" | "bodyweight") {
  return unit === "kg" ? "kg" : "BW";
}

function formatPreviousSet(
  previousSet:
    | {
        performedOn: string;
        reps: number;
        setNumber: number;
        weight: number;
        unit: "kg" | "bodyweight";
      }
    | null,
) {
  if (!previousSet) {
    return "No completed history yet.";
  }

  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${previousSet.performedOn}T00:00:00`));

  const weightLabel =
    previousSet.unit === "bodyweight"
      ? previousSet.weight === 0
        ? "BW"
        : `${previousSet.weight} BW`
      : `${previousSet.weight} kg`;

  return `${date} · set ${previousSet.setNumber} · ${previousSet.reps} reps · ${weightLabel}`;
}

export default async function WorkoutPage({
  params,
  searchParams,
}: WorkoutPageProps) {
  const user = await requireUser();
  const { sessionId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const session = await requireWorkoutSessionForLogging(user.id, sessionId);
  const errorMessage = resolvedSearchParams?.error?.trim();
  const totalSets = session.entries.reduce(
    (count, entry) => count + entry.sets.length,
    0,
  );

  return (
    <Stack spacing={2.5}>
      {errorMessage ? (
        <Alert severity="error" variant="filled">
          {errorMessage}
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ borderRadius: "16px", px: 3, py: 3.5 }}>
        <Stack spacing={2.5}>
          <Stack spacing={1.5}>
            <Chip
              label="Workout in progress"
              color="primary"
              variant="outlined"
              sx={{ alignSelf: "flex-start" }}
            />
            <Typography variant="h1">Log the current block fast.</Typography>
            <Typography color="text.secondary">
              {formatWorkoutDate(session.performedOn)} starting at{" "}
              {formatWorkoutTime(session.startedAt)}.
            </Typography>
          </Stack>

          <Grid container spacing={1.5}>
            <Grid size={4}>
              <Paper
                elevation={0}
                sx={{ p: 1.75, borderRadius: "12px", bgcolor: "rgba(255,255,255,0.02)" }}
              >
                <Typography variant="overline" color="text.secondary">
                  Exercises
                </Typography>
                <Typography variant="h3">{session.entries.length}</Typography>
              </Paper>
            </Grid>
            <Grid size={4}>
              <Paper
                elevation={0}
                sx={{ p: 1.75, borderRadius: "12px", bgcolor: "rgba(255,255,255,0.02)" }}
              >
                <Typography variant="overline" color="text.secondary">
                  Sets
                </Typography>
                <Typography variant="h3">{totalSets}</Typography>
              </Paper>
            </Grid>
            <Grid size={4}>
              <Paper
                elevation={0}
                sx={{ p: 1.75, borderRadius: "12px", bgcolor: "rgba(255,255,255,0.02)" }}
              >
                <Typography variant="overline" color="text.secondary">
                  Started
                </Typography>
                <Typography variant="h3">
                  {formatWorkoutTime(session.startedAt)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <form action={completeWorkoutSessionAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<CheckCircleRounded />}
              fullWidth
            >
              Finish workout
            </Button>
          </form>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "14px", px: 2.5, py: 2.5 }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Add the next exercise</Typography>
            <Typography color="text.secondary">
              Search your library, choose the next movement, and let the first
              set appear automatically.
            </Typography>
          </Stack>

          {session.exerciseOptions.length === 0 ? (
            <Paper
              elevation={0}
              sx={{ borderRadius: "12px", px: 2, py: 2.5, bgcolor: "rgba(255,255,255,0.02)" }}
            >
              <Stack spacing={1}>
                <Typography variant="h3" sx={{ fontSize: "1rem" }}>
                  No exercises available yet.
                </Typography>
                <Typography color="text.secondary">
                  Create exercises first, then come back here to keep logging in
                  one flow.
                </Typography>
                <Button component={NextLink} href="/exercises" variant="contained">
                  Go to exercises
                </Button>
              </Stack>
            </Paper>
          ) : (
            <ExercisePickerForm
              sessionId={session.id}
              initialExercises={session.exerciseOptions}
              addExerciseEntryAction={addExerciseEntryAction}
            />
          )}
        </Stack>
      </Paper>

      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" px={0.5}>
          <InsightsRounded color="primary" />
          <Typography variant="h3">Exercise entries</Typography>
        </Stack>

        {session.entries.length === 0 ? (
          <Paper elevation={0} sx={{ borderRadius: "14px", px: 2.5, py: 3 }}>
            <Stack spacing={0.75}>
              <Typography variant="h3">Nothing logged yet.</Typography>
              <Typography color="text.secondary">
                Add the first exercise above to start entering reps and weight.
              </Typography>
            </Stack>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {session.entries.map((entry) => (
              <Paper key={entry.id} elevation={0} sx={{ borderRadius: "14px", px: 2.5, py: 2.5 }}>
                <Stack spacing={2}>
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Stack spacing={0.5} minWidth={0}>
                        <Typography variant="h3">{entry.exerciseNameSnapshot}</Typography>
                        <Typography color="text.secondary">
                          {entry.exerciseCategorySnapshot} · {formatUnit(entry.unitSnapshot)}
                        </Typography>
                      </Stack>

                      <form action={removeExerciseEntryAction}>
                        <input type="hidden" name="sessionId" value={session.id} />
                        <input type="hidden" name="entryId" value={entry.id} />
                        <Button
                          type="submit"
                          variant="text"
                          color="inherit"
                          startIcon={<DeleteOutlineRounded />}
                          sx={{ color: "text.secondary" }}
                        >
                          Remove
                        </Button>
                      </form>
                    </Stack>

                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: "12px",
                        px: 1.75,
                        py: 1.5,
                        bgcolor: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Typography variant="overline" color="text.secondary">
                          Last completed set
                        </Typography>
                        <Typography variant="body2">
                          {formatPreviousSet(entry.previousSet)}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Stack>

                  <Divider flexItem />

                  <Stack spacing={1.5}>
                    {entry.sets.map((set) => (
                      <Paper
                        key={set.id}
                        elevation={0}
                        sx={{
                          p: 1.75,
                          borderRadius: "12px",
                          bgcolor: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <form action={updateSetAction}>
                          <input type="hidden" name="sessionId" value={session.id} />
                          <input type="hidden" name="setId" value={set.id} />

                          <Stack spacing={1.5}>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              spacing={1}
                            >
                              <Chip
                                label={`Set ${set.setNumber}`}
                                color="primary"
                                variant="outlined"
                              />
                              {entry.previousSet ? (
                                <Typography variant="caption" color="text.secondary">
                                  Last: {entry.previousSet.reps} reps ·{" "}
                                  {entry.previousSet.unit === "bodyweight"
                                    ? entry.previousSet.weight === 0
                                      ? "BW"
                                      : `${entry.previousSet.weight} BW`
                                    : `${entry.previousSet.weight} kg`}
                                </Typography>
                              ) : null}
                            </Stack>

                            <Grid container spacing={1.25}>
                              <Grid size={6}>
                                <TextField
                                  fullWidth
                                  label="Reps"
                                  name="reps"
                                  type="number"
                                  inputProps={{ min: 1, step: 1, inputMode: "numeric" }}
                                  defaultValue={set.reps}
                                  required
                                />
                              </Grid>
                              <Grid size={6}>
                                <TextField
                                  fullWidth
                                  label={entry.unitSnapshot === "kg" ? "Weight (kg)" : "Weight"}
                                  name="weight"
                                  type="number"
                                  inputProps={{ min: 0, step: 0.5, inputMode: "decimal" }}
                                  defaultValue={set.weight}
                                  required
                                />
                              </Grid>
                            </Grid>

                            <Stack direction="row" spacing={1}>
                              <Button type="submit" variant="contained" fullWidth>
                                Save set
                              </Button>

                              {entry.sets.length > 1 ? (
                                <Button
                                  type="submit"
                                  formAction={removeSetAction}
                                  formNoValidate
                                  variant="outlined"
                                  color="inherit"
                                  fullWidth
                                >
                                  Delete
                                </Button>
                              ) : null}
                            </Stack>
                          </Stack>
                        </form>
                      </Paper>
                    ))}
                  </Stack>

                  <form action={addSetAction}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <input type="hidden" name="entryId" value={entry.id} />
                    <Button
                      type="submit"
                      variant="outlined"
                      startIcon={<RepeatRounded />}
                      fullWidth
                    >
                      Add set
                    </Button>
                  </form>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
