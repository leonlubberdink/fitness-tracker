import AddRounded from "@mui/icons-material/AddRounded";
import ArchiveRounded from "@mui/icons-material/ArchiveRounded";
import EastRounded from "@mui/icons-material/EastRounded";
import EventNoteRounded from "@mui/icons-material/EventNoteRounded";
import FileCopyRounded from "@mui/icons-material/FileCopyRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import {
  archivePlanAction,
  createPlanAction,
  duplicatePlanAction,
} from "@/features/plans/actions";
import { getPlansPageData } from "@/features/plans/queries";
import { PLAN_STATUS_LABELS } from "@/features/plans/utils";
import { requireUser } from "@/features/auth/session";
import { FormStatusButton } from "@/components/app/FormStatusButtons";
import NextLink from "@/components/app/NextLink";
import { formatInstantForDisplay } from "@/lib/date";

type PlansPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function getPlanStatusColor(status: keyof typeof PLAN_STATUS_LABELS) {
  if (status === "active") {
    return "secondary" as const;
  }

  if (status === "completed") {
    return "success" as const;
  }

  if (status === "archived") {
    return "default" as const;
  }

  return "primary" as const;
}

function formatUpdatedAt(updatedAt: Date, timeZone: string) {
  return formatInstantForDisplay(updatedAt, timeZone, {
    dateStyle: "medium",
  });
}

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error?.trim() ?? "";
  const successMessage = resolvedSearchParams?.success?.trim() ?? "";
  const { activePlan, draftPlans, pastPlans } = await getPlansPageData(
    user.id,
    user.timeZone,
  );

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
        <Stack spacing={1.25}>
          <Typography variant="h1">Plans</Typography>
          <Typography color="text.secondary">
            Build a structured block, keep the next workout visible, and let the
            logger handle the session itself.
          </Typography>
        </Stack>
      </Paper>

      {activePlan ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: "12px",
            px: 2.5,
            py: 2.75,
            bgcolor: "rgba(152, 168, 216, 0.06)",
            borderColor: "rgba(152, 168, 216, 0.16)",
          }}
        >
          <Stack spacing={2.25}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={0.75}>
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  alignItems="center"
                >
                  <Typography variant="h2">{activePlan.name}</Typography>
                  <Chip
                    label={PLAN_STATUS_LABELS[activePlan.status]}
                    color={getPlanStatusColor(activePlan.status)}
                    variant="outlined"
                    size="small"
                  />
                </Stack>
                <Typography color="text.secondary">{activePlan.goal}</Typography>
              </Stack>

              <Button
                component={NextLink}
                href={`/plans/${activePlan.id}`}
                variant="contained"
                color="secondary"
                endIcon={<EastRounded />}
              >
                Open active plan
              </Button>
            </Stack>

            <Grid container spacing={1.25}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "8px",
                    px: 1.75,
                    py: 1.5,
                    bgcolor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Stack spacing={0.35}>
                    <Typography variant="overline" color="text.secondary">
                      Current week
                    </Typography>
                    <Typography variant="h3">{activePlan.currentWeekNumber}</Typography>
                  </Stack>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "8px",
                    px: 1.75,
                    py: 1.5,
                    bgcolor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Stack spacing={0.35}>
                    <Typography variant="overline" color="text.secondary">
                      Resolved
                    </Typography>
                    <Typography variant="h3">
                      {activePlan.progress.resolved}/{activePlan.progress.total}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "8px",
                    px: 1.75,
                    py: 1.5,
                    bgcolor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Stack spacing={0.35}>
                    <Typography variant="overline" color="text.secondary">
                      Completed
                    </Typography>
                    <Typography variant="h3">{activePlan.progress.completed}</Typography>
                  </Stack>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "8px",
                    px: 1.75,
                    py: 1.5,
                    bgcolor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Stack spacing={0.35}>
                    <Typography variant="overline" color="text.secondary">
                      Remaining
                    </Typography>
                    <Typography variant="h3">{activePlan.progress.remaining}</Typography>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            <Paper
              elevation={0}
              sx={{
                borderRadius: "8px",
                px: 2,
                py: 1.75,
                bgcolor: "rgba(255,255,255,0.03)",
              }}
            >
              <Stack spacing={0.5}>
                <Typography variant="body1" fontWeight={700}>
                  {activePlan.todayWorkout
                    ? `Today · ${activePlan.todayWorkout.templateName}`
                    : activePlan.nextWorkout
                      ? `Next · ${activePlan.nextWorkout.templateName}`
                      : "No scheduled workouts remain in this plan."}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activePlan.todayWorkout
                    ? "Today is live. Open the plan to start or manage the scheduled workout."
                    : activePlan.nextWorkout?.displayDateLabel
                      ? `Next scheduled day: ${activePlan.nextWorkout.displayDateLabel}.`
                      : "This block is waiting on no future plan days."}
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Paper>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
            <form action={createPlanAction}>
              <Stack spacing={2}>
                <Stack spacing={0.75}>
                  <Typography variant="h3">Create plan</Typography>
                  <Typography color="text.secondary">
                    Start with the basics, then assign workout templates week by
                    week.
                  </Typography>
                </Stack>

                <TextField
                  label="Plan name"
                  name="name"
                  placeholder="12-week base block"
                  slotProps={{ htmlInput: { maxLength: 80 } }}
                  required
                  fullWidth
                />
                <TextField
                  label="Goal"
                  name="goal"
                  placeholder="Build consistency and keep three full-body sessions per week."
                  slotProps={{ htmlInput: { maxLength: 160 } }}
                  multiline
                  minRows={3}
                  required
                  fullWidth
                />
                <TextField
                  label="Weeks"
                  name="durationWeeks"
                  type="number"
                  defaultValue={12}
                  slotProps={{ htmlInput: { min: 1, max: 52 } }}
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
                  Create draft
                </FormStatusButton>
              </Stack>
            </form>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2}>
            <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
              <Stack spacing={1.5}>
                <Typography variant="h3">Drafts</Typography>
                {draftPlans.length === 0 ? (
                  <Typography color="text.secondary">
                    No draft plans yet.
                  </Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {draftPlans.map((plan) => (
                      <Paper
                        key={plan.id}
                        elevation={0}
                        sx={{
                          borderRadius: "8px",
                          px: 2,
                          py: 1.75,
                          bgcolor: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <Stack spacing={1.25}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Typography variant="body1" fontWeight={700}>
                              {plan.name}
                            </Typography>
                            <Chip
                              label={`${plan.totalWorkouts} workouts`}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                          <Typography color="text.secondary">{plan.goal}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Updated {formatUpdatedAt(plan.updatedAt, user.timeZone)}
                          </Typography>
                          <Button
                            component={NextLink}
                            href={`/plans/${plan.id}`}
                            variant="outlined"
                            endIcon={<EastRounded />}
                            fullWidth
                          >
                            Open draft
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
              <Stack spacing={1.5}>
                <Typography variant="h3">Past plans</Typography>
                {pastPlans.length === 0 ? (
                  <Typography color="text.secondary">
                    Completed and archived plans will collect here.
                  </Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {pastPlans.map((plan) => (
                      <Paper
                        key={plan.id}
                        elevation={0}
                        sx={{
                          borderRadius: "8px",
                          px: 2,
                          py: 1.75,
                          bgcolor: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <Stack spacing={1.25}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Stack spacing={0.4}>
                              <Typography variant="body1" fontWeight={700}>
                                {plan.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {PLAN_STATUS_LABELS[plan.status]} · Updated{" "}
                                {formatUpdatedAt(plan.updatedAt, user.timeZone)}
                              </Typography>
                            </Stack>
                            <Chip
                              label={PLAN_STATUS_LABELS[plan.status]}
                              color={getPlanStatusColor(plan.status)}
                              variant="outlined"
                              size="small"
                            />
                          </Stack>

                          <Typography color="text.secondary">{plan.goal}</Typography>

                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                          >
                            <Button
                              component={NextLink}
                              href={`/plans/${plan.id}`}
                              variant="outlined"
                              startIcon={<EventNoteRounded />}
                              fullWidth
                            >
                              View plan
                            </Button>
                            <form action={duplicatePlanAction} style={{ flex: 1 }}>
                              <input type="hidden" name="planId" value={plan.id} />
                              <FormStatusButton
                                type="submit"
                                variant="outlined"
                                startIcon={<FileCopyRounded />}
                                loadingLabel="Duplicating..."
                                fullWidth
                              >
                                Duplicate
                              </FormStatusButton>
                            </form>
                            {plan.status === "completed" ? (
                              <form action={archivePlanAction} style={{ flex: 1 }}>
                                <input type="hidden" name="planId" value={plan.id} />
                                <FormStatusButton
                                  type="submit"
                                  variant="text"
                                  color="inherit"
                                  startIcon={<ArchiveRounded />}
                                  loadingLabel="Archiving..."
                                  fullWidth
                                >
                                  Archive
                                </FormStatusButton>
                              </form>
                            ) : null}
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
