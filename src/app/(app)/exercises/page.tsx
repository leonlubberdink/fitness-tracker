import SearchRounded from "@mui/icons-material/SearchRounded";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { requireUser } from "@/features/auth/session";
import { getExercisesForUser } from "@/features/exercises/queries";

import { ExerciseCreateForm } from "./exercise-create-form";

type ExercisesPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

function formatDefaultUnit(unit: "kg" | "bodyweight") {
  return unit === "kg" ? "kg" : "bodyweight";
}

export default async function ExercisesPage({
  searchParams,
}: ExercisesPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim() ?? "";
  const exerciseList = await getExercisesForUser(user.id, query);

  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ borderRadius: "16px", px: 3, py: 3.5 }}>
        <Stack spacing={1.5}>
          <Chip
            label="Reusable exercise library"
            color="primary"
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
          />
          <Typography variant="h1">Exercises</Typography>
          <Typography color="text.secondary">
            Create exercises once, keep names consistent, and reuse them inside
            the workout flow with minimal friction.
          </Typography>
        </Stack>
      </Paper>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={{ borderRadius: "14px", px: 2.5, py: 2.5 }}>
            <Stack spacing={2.5}>
              <Stack spacing={0.75}>
                <Typography variant="h3">Create exercise</Typography>
                <Typography color="text.secondary">
                  Keep the library tidy so picking the next exercise stays
                  quick during training.
                </Typography>
              </Stack>
              <ExerciseCreateForm />
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ borderRadius: "14px", px: 2.5, py: 2.5 }}>
            <Stack spacing={2.5}>
              <Stack spacing={1.5}>
                <Stack spacing={0.75}>
                  <Typography variant="h3">Exercise library</Typography>
                  <Typography color="text.secondary">
                    Search by name, scan by category, and keep the list calm
                    enough to use quickly mid-workout.
                  </Typography>
                </Stack>

                <form>
                  <TextField
                    fullWidth
                    type="search"
                    name="q"
                    defaultValue={query}
                    placeholder="Search exercises"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRounded />
                        </InputAdornment>
                      ),
                    }}
                  />
                </form>
              </Stack>

              {exerciseList.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "12px",
                    px: 2,
                    py: 3,
                    bgcolor: "rgba(255,255,255,0.02)",
                  }}
                >
                  <Stack spacing={0.75}>
                    <Typography variant="h3" sx={{ fontSize: "1rem" }}>
                      {query ? "No exercises match that search." : "No exercises yet."}
                    </Typography>
                    <Typography color="text.secondary">
                      {query
                        ? "Try a different name or clear the search."
                        : "Create your first exercise to start building the library."}
                    </Typography>
                  </Stack>
                </Paper>
              ) : (
                <List disablePadding sx={{ display: "grid", gap: 1.25 }}>
                  {exerciseList.map((exercise) => (
                    <Paper
                      key={exercise.id}
                      elevation={0}
                      sx={{ borderRadius: "12px", px: 2, py: 1.75 }}
                    >
                      <ListItem disablePadding>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight={700}>
                              {exercise.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {exercise.category}
                            </Typography>
                          }
                        />
                        <Chip
                          label={formatDefaultUnit(exercise.defaultUnit)}
                          variant="outlined"
                          color="primary"
                        />
                      </ListItem>
                    </Paper>
                  ))}
                </List>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
