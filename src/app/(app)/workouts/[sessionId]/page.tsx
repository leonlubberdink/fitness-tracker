import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import NorthEastRounded from "@mui/icons-material/NorthEastRounded";
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
  const currentEntry = session.entries.at(-1) ?? null;
  const displayEntries = [...session.entries].reverse();

  return (
    <Stack spacing={2.5}>
      {errorMessage ? (
        <Alert severity="error" variant="filled">
          {errorMessage}
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ borderRadius: "12px", px: 2.5, py: 3 }}>
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

          {currentEntry ? (
            <Paper
              elevation={0}
              sx={{
                px: 2,
                py: 1.75,
                borderRadius: "8px",
                bgcolor: "rgba(139,194,172,0.08)",
                borderColor: "rgba(139,194,172,0.18)",
              }}
            >
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                >
                  <Stack spacing={0.5} minWidth={0}>
                    <Typography variant="overline" color="primary.light">
                      Current exercise
                    </Typography>
                    <Typography variant="h3">{currentEntry.exerciseNameSnapshot}</Typography>
                  </Stack>
                  <Chip
                    label={`${currentEntry.sets.length} logged`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {currentEntry.previousSet
                    ? `Last completed: ${formatPreviousSet(currentEntry.previousSet)}`
                    : "No completed history for this exercise yet."}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Next likely action: log the next set here, or add the next
                  exercise when this block is done.
                </Typography>
              </Stack>
            </Paper>
          ) : null}

          <Grid container spacing={1.5}>
            <Grid size={4}>
              <Paper
                elevation={0}
                sx={{ p: 1.75, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.02)" }}
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
                sx={{ p: 1.75, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.02)" }}
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
                sx={{ p: 1.75, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.02)" }}
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

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.25 }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Add the next exercise</Typography>
            <Typography color="text.secondary">
              Search your library, choose the next movement, and let the first
              set appear automatically so you can keep the flow moving.
            </Typography>
          </Stack>

          {session.exerciseOptions.length === 0 ? (
            <Paper
              elevation={0}
              sx={{ borderRadius: "8px", px: 2, py: 2.5, bgcolor: "rgba(255,255,255,0.02)" }}
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
        <Stack spacing={0.5} px={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <InsightsRounded color="primary" />
            <Typography variant="h3">Logged exercises</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Most recent exercise first, so the current block stays closest to
            your thumb.
          </Typography>
        </Stack>

        {session.entries.length === 0 ? (
          <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.5 }}>
            <Stack spacing={0.75}>
              <Typography variant="h3">Nothing logged yet.</Typography>
              <Typography color="text.secondary">
                Add the first exercise above to start entering reps and weight.
              </Typography>
            </Stack>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {displayEntries.map((entry) => {
              const isCurrent = currentEntry?.id === entry.id;

              return (
              <Paper
                key={entry.id}
                elevation={0}
                sx={{
                  borderRadius: "10px",
                  px: 2,
                  py: 2.25,
                  bgcolor: isCurrent ? "rgba(139,194,172,0.05)" : undefined,
                  borderColor: isCurrent
                    ? "rgba(139,194,172,0.16)"
                    : undefined,
                }}
              >
                <Stack spacing={2}>
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Stack spacing={0.5} minWidth={0}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Typography variant="h3">{entry.exerciseNameSnapshot}</Typography>
                          {isCurrent ? (
                            <Chip
                              label="Current"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ) : null}
                        </Stack>
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
                          sx={{ color: "text.secondary", minWidth: 0, px: 1 }}
                        >
                          Remove
                        </Button>
                      </form>
                    </Stack>

                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: "8px",
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
                          p: 1.5,
                          borderRadius: "8px",
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
                              <Button type="submit" variant="contained" sx={{ flex: 1 }}>
                                Save set
                              </Button>

                              {entry.sets.length > 1 ? (
                                <Button
                                  type="submit"
                                  formAction={removeSetAction}
                                  formNoValidate
                                  variant="outlined"
                                  color="inherit"
                                  sx={{ minWidth: 88 }}
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
                      startIcon={isCurrent ? <NorthEastRounded /> : <RepeatRounded />}
                      fullWidth
                    >
                      {isCurrent ? "Log next set" : "Add set"}
                    </Button>
                  </form>
                </Stack>
              </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
