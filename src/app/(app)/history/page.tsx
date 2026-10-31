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
import {
  formatExerciseMetricValue,
  formatExerciseUnitShort,
  type ExerciseUnit,
} from "@/lib/exercise-units";
import { formatBodyweightExerciseLoad } from "@/features/workouts/bodyweight";
import { formatDateForDisplay, formatInstantForDisplay } from "@/lib/date";

import { HistorySessionDeleteButton } from "./history-session-delete-button";
import { HistoryExport } from "./history-export";

function formatPerformedOn(performedOn: string, timeZone: string) {
  return formatDateForDisplay(performedOn, timeZone, {
    dateStyle: "full",
  });
}

function formatTime(value: Date | null, timeZone: string) {
  if (!value) {
    return "Unknown";
  }

  return formatInstantForDisplay(value, timeZone, {
    timeStyle: "short",
  });
}

function formatSetWeight(
  unit: ExerciseUnit,
  weight: number,
  sessionBodyweightKg: number | null,
) {
  if (unit === "bodyweight" && sessionBodyweightKg !== null) {
    return formatBodyweightExerciseLoad(sessionBodyweightKg, weight);
  }

  return formatExerciseMetricValue(unit, weight);
}

type HistoryPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatTemplateName(performedOn: string, timeZone: string) {
  const date = formatDateForDisplay(performedOn, timeZone, {
    day: "numeric",
    month: "short",
  });

  return `Workout ${date}`;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error?.trim() ?? "";
  const successMessage = resolvedSearchParams?.success?.trim() ?? "";
  const historyGroups = await getCompletedWorkoutHistoryForUser(user.id);
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
          <Typography variant="h1">History</Typography>
          <HistoryExport />
        </Stack>
      </Paper>

      {historyGroups.length === 0 ? (
        <Paper elevation={0} sx={{ borderRadius: "10px", px: 2, py: 2.5 }}>
          <Stack spacing={1.25}>
            <Typography variant="h3">No finished workouts yet.</Typography>
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
        <Stack spacing={2.25}>
          {historyGroups.map((group) => (
            <Stack key={group.performedOn} spacing={1}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ px: 0.5 }}
              >
                {formatPerformedOn(group.performedOn, user.timeZone)}
              </Typography>

              <Stack spacing={1.25}>
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
                          direction={{ xs: "column", md: "row" }}
                          alignItems={{ xs: "flex-start", md: "center" }}
                          justifyContent="flex-start"
                          spacing={1.25}
                          width="100%"
                          sx={{ minWidth: 0 }}
                        >
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            noWrap
                            sx={{ minWidth: 0 }}
                          >
                            {formatTime(session.startedAt, user.timeZone)} to{" "}
                            {formatTime(
                              session.endedAt ?? session.completedAt,
                              user.timeZone,
                            )}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Chip
                              label={session.status ?? "completed"}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={`${session.exerciseCount} exercises`}
                              size="small"
                            />
                            <Chip
                              label={`${session.totalSets} sets`}
                              size="small"
                            />
                            <Chip
                              label={`${session.workingSets} completed working`}
                              size="small"
                              variant="outlined"
                            />
                            {session.warmupSets > 0 ? (
                              <Chip
                                label={`${session.warmupSets} warm-up`}
                                size="small"
                                variant="outlined"
                              />
                            ) : null}
                            {session.unclassifiedSets > 0 ? (
                              <Chip
                                label={`${session.unclassifiedSets} unclassified`}
                                size="small"
                                variant="outlined"
                              />
                            ) : null}
                          </Stack>
                        </Stack>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0.5 }}>
                      <Stack spacing={1.5}>
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
                                  user.timeZone,
                                )}
                                slotProps={{ htmlInput: { maxLength: 80 } }}
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
                                {entry.status === "skipped" ? (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Skipped, prescription retained.
                                  </Typography>
                                ) : null}
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {entry.exerciseCategorySnapshot} ·{" "}
                                  {formatExerciseUnitShort(entry.unitSnapshot)}
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
                                        {set.reps === null
                                          ? "Reps unrecorded"
                                          : `${set.reps} reps`}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        fontWeight={700}
                                      >
                                        {set.weight === null
                                          ? "Load unrecorded"
                                          : formatSetWeight(
                                              entry.unitSnapshot,
                                              set.weight,
                                              session.bodyweightKg,
                                            )}
                                      </Typography>
                                    </Stack>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {set.setType ?? "Type unrecorded"}
                                      {set.rir !== null
                                        ? ` · RIR ${set.rir}`
                                        : ""}
                                      {set.repsBasis
                                        ? ` · reps ${set.repsBasis.replaceAll("_", " ")}`
                                        : ""}
                                    </Typography>
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
