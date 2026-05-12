import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import AddBoxRounded from "@mui/icons-material/AddBoxRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import PlaylistAddRounded from "@mui/icons-material/PlaylistAddRounded";
import RepeatRounded from "@mui/icons-material/RepeatRounded";
import SkipNextRounded from "@mui/icons-material/SkipNextRounded";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import { saveActiveWorkoutAsTemplateAction } from "@/features/workout-templates/actions";
import {
  addExerciseEntryAction,
  addSetAction,
  advanceWorkoutExerciseAction,
  completeWorkoutSessionAction,
  createSetAction,
  removeExerciseEntryAction,
  removeSetAction,
  updateSetAction,
} from "@/features/workouts/actions";
import { requireWorkoutSessionForLogging } from "@/features/workouts/queries";

import { ExercisePickerForm } from "./exercise-picker-form";
import { WorkoutFirstSetForm } from "./first-set-form";
import { WorkoutSetEditorForm } from "./set-editor-form";

type WorkoutSessionData = Awaited<
  ReturnType<typeof requireWorkoutSessionForLogging>
>;
type WorkoutEntry = WorkoutSessionData["entries"][number];
type WorkoutSet = WorkoutEntry["sets"][number];

type WorkoutPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatWorkoutDate(performedOn: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
  }).format(new Date(`${performedOn}T00:00:00`));
}

function formatWorkoutTemplateName(performedOn: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${performedOn}T00:00:00`));

  return `Workout ${date}`;
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
  previousSet: {
    performedOn: string;
    reps: number;
    setNumber: number;
    weight: number;
    unit: "kg" | "bodyweight";
  } | null,
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

function getFirstSetDefaults(entry: WorkoutEntry) {
  return {
    reps: entry.previousSet?.reps ?? 8,
    weight: entry.previousSet?.weight ?? 0,
  };
}

function EntryHeader({
  entry,
  current = false,
}: {
  entry: WorkoutEntry;
  current?: boolean;
}) {
  return (
    <Stack spacing={0.5} minWidth={0}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Typography variant="h3">{entry.exerciseNameSnapshot}</Typography>
        {current ? (
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
  );
}

function SetEditor({
  sessionId,
  entry,
  set,
  emphasize = false,
}: {
  sessionId: string;
  entry: WorkoutEntry;
  set: WorkoutSet;
  emphasize?: boolean;
}) {
  return (
    <WorkoutSetEditorForm
      sessionId={sessionId}
      setId={set.id}
      setNumber={set.setNumber}
      initialReps={set.reps}
      initialWeight={set.weight}
      weightLabel={entry.unitSnapshot === "kg" ? "Weight (kg)" : "Weight"}
      canDelete={entry.sets.length > 1}
      emphasize={emphasize}
      updateSetAction={updateSetAction}
      removeSetAction={removeSetAction}
    />
  );
}

function LoggedSets({
  sessionId,
  entry,
  currentSetId,
}: {
  sessionId: string;
  entry: WorkoutEntry;
  currentSetId?: string;
}) {
  if (entry.sets.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: "8px",
          px: 1.75,
          py: 1.5,
          bgcolor: "rgba(255,255,255,0.02)",
        }}
      >
        <Typography color="text.secondary">No sets logged.</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.25}>
      {entry.sets.map((set) => (
        <SetEditor
          key={set.id}
          sessionId={sessionId}
          entry={entry}
          set={set}
          emphasize={set.id === currentSetId}
        />
      ))}
    </Stack>
  );
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
  const successMessage = resolvedSearchParams?.success?.trim();
  const totalSets = session.entries.reduce(
    (count, entry) => count + entry.sets.length,
    0,
  );
  const fallbackActiveSortOrder =
    session.activeEntrySortOrder ?? session.entries.at(-1)?.sortOrder ?? null;
  const currentEntry =
    session.entries.find(
      (entry) => entry.sortOrder === fallbackActiveSortOrder,
    ) ??
    session.entries.at(-1) ??
    null;
  const upcomingEntries = currentEntry
    ? session.entries.filter((entry) => entry.sortOrder > currentEntry.sortOrder)
    : [];
  const previousEntries = currentEntry
    ? session.entries
        .filter((entry) => entry.sortOrder < currentEntry.sortOrder)
        .reverse()
    : [...session.entries].reverse();
  const nextEntry = upcomingEntries.at(0) ?? null;
  const currentSetId = currentEntry?.sets.at(-1)?.id;
  const currentFirstSetDefaults = currentEntry
    ? getFirstSetDefaults(currentEntry)
    : null;

  return (
    <Stack spacing={2.5}>
      {errorMessage ? (
        <Alert severity="error" variant="filled">
          {errorMessage}
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert severity="success" variant="filled">
          {successMessage}
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ borderRadius: "12px", px: 2.5, py: 3 }}>
        <Stack spacing={2.5}>
          <Stack spacing={1.5}>
            <Typography variant="h1">Current workout.</Typography>
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
                    <Typography variant="h3">
                      {currentEntry.exerciseNameSnapshot}
                    </Typography>
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
                  Exercises
                </Typography>
                <Typography variant="h3">{session.entries.length}</Typography>
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
                  {formatWorkoutTime(session.startedAt)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <form action={completeWorkoutSessionAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <FormStatusButton
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<CheckCircleRounded />}
              loadingLabel="Finishing workout..."
              fullWidth
            >
              Finish workout
            </FormStatusButton>
          </form>
        </Stack>
      </Paper>

      {currentEntry ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: "10px",
            px: 2,
            py: 2.25,
            bgcolor: "rgba(139,194,172,0.04)",
            borderColor: "rgba(139,194,172,0.14)",
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
                <EntryHeader entry={currentEntry} current />

                <form action={removeExerciseEntryAction}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="entryId" value={currentEntry.id} />
                  <FormStatusButton
                    type="submit"
                    variant="text"
                    color="inherit"
                    startIcon={<DeleteOutlineRounded />}
                    loadingLabel="Removing..."
                    sx={{ color: "text.secondary", minWidth: 0, px: 1 }}
                  >
                    Remove
                  </FormStatusButton>
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
                    {formatPreviousSet(currentEntry.previousSet)}
                  </Typography>
                </Stack>
              </Paper>
            </Stack>

            {currentEntry.sets.length === 0 && currentFirstSetDefaults ? (
              <WorkoutFirstSetForm
                sessionId={session.id}
                entryId={currentEntry.id}
                initialReps={currentFirstSetDefaults.reps}
                initialWeight={currentFirstSetDefaults.weight}
                weightLabel={
                  currentEntry.unitSnapshot === "kg" ? "Weight (kg)" : "Weight"
                }
                createSetAction={createSetAction}
              />
            ) : (
              <>
                <LoggedSets
                  sessionId={session.id}
                  entry={currentEntry}
                  currentSetId={currentSetId}
                />

                <form action={addSetAction}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="entryId" value={currentEntry.id} />
                  <FormStatusButton
                    type="submit"
                    variant="outlined"
                    startIcon={<AddBoxRounded />}
                    loadingLabel="Logging next set..."
                    fullWidth
                  >
                    Log next set
                  </FormStatusButton>
                </form>
              </>
            )}

            {nextEntry ? (
              <form action={advanceWorkoutExerciseAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <FormStatusButton
                  type="submit"
                  variant="contained"
                  color="secondary"
                  startIcon={<SkipNextRounded />}
                  loadingLabel="Moving..."
                  fullWidth
                >
                  Next exercise
                </FormStatusButton>
              </form>
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      {upcomingEntries.length > 0 ? (
        <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.25 }}>
          <Stack spacing={1.5}>
            <Stack spacing={0.5}>
              <Typography variant="h3">Upcoming</Typography>
              <Typography color="text.secondary">
                Planned exercises stay ready without logging sets early.
              </Typography>
            </Stack>

            <Stack spacing={1}>
              {upcomingEntries.map((entry) => (
                <Paper
                  key={entry.id}
                  elevation={0}
                  sx={{
                    borderRadius: "8px",
                    px: 2,
                    py: 1.5,
                    bgcolor: "rgba(255,255,255,0.02)",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                  >
                    <EntryHeader entry={entry} />
                    <Chip label="Planned" size="small" variant="outlined" />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.25 }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Add an extra exercise</Typography>
          </Stack>

          {session.exerciseOptions.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                borderRadius: "8px",
                px: 2,
                py: 2.5,
                bgcolor: "rgba(255,255,255,0.02)",
              }}
            >
              <Stack spacing={1}>
                <Typography variant="h3" sx={{ fontSize: "1rem" }}>
                  No exercises available yet.
                </Typography>
                <Typography color="text.secondary">
                  Create exercises first, then come back here.
                </Typography>
                <Button
                  component={NextLink}
                  href="/exercises"
                  variant="contained"
                >
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

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.25 }}>
        <form action={saveActiveWorkoutAsTemplateAction}>
          <Stack spacing={1.5}>
            <Stack spacing={0.75}>
              <Typography variant="h3">Save as template</Typography>
              <Typography color="text.secondary">
                Reuse this exercise order for future workouts.
              </Typography>
            </Stack>
            <input type="hidden" name="sessionId" value={session.id} />
            <TextField
              label="Template name"
              name="name"
              defaultValue={formatWorkoutTemplateName(session.performedOn)}
              inputProps={{ maxLength: 80 }}
              required
              fullWidth
            />
            <FormStatusButton
              type="submit"
              variant="outlined"
              startIcon={<PlaylistAddRounded />}
              loadingLabel="Saving..."
              fullWidth
            >
              Save template
            </FormStatusButton>
          </Stack>
        </form>
      </Paper>

      {currentEntry === null ? (
        <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.5 }}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Nothing planned yet.</Typography>
            <Typography color="text.secondary">
              Add an exercise above to start entering reps.
            </Typography>
          </Stack>
        </Paper>
      ) : previousEntries.length > 0 ? (
        <Stack spacing={1.5}>
          <Stack spacing={0.5} px={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <InsightsRounded color="primary" />
              <Typography variant="h3">Earlier in this workout</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Previous exercises stay editable, but collapsed so the current
              block keeps priority.
            </Typography>
          </Stack>

          {previousEntries.map((entry) => (
            <Accordion
              key={entry.id}
              disableGutters
              elevation={0}
              sx={{
                borderRadius: "10px",
                "&:before": { display: "none" },
                overflow: "hidden",
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Stack spacing={0.75} width="100%">
                  <EntryHeader entry={entry} />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`${entry.sets.length} sets`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={formatPreviousSet(entry.previousSet)}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={1.5}>
                  <form action={removeExerciseEntryAction}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <input type="hidden" name="entryId" value={entry.id} />
                    <FormStatusButton
                      type="submit"
                      variant="text"
                      color="inherit"
                      startIcon={<DeleteOutlineRounded />}
                      loadingLabel="Removing exercise..."
                      sx={{ color: "text.secondary", minWidth: 0, px: 0 }}
                    >
                      Remove exercise
                    </FormStatusButton>
                  </form>

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

                  <LoggedSets sessionId={session.id} entry={entry} />

                  {entry.sets.length > 0 ? (
                    <form action={addSetAction}>
                      <input type="hidden" name="sessionId" value={session.id} />
                      <input type="hidden" name="entryId" value={entry.id} />
                      <FormStatusButton
                        type="submit"
                        variant="outlined"
                        startIcon={<RepeatRounded />}
                        loadingLabel="Adding set..."
                        fullWidth
                      >
                        Add set
                      </FormStatusButton>
                    </form>
                  ) : null}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
