import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { requireUser } from "@/features/auth/session";
import { getExercisesForUser } from "@/features/exercises/queries";

import { ExerciseCreateForm } from "./exercise-create-form";
import { ExerciseLibrary } from "./exercise-library";

type ExercisesPageProps = {
  searchParams?: Promise<{
    error?: string;
    q?: string;
    success?: string;
  }>;
};

export default async function ExercisesPage({
  searchParams,
}: ExercisesPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error?.trim() ?? "";
  const query = resolvedSearchParams?.q?.trim() ?? "";
  const successMessage = resolvedSearchParams?.success?.trim() ?? "";
  const exerciseList = await getExercisesForUser(user.id);

  return (
    <Stack spacing={3}>
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

      <Paper elevation={0} sx={{ borderRadius: "12px", px: 2.75, py: 3.25 }}>
        <Stack spacing={1}>
          <Typography variant="h1">Exercises</Typography>
          <Typography color="text.secondary">
            Create exercises once, and reuse them inside your workouts.
          </Typography>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
            <ExerciseLibrary exercises={exerciseList} initialQuery={query} />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
            <Stack spacing={2.25}>
              <Stack spacing={0.75}>
                <Typography variant="h3">Create exercise</Typography>
              </Stack>
              <ExerciseCreateForm />
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
