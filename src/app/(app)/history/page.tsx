import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import PlaylistAddRounded from "@mui/icons-material/PlaylistAddRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import { saveCompletedWorkoutAsTemplateAction } from "@/features/workout-templates/actions";
import { getCompletedWorkoutHistoryForUser } from "@/features/workouts/queries";

import { HistorySessionDeleteButton } from "./history-session-delete-button";

function formatPerformedOn(performedOn: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
  }).format(new Date(`${performedOn}T00:00:00`));
}

function formatTime(value: Date | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeStyle: "short",
  }).format(value);
}

function formatSetWeight(unit: "kg" | "bodyweight", weight: number) {
  if (unit === "bodyweight") {
    return weight === 0 ? "BW" : `${weight} BW`;
  }

  return `${weight} kg`;
}

type HistoryPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatTemplateName(performedOn: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${performedOn}T00:00:00`));

  return `Workout ${date}`;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error?.trim() ?? "";
  const successMessage = resolvedSearchParams?.success?.trim() ?? "";
  const historyGroups = await getCompletedWorkoutHistoryForUser(user.id);
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
        <Stack spacing={1.5}>
          <Typography variant="h1">History</Typography>
        </Stack>
      </Paper>

      {historyGroups.length === 0 ? (
        <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.5 }}>
          <Stack spacing={1.25}>
            <Typography variant="h3">No completed workouts yet.</Typography>
            <Typography color="text.secondary">
              Finish a session and it will appear here with the exercises and
              sets you logged.
            </Typography>
            <Button component={NextLink} href="/workouts" variant="contained">
              Start a workout
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {historyGroups.map((group) => (
            <Stack key={group.performedOn} spacing={1.25}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ px: 0.5 }}
              >
                {formatPerformedOn(group.performedOn)}
              </Typography>

              <Stack spacing={1}>
                {group.sessions.map((session) => (
                  <Accordion
                    key={session.id}
                    disableGutters
                    elevation={0}
                    sx={{
                      borderRadius: "10px",
                      overflow: "hidden",
                      "&:before": { display: "none" },
                    }}
                  >
                    <AccordionSummary
                      component="div"
                      expandIcon={<ExpandMoreRounded />}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.25}
                        width="100%"
                      >
                        <HistorySessionDeleteButton sessionId={session.id} />
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="flex-start"
                          spacing={5}
                          width="100%"
                          sx={{ minWidth: 0 }}
                        >
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            noWrap
                            sx={{ minWidth: 0 }}
                          >
                            {formatTime(session.startedAt)} to{" "}
                            {formatTime(session.completedAt)}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexShrink={0}
                            useFlexGap
                          >
                            <Chip
                              label={`${session.exerciseCount} exercises`}
                              size="small"
                            />
                            <Chip
                              label={`${session.totalSets} sets`}
                              size="small"
                            />
                          </Stack>
                        </Stack>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1.25}>
                        <Paper
                          elevation={0}
                          sx={{
                            borderRadius: "8px",
                            px: 2,
                            py: 1.75,
                            bgcolor: "rgba(139,194,172,0.04)",
                            borderColor: "rgba(139,194,172,0.14)",
                          }}
                        >
                          <form action={saveCompletedWorkoutAsTemplateAction}>
                            <Stack spacing={1.5}>
                              <Typography variant="body1" fontWeight={700}>
                                Save as template
                              </Typography>
                              <input
                                type="hidden"
                                name="sessionId"
                                value={session.id}
                              />
                              <TextField
                                label="Template name"
                                name="name"
                                defaultValue={formatTemplateName(
                                  session.performedOn,
                                )}
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

                        {session.entries.map((entry) => (
                          <Paper
                            key={entry.id}
                            elevation={0}
                            sx={{
                              borderRadius: "8px",
                              px: 2,
                              py: 1.75,
                              bgcolor: "rgba(255,255,255,0.02)",
                            }}
                          >
                            <Stack spacing={1.25}>
                              <Stack spacing={0.5}>
                                <Typography variant="body1" fontWeight={700}>
                                  {entry.exerciseNameSnapshot}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {entry.exerciseCategorySnapshot} ·{" "}
                                  {entry.unitSnapshot === "kg" ? "kg" : "BW"}
                                </Typography>
                              </Stack>

                              <Stack spacing={1}>
                                {entry.sets.map((set) => (
                                  <Paper
                                    key={set.id}
                                    elevation={0}
                                    sx={{
                                      px: 1.5,
                                      py: 1.25,
                                      borderRadius: "6px",
                                      bgcolor: "rgba(255,255,255,0.03)",
                                    }}
                                  >
                                    <Stack
                                      direction="row"
                                      justifyContent="space-between"
                                      spacing={1}
                                      alignItems="center"
                                    >
                                      <Typography
                                        variant="body2"
                                        fontWeight={700}
                                      >
                                        Set {set.setNumber}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {set.reps} reps
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        fontWeight={700}
                                      >
                                        {formatSetWeight(
                                          entry.unitSnapshot,
                                          set.weight,
                                        )}
                                      </Typography>
                                    </Stack>
                                  </Paper>
                                ))}
                              </Stack>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
