import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import {
  addTemplateExerciseAction,
  deleteWorkoutTemplateAction,
  reorderTemplateExercisesAction,
  removeTemplateExerciseAction,
  startWorkoutFromTemplateAction,
  updateTemplateExercisePrescriptionAction,
  updateWorkoutTemplateDetailsAction,
} from "@/features/workout-templates/actions";
import { requireWorkoutTemplateForEditing } from "@/features/workout-templates/queries";

import { TemplateExerciseOrderList } from "./template-exercise-order-list";
import { TemplateExercisePickerForm } from "./template-exercise-picker-form";

type TemplatePageProps = {
  params: Promise<{
    templateId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function WorkoutTemplatePage({
  params,
  searchParams,
}: TemplatePageProps) {
  const user = await requireUser();
  const { templateId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error?.trim() ?? "";
  const successMessage = resolvedSearchParams?.success?.trim() ?? "";
  const template = await requireWorkoutTemplateForEditing(user.id, templateId);
  const excludedExerciseIds = template.exercises.map(
    (exercise) => exercise.exerciseId,
  );

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
        <Stack spacing={2.25}>
          <Stack spacing={1}>
            <Typography variant="h1">{template.name}</Typography>
            <Typography color="text.secondary">
              Build the exercise order before starting the workout.
            </Typography>
          </Stack>

          <form action={startWorkoutFromTemplateAction}>
            <input type="hidden" name="templateId" value={template.id} />
            <FormStatusButton
              type="submit"
              variant="contained"
              startIcon={<PlayArrowRounded />}
              loadingLabel="Starting workout..."
              disabled={!template.isReadyToStart}
              fullWidth
            >
              Start workout
            </FormStatusButton>
          </form>
          {template.exercises.length > 0 && !template.isReadyToStart ? (
            <Alert severity="warning" variant="outlined">
              Complete the sets x reps and rest time for every exercise before
              starting this template.
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.25 }}>
        <Stack spacing={2}>
          <Typography variant="h3">Template details</Typography>

          <form action={updateWorkoutTemplateDetailsAction}>
            <Stack spacing={1.5}>
              <input type="hidden" name="templateId" value={template.id} />
              <TextField
                label="Template name"
                name="name"
                defaultValue={template.name}
                slotProps={{ htmlInput: { maxLength: 80 } }}
                required
                fullWidth
              />
              <TextField
                label="Workout description"
                name="description"
                defaultValue={template.description ?? ""}
                placeholder="Summarize the goal of this workout or add notes."
                multiline
                minRows={4}
                fullWidth
              />
              <FormStatusButton
                type="submit"
                variant="outlined"
                startIcon={<SaveRounded />}
                loadingLabel="Saving..."
                fullWidth
              >
                Save details
              </FormStatusButton>
            </Stack>
          </form>

          <form action={deleteWorkoutTemplateAction}>
            <input type="hidden" name="templateId" value={template.id} />
            <FormStatusButton
              type="submit"
              variant="text"
              color="inherit"
              startIcon={<DeleteOutlineRounded />}
              loadingLabel="Deleting..."
              sx={{ color: "text.secondary" }}
              fullWidth
            >
              Delete template
            </FormStatusButton>
          </form>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.25 }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Exercise order</Typography>
            <Typography color="text.secondary">
              Drag items to adjust the sequence.
            </Typography>
          </Stack>

          {template.exercises.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                borderRadius: "8px",
                px: 2,
                py: 2.5,
                bgcolor: "rgba(255,255,255,0.02)",
              }}
            >
              <Stack spacing={0.75}>
                <Typography variant="h3" sx={{ fontSize: "1rem" }}>
                  No exercises in this template yet.
                </Typography>
                <Typography color="text.secondary">
                  Add at least one exercise before starting it.
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <TemplateExerciseOrderList
              key={template.exercises.map((exercise) => exercise.id).join(":")}
              templateId={template.id}
              exercises={template.exercises}
              reorderTemplateExercisesAction={reorderTemplateExercisesAction}
              removeTemplateExerciseAction={removeTemplateExerciseAction}
              updateTemplateExercisePrescriptionAction={
                updateTemplateExercisePrescriptionAction
              }
            />
          )}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.25 }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Add exercise</Typography>
          </Stack>

          {template.exerciseOptions.length === 0 ? (
            <Stack spacing={1.25}>
              <Typography color="text.secondary">
                Create exercises first, then add them to this template.
              </Typography>
              <Button component={NextLink} href="/exercises" variant="contained">
                Go to exercises
              </Button>
            </Stack>
          ) : (
            <TemplateExercisePickerForm
              templateId={template.id}
              availableCategories={template.availableCategories}
              initialExercises={template.exerciseOptions}
              excludedExerciseIds={excludedExerciseIds}
              addTemplateExerciseAction={addTemplateExerciseAction}
            />
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
