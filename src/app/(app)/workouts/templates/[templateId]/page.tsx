import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {
  FormStatusButton,
  FormStatusIconButton,
} from "@/components/app/FormStatusButtons";
import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import {
  addTemplateExerciseAction,
  deleteWorkoutTemplateAction,
  moveTemplateExerciseAction,
  removeTemplateExerciseAction,
  renameWorkoutTemplateAction,
  startWorkoutFromTemplateAction,
} from "@/features/workout-templates/actions";
import { requireWorkoutTemplateForEditing } from "@/features/workout-templates/queries";

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

function formatUnit(unit: "kg" | "bodyweight") {
  return unit === "kg" ? "kg" : "BW";
}

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
              disabled={template.exercises.length === 0}
              fullWidth
            >
              Start workout
            </FormStatusButton>
          </form>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.25 }}>
        <Stack spacing={2}>
          <Typography variant="h3">Template details</Typography>

          <form action={renameWorkoutTemplateAction}>
            <Stack spacing={1.5}>
              <input type="hidden" name="templateId" value={template.id} />
              <TextField
                label="Template name"
                name="name"
                defaultValue={template.name}
                inputProps={{ maxLength: 80 }}
                required
                fullWidth
              />
              <FormStatusButton
                type="submit"
                variant="outlined"
                startIcon={<SaveRounded />}
                loadingLabel="Saving..."
                fullWidth
              >
                Save name
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
              Use the arrow controls to adjust the sequence.
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
            <Stack spacing={1.25}>
              {template.exercises.map((exercise, index) => (
                <Paper
                  key={exercise.id}
                  elevation={0}
                  sx={{
                    borderRadius: "8px",
                    px: 1.5,
                    py: 1.5,
                    bgcolor: "rgba(255,255,255,0.02)",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    minWidth={0}
                  >
                    <Chip label={index + 1} color="primary" variant="outlined" />

                    <Stack spacing={0.25} flex={1} minWidth={0}>
                      <Typography variant="body1" fontWeight={700} noWrap>
                        {exercise.exerciseName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {exercise.exerciseCategory} ·{" "}
                        {formatUnit(exercise.defaultUnit)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.25}>
                      <form action={moveTemplateExerciseAction}>
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />
                        <input
                          type="hidden"
                          name="templateExerciseId"
                          value={exercise.id}
                        />
                        <input type="hidden" name="direction" value="up" />
                        <Tooltip title="Move up">
                          <span>
                            <FormStatusIconButton
                              type="submit"
                              aria-label={`Move ${exercise.exerciseName} up`}
                              disabled={index === 0}
                              size="small"
                            >
                              <ArrowUpwardRounded fontSize="small" />
                            </FormStatusIconButton>
                          </span>
                        </Tooltip>
                      </form>

                      <form action={moveTemplateExerciseAction}>
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />
                        <input
                          type="hidden"
                          name="templateExerciseId"
                          value={exercise.id}
                        />
                        <input type="hidden" name="direction" value="down" />
                        <Tooltip title="Move down">
                          <span>
                            <FormStatusIconButton
                              type="submit"
                              aria-label={`Move ${exercise.exerciseName} down`}
                              disabled={index === template.exercises.length - 1}
                              size="small"
                            >
                              <ArrowDownwardRounded fontSize="small" />
                            </FormStatusIconButton>
                          </span>
                        </Tooltip>
                      </form>

                      <form action={removeTemplateExerciseAction}>
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />
                        <input
                          type="hidden"
                          name="templateExerciseId"
                          value={exercise.id}
                        />
                        <Tooltip title="Remove">
                          <IconButton
                            type="submit"
                            aria-label={`Remove ${exercise.exerciseName}`}
                            size="small"
                            sx={{ color: "text.secondary" }}
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </form>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
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
