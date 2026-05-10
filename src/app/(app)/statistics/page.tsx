import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import { searchExercisesForUser } from "@/features/exercises/queries";
import { getExerciseProgressForUser } from "@/features/workouts/queries";

function formatPerformedOn(performedOn: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(`${performedOn}T00:00:00`),
  );
}

function formatWeight(unit: "kg" | "bodyweight", weight: number) {
  if (unit === "bodyweight") {
    return weight === 0 ? "BW" : `${weight} BW`;
  }

  return `${weight} kg`;
}

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ exerciseId?: string }>;
}) {
  const user = await requireUser();
  const exercises = await searchExercisesForUser(user.id);
  const params = await searchParams;

  const selectedExerciseId =
    params.exerciseId && exercises.some((exercise) => exercise.id === params.exerciseId)
      ? params.exerciseId
      : exercises[0]?.id;

  const selectedExercise = exercises.find(
    (exercise) => exercise.id === selectedExerciseId,
  );

  const progress = selectedExerciseId
    ? await getExerciseProgressForUser(user.id, selectedExerciseId)
    : null;

  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ borderRadius: "12px", px: 2.5, py: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h1">Statistics</Typography>
          <Typography color="text.secondary">
            Select an exercise to review your progression over time.
          </Typography>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.5 }}>
        {exercises.length === 0 ? (
          <Stack spacing={1.25}>
            <Typography variant="h3">No exercises available yet.</Typography>
            <Typography color="text.secondary">
              Add an exercise first so we can track progression over time.
            </Typography>
            <Button component={NextLink} href="/exercises" variant="contained">
              Create exercise
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <form>
              <TextField
                select
                fullWidth
                name="exerciseId"
                label="Exercise"
                defaultValue={selectedExerciseId}
              >
                {exercises.map((exercise) => (
                  <MenuItem key={exercise.id} value={exercise.id}>
                    {exercise.name} · {exercise.category}
                  </MenuItem>
                ))}
              </TextField>
              <Button type="submit" sx={{ mt: 1 }}>
                Load statistics
              </Button>
            </form>

            {selectedExercise && progress ? (
              <Stack spacing={1.5}>
                <Typography variant="h3">{selectedExercise.name}</Typography>
                <Typography color="text.secondary" variant="body2">
                  Helpful metrics: max weight trend, training volume per session,
                  and consistency (number of sessions).
                </Typography>

                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.02)" }}>
                  <Typography variant="body2" color="text.secondary">
                    Sessions: {progress.totals.totalSessions} · Sets: {progress.totals.totalSets} · Reps: {progress.totals.totalReps}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total volume: {progress.totals.totalVolume.toFixed(2)} · Current best: {formatWeight(selectedExercise.defaultUnit, progress.totals.currentBestWeight)} · All-time best: {formatWeight(selectedExercise.defaultUnit, progress.totals.allTimeBestWeight)}
                  </Typography>
                </Paper>

                <Stack spacing={1}>
                  {progress.sessions.length === 0 ? (
                    <Typography color="text.secondary">
                      No completed workouts logged yet for this exercise.
                    </Typography>
                  ) : (
                    progress.sessions.map((session) => (
                      <Paper
                        key={`${session.performedOn}-${session.startedAt.toISOString()}`}
                        elevation={0}
                        sx={{ px: 1.5, py: 1.25, borderRadius: "6px", bgcolor: "rgba(255,255,255,0.03)" }}
                      >
                        <Typography variant="body2" fontWeight={700}>
                          {formatPerformedOn(session.performedOn)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Max weight: {formatWeight(session.unit, session.maxWeight)} · Volume: {session.totalVolume.toFixed(2)} · Reps: {session.totalReps} · Sets: {session.setCount}
                        </Typography>
                      </Paper>
                    ))
                  )}
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
