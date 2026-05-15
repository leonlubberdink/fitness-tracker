import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {
  FormStatusButton,
} from "@/components/app/FormStatusButtons";
import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import {
  createWorkoutTemplateAction,
  deleteWorkoutTemplateAction,
  startWorkoutFromTemplateAction,
} from "@/features/workout-templates/actions";
import { getWorkoutTemplatesForUser } from "@/features/workout-templates/queries";

type WorkoutsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatTemplateUpdatedAt(updatedAt: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(updatedAt);
}

export default async function WorkoutsPage({
  searchParams,
}: WorkoutsPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error?.trim() ?? "";
  const successMessage = resolvedSearchParams?.success?.trim() ?? "";
  const templates = await getWorkoutTemplatesForUser(user.id);

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
        <Stack spacing={1.75}>
          <Stack spacing={1}>
            <Typography variant="h1">Workouts</Typography>
            <Typography color="text.secondary">
              Create a reusable workout plan or start from an existing template.
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
            <Stack spacing={2.5}>
              <Stack spacing={0.75}>
                <Typography variant="h3">Workout templates</Typography>
              </Stack>

              {templates.length === 0 ? (
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
                      No templates yet.
                    </Typography>
                    <Typography color="text.secondary">
                      Create a named plan, add exercises, then start logging
                      from it.
                    </Typography>
                  </Stack>
                </Paper>
              ) : (
                <Stack spacing={1.5}>
                  {templates.map((template) => (
                    <Paper
                      key={template.id}
                      elevation={0}
                      sx={{
                        position: "relative",
                        borderRadius: "8px",
                        px: 2,
                        py: 1.75,
                        bgcolor: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <Box
                        component={NextLink}
                        href={`/workouts/templates/${template.id}`}
                        aria-label={`Open ${template.name} template`}
                        sx={{
                          position: "absolute",
                          inset: 0,
                          zIndex: 1,
                          display: "block",
                          borderRadius: "inherit",
                          textDecoration: "none",
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,0.03)",
                          },
                          "&:focus-visible": {
                            bgcolor: "rgba(255,255,255,0.03)",
                            outline: "2px solid",
                            outlineColor: "primary.main",
                            outlineOffset: "2px",
                          },
                        }}
                      />

                      <Stack spacing={1.5}>
                        <Stack spacing={0.5}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Typography variant="body1" fontWeight={700}>
                              {template.name}
                            </Typography>
                            <Chip
                              label={`${template.exerciseCount} exercises`}
                              size="small"
                              color={
                                template.exerciseCount > 0
                                  ? "primary"
                                  : "default"
                              }
                              variant="outlined"
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            Updated{" "}
                            {formatTemplateUpdatedAt(template.updatedAt)}
                          </Typography>
                        </Stack>

                        {template.exercises.length > 0 ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            {template.exercises.slice(0, 4).map((exercise) => (
                              <Chip
                                key={exercise.id}
                                label={exercise.exerciseName}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {template.exercises.length > 4 ? (
                              <Chip
                                label={`+${template.exercises.length - 4}`}
                                size="small"
                              />
                            ) : null}
                          </Stack>
                        ) : (
                          <Typography color="text.secondary">
                            Add exercises before starting this template.
                          </Typography>
                        )}

                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ position: "relative", zIndex: 2 }}
                        >
                          <Box
                            component="form"
                            action={startWorkoutFromTemplateAction}
                            sx={{ flex: 1 }}
                          >
                            <input
                              type="hidden"
                              name="templateId"
                              value={template.id}
                            />
                            <FormStatusButton
                              type="submit"
                              variant="contained"
                              startIcon={<PlayArrowRounded />}
                              loadingLabel="Starting..."
                              disabled={template.exerciseCount === 0}
                              fullWidth
                            >
                              Start
                            </FormStatusButton>
                          </Box>

                          <Box component="form" action={deleteWorkoutTemplateAction}>
                            <input
                              type="hidden"
                              name="templateId"
                              value={template.id}
                            />
                            <Tooltip title="Delete template">
                              <FormStatusButton
                                type="submit"
                                aria-label={`Delete ${template.name}`}
                                variant="outlined"
                                color="inherit"
                                sx={{
                                  minWidth: 48,
                                  width: 48,
                                  px: 0,
                                  color: "text.secondary",
                                  borderColor: "divider",
                                  flexShrink: 0,
                                }}
                              >
                                <DeleteOutlineRounded fontSize="small" />
                              </FormStatusButton>
                            </Tooltip>
                          </Box>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
            <Stack spacing={2.25}>
              <Stack spacing={0.75}>
                <Typography variant="h3">Create workout</Typography>
                <Typography color="text.secondary">
                  New workouts are saved as templates first.
                </Typography>
              </Stack>

              <form action={createWorkoutTemplateAction}>
                <Stack spacing={1.5}>
                  <TextField
                    label="Template name"
                    name="name"
                    placeholder="Upper body"
                    slotProps={{ htmlInput: { maxLength: 80 } }}
                    required
                    fullWidth
                  />
                  <FormStatusButton
                    type="submit"
                    variant="contained"
                    startIcon={<AddRounded />}
                    loadingLabel="Creating..."
                    fullWidth
                  >
                    Create template
                  </FormStatusButton>
                </Stack>
              </form>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
