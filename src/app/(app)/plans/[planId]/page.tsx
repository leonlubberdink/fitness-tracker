import ArchiveRounded from "@mui/icons-material/ArchiveRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EastRounded from "@mui/icons-material/EastRounded";
import FileCopyRounded from "@mui/icons-material/FileCopyRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import SkipNextRounded from "@mui/icons-material/SkipNextRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import NextLink from "@/components/app/NextLink";
import { requireUser } from "@/features/auth/session";
import {
  archivePlanAction,
  deletePlanAction,
  duplicatePlanAction,
  removePlanWorkoutAction,
  skipPlanWorkoutAction,
  startPlanAction,
  startPlannedWorkoutAction,
  unskipPlanWorkoutAction,
  updatePlanDetailsAction,
  upsertPlanWorkoutAction,
} from "@/features/plans/actions";
import { requirePlanByIdForUser } from "@/features/plans/queries";
import {
  PLAN_STATUS_LABELS,
  PLAN_WEEKDAY_OPTIONS,
} from "@/features/plans/utils";
import { getTodayDateKey } from "@/lib/date";

type PlanDetailPageProps = {
  params: Promise<{
    planId: string;
  }>;
  searchParams?: Promise<{
    conflictPlanWorkoutId?: string;
    error?: string;
    resumeSessionId?: string;
    success?: string;
  }>;
};

function getStatusChipColor(status: keyof typeof PLAN_STATUS_LABELS) {
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

function getWorkoutStateChipColor(state: string) {
  if (state === "completed") {
    return "success" as const;
  }

  if (state === "today") {
    return "secondary" as const;
  }

  if (state === "missed") {
    return "error" as const;
  }

  if (state === "skipped") {
    return "warning" as const;
  }

  return "default" as const;
}

function getWorkoutStateLabel(state: string) {
  if (state === "today") {
    return "Today";
  }

  if (state === "upcoming") {
    return "Upcoming";
  }

  if (state === "missed") {
    return "Missed";
  }

  return state[0].toUpperCase() + state.slice(1);
}

export default async function PlanDetailPage({
  params,
  searchParams,
}: PlanDetailPageProps) {
  const user = await requireUser();
  const { planId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error?.trim() ?? "";
  const successMessage = resolvedSearchParams?.success?.trim() ?? "";
  const resumeSessionId = resolvedSearchParams?.resumeSessionId?.trim() ?? "";
  const conflictPlanWorkoutId =
    resolvedSearchParams?.conflictPlanWorkoutId?.trim() ?? "";
  const plan = await requirePlanByIdForUser(user.id, planId, user.timeZone);
  const todayDateKey = getTodayDateKey(plan.timeZone);

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

      {resumeSessionId && conflictPlanWorkoutId ? (
        <Alert
          severity="warning"
          variant="filled"
          action={
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                component={NextLink}
                href={`/workouts/${resumeSessionId}`}
                color="inherit"
                size="small"
                variant="outlined"
              >
                Resume current workout
              </Button>
              <Button
                component={NextLink}
                href={`/plans/${plan.id}`}
                color="inherit"
                size="small"
                variant="text"
              >
                Keep this plan day for later
              </Button>
            </Stack>
          }
        >
          Another workout is already open. Resume that session or leave this plan
          day untouched for now.
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ borderRadius: "12px", px: 2.75, py: 3.25 }}>
        <Stack spacing={2.25}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Stack spacing={0.85}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
              >
                <Typography variant="h1">{plan.name}</Typography>
                <Chip
                  label={PLAN_STATUS_LABELS[plan.status]}
                  color={getStatusChipColor(plan.status)}
                  variant="outlined"
                  size="small"
                />
              </Stack>
              <Typography color="text.secondary">{plan.goal}</Typography>
              {plan.startDateLabel ? (
                <Typography variant="caption" color="text.secondary">
                  Started from {plan.startDateLabel}
                </Typography>
              ) : null}
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <form action={duplicatePlanAction}>
                <input type="hidden" name="planId" value={plan.id} />
                <FormStatusButton
                  type="submit"
                  variant="outlined"
                  startIcon={<FileCopyRounded />}
                  loadingLabel="Duplicating..."
                >
                  Duplicate
                </FormStatusButton>
              </form>

              {plan.status === "draft" ? (
                <form action={deletePlanAction}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <FormStatusButton
                    type="submit"
                    variant="text"
                    color="inherit"
                    startIcon={<DeleteOutlineRounded />}
                    loadingLabel="Deleting..."
                  >
                    Delete draft
                  </FormStatusButton>
                </form>
              ) : null}

              {(plan.status === "active" || plan.status === "completed") ? (
                <form action={archivePlanAction}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <FormStatusButton
                    type="submit"
                    variant="text"
                    color="inherit"
                    startIcon={<ArchiveRounded />}
                    loadingLabel="Archiving..."
                  >
                    Archive
                  </FormStatusButton>
                </form>
              ) : null}
            </Stack>
          </Stack>

          <Grid container spacing={1.25}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: "8px",
                  px: 1.75,
                  py: 1.5,
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                <Stack spacing={0.35}>
                  <Typography variant="overline" color="text.secondary">
                    Weeks
                  </Typography>
                  <Typography variant="h3">{plan.durationWeeks}</Typography>
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
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                <Stack spacing={0.35}>
                  <Typography variant="overline" color="text.secondary">
                    Workouts
                  </Typography>
                  <Typography variant="h3">{plan.totalWorkouts}</Typography>
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
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                <Stack spacing={0.35}>
                  <Typography variant="overline" color="text.secondary">
                    Resolved
                  </Typography>
                  <Typography variant="h3">
                    {plan.progress.resolved}/{plan.progress.total}
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
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                <Stack spacing={0.35}>
                  <Typography variant="overline" color="text.secondary">
                    Current week
                  </Typography>
                  <Typography variant="h3">{plan.currentWeekNumber}</Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {plan.todayWorkout ? (
            <Paper
              elevation={0}
              sx={{
                borderRadius: "8px",
                px: 2,
                py: 1.75,
                bgcolor: "rgba(152, 168, 216, 0.07)",
                borderColor: "rgba(152, 168, 216, 0.16)",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack spacing={0.4}>
                  <Typography variant="overline" color="secondary.light">
                    Today
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {plan.todayWorkout.templateName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {plan.todayWorkout.weekdayLabel} ·{" "}
                    {getWorkoutStateLabel(plan.todayWorkout.effectiveState)}
                  </Typography>
                </Stack>

                {plan.todayWorkout.canStart ? (
                  <form action={startPlannedWorkoutAction}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <input
                      type="hidden"
                      name="planWorkoutId"
                      value={plan.todayWorkout.id}
                    />
                    <FormStatusButton
                      type="submit"
                      variant="contained"
                      color="secondary"
                      startIcon={<PlayArrowRounded />}
                      loadingLabel="Starting..."
                    >
                      Start today&apos;s workout
                    </FormStatusButton>
                  </form>
                ) : null}
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Paper>

      {(plan.status === "draft" || plan.status === "active") ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
              <form action={updatePlanDetailsAction}>
                <Stack spacing={1.75}>
                  <Typography variant="h3">Plan details</Typography>
                  <input type="hidden" name="planId" value={plan.id} />
                  <TextField
                    label="Plan name"
                    name="name"
                    defaultValue={plan.name}
                    slotProps={{ htmlInput: { maxLength: 80 } }}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Goal"
                    name="goal"
                    defaultValue={plan.goal}
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
                    defaultValue={plan.durationWeeks}
                    slotProps={{ htmlInput: { min: 1, max: 52 } }}
                    required
                    fullWidth
                  />
                  <FormStatusButton
                    type="submit"
                    variant="outlined"
                    loadingLabel="Saving..."
                    fullWidth
                  >
                    Save details
                  </FormStatusButton>
                </Stack>
              </form>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            {plan.status === "draft" ? (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: "10px",
                  px: 2.25,
                  py: 2.5,
                  bgcolor: "rgba(139,194,172,0.05)",
                  borderColor: "rgba(139,194,172,0.14)",
                }}
              >
                <form action={startPlanAction}>
                  <Stack spacing={1.75}>
                    <Typography variant="h3">Start this plan</Typography>
                    <Typography color="text.secondary">
                      Pick the calendar date that anchors week one. Earlier days
                      in that first week will be omitted automatically.
                    </Typography>
                    <input type="hidden" name="planId" value={plan.id} />
                    <TextField
                      label="Start date"
                      name="startDate"
                      type="date"
                      defaultValue={todayDateKey}
                      required
                      fullWidth
                    />
                    <FormStatusButton
                      type="submit"
                      variant="contained"
                      startIcon={<PlayArrowRounded />}
                      loadingLabel="Starting..."
                      fullWidth
                    >
                      Start plan
                    </FormStatusButton>
                  </Stack>
                </form>
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: "10px",
                  px: 2.25,
                  py: 2.5,
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                <Stack spacing={1}>
                  <Typography variant="h3">Active block</Typography>
                  <Typography color="text.secondary">
                    Future days stay editable. Past completed, skipped, and
                    missed slots are locked in place.
                  </Typography>
                </Stack>
              </Paper>
            )}
          </Grid>
        </Grid>
      ) : null}

      {plan.weeks.map((week) => (
        <Paper
          key={week.weekNumber}
          elevation={0}
          sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}
        >
          <Stack spacing={1.75}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={0.35}>
                <Typography variant="h3">Week {week.weekNumber}</Typography>
                <Typography color="text.secondary">
                  {week.resolvedCount}/{week.totalCount} resolved
                </Typography>
              </Stack>
              {plan.status === "active" && week.weekNumber === plan.currentWeekNumber ? (
                <Chip label="Current week" color="secondary" variant="outlined" size="small" />
              ) : null}
            </Stack>

            {week.workouts.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: "8px",
                  px: 2,
                  py: 2,
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                <Typography color="text.secondary">
                  No workouts scheduled in this week.
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={1.25}>
                {week.workouts.map((workout) => (
                  <Paper
                    key={workout.id}
                    elevation={0}
                    sx={{
                      borderRadius: "8px",
                      px: 2,
                      py: 1.75,
                      bgcolor:
                        workout.effectiveState === "today"
                          ? "rgba(152, 168, 216, 0.05)"
                          : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", md: "center" }}
                        justifyContent="space-between"
                      >
                        <Stack spacing={0.35}>
                          <Typography variant="body1" fontWeight={700}>
                            {workout.templateName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {workout.weekdayLabel}
                            {workout.displayDateLabel
                              ? ` · ${workout.displayDateLabel}`
                              : ""}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            label={getWorkoutStateLabel(workout.effectiveState)}
                            color={getWorkoutStateChipColor(workout.effectiveState)}
                            variant="outlined"
                            size="small"
                          />
                          {workout.completedAt ? (
                            <Chip
                              label="Logged"
                              color="success"
                              variant="outlined"
                              size="small"
                            />
                          ) : null}
                        </Stack>
                      </Stack>

                      {workout.canEdit && plan.templateOptions.length > 0 ? (
                        <Stack spacing={1.25}>
                          <form action={upsertPlanWorkoutAction}>
                            <Stack spacing={1.25}>
                              <input type="hidden" name="planId" value={plan.id} />
                              <input
                                type="hidden"
                                name="existingPlanWorkoutId"
                                value={workout.id}
                              />
                              <Grid container spacing={1.25}>
                                <Grid size={{ xs: 12, md: 3 }}>
                                  <TextField
                                    select
                                    label="Week"
                                    name="weekNumber"
                                    defaultValue={String(workout.weekNumber)}
                                    fullWidth
                                  >
                                    {Array.from(
                                      { length: plan.durationWeeks },
                                      (_, index) => index + 1,
                                    ).map((weekNumber) => (
                                      <MenuItem key={weekNumber} value={String(weekNumber)}>
                                        Week {weekNumber}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                  <TextField
                                    select
                                    label="Day"
                                    name="weekday"
                                    defaultValue={String(workout.weekday)}
                                    fullWidth
                                  >
                                    {PLAN_WEEKDAY_OPTIONS.map((option) => (
                                      <MenuItem key={option.value} value={String(option.value)}>
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <TextField
                                    select
                                    label="Template"
                                    name="workoutTemplateId"
                                    defaultValue={workout.workoutTemplateId}
                                    fullWidth
                                  >
                                    {plan.templateOptions.map((template) => (
                                      <MenuItem key={template.id} value={template.id}>
                                        {template.name}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                </Grid>
                              </Grid>
                              <FormStatusButton
                                type="submit"
                                variant="outlined"
                                loadingLabel="Saving..."
                                fullWidth
                              >
                                Save workout
                              </FormStatusButton>
                            </Stack>
                          </form>

                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            {plan.status === "active" &&
                            workout.persistedState === "planned" ? (
                              <form action={skipPlanWorkoutAction} style={{ flex: 1 }}>
                                <input type="hidden" name="planId" value={plan.id} />
                                <input
                                  type="hidden"
                                  name="planWorkoutId"
                                  value={workout.id}
                                />
                                <FormStatusButton
                                  type="submit"
                                  variant="outlined"
                                  color="warning"
                                  startIcon={<SkipNextRounded />}
                                  loadingLabel="Skipping..."
                                  fullWidth
                                >
                                  Skip
                                </FormStatusButton>
                              </form>
                            ) : null}

                            {plan.status === "active" &&
                            workout.persistedState === "skipped" ? (
                              <form action={unskipPlanWorkoutAction} style={{ flex: 1 }}>
                                <input type="hidden" name="planId" value={plan.id} />
                                <input
                                  type="hidden"
                                  name="planWorkoutId"
                                  value={workout.id}
                                />
                                <FormStatusButton
                                  type="submit"
                                  variant="outlined"
                                  startIcon={<ReplayRounded />}
                                  loadingLabel="Restoring..."
                                  fullWidth
                                >
                                  Restore
                                </FormStatusButton>
                              </form>
                            ) : null}

                            {workout.canStart ? (
                              <form action={startPlannedWorkoutAction} style={{ flex: 1 }}>
                                <input type="hidden" name="planId" value={plan.id} />
                                <input
                                  type="hidden"
                                  name="planWorkoutId"
                                  value={workout.id}
                                />
                                <FormStatusButton
                                  type="submit"
                                  variant="contained"
                                  color="secondary"
                                  startIcon={<PlayArrowRounded />}
                                  loadingLabel="Starting..."
                                  fullWidth
                                >
                                  Start
                                </FormStatusButton>
                              </form>
                            ) : null}

                            <form action={removePlanWorkoutAction} style={{ flex: 1 }}>
                              <input type="hidden" name="planId" value={plan.id} />
                              <input
                                type="hidden"
                                name="planWorkoutId"
                                value={workout.id}
                              />
                              <FormStatusButton
                                type="submit"
                                variant="text"
                                color="inherit"
                                startIcon={<DeleteOutlineRounded />}
                                loadingLabel="Removing..."
                                fullWidth
                              >
                                Remove
                              </FormStatusButton>
                            </form>
                          </Stack>
                        </Stack>
                      ) : (
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          alignItems={{ xs: "stretch", sm: "center" }}
                        >
                          {workout.canStart ? (
                            <form action={startPlannedWorkoutAction}>
                              <input type="hidden" name="planId" value={plan.id} />
                              <input
                                type="hidden"
                                name="planWorkoutId"
                                value={workout.id}
                              />
                              <FormStatusButton
                                type="submit"
                                variant="contained"
                                color="secondary"
                                startIcon={<PlayArrowRounded />}
                                loadingLabel="Starting..."
                                fullWidth
                              >
                                Start scheduled workout
                              </FormStatusButton>
                            </form>
                          ) : null}

                          {plan.status === "active" &&
                          workout.persistedState === "skipped" &&
                          workout.scheduledDate &&
                          workout.scheduledDate >= todayDateKey ? (
                            <form action={unskipPlanWorkoutAction}>
                              <input type="hidden" name="planId" value={plan.id} />
                              <input
                                type="hidden"
                                name="planWorkoutId"
                                value={workout.id}
                              />
                              <FormStatusButton
                                type="submit"
                                variant="outlined"
                                startIcon={<ReplayRounded />}
                                loadingLabel="Restoring..."
                                fullWidth
                              >
                                Restore this day
                              </FormStatusButton>
                            </form>
                          ) : null}
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            {(plan.status === "draft" || plan.status === "active") &&
            plan.templateOptions.length > 0 ? (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: "8px",
                  px: 2,
                  py: 2,
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                <form action={upsertPlanWorkoutAction}>
                  <Stack spacing={1.25}>
                    <Stack spacing={0.35}>
                      <Typography variant="body1" fontWeight={700}>
                        Add workout to week {week.weekNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Rest days stay implicit, so only add the days that need a
                        template.
                      </Typography>
                    </Stack>
                    <input type="hidden" name="planId" value={plan.id} />
                    <input
                      type="hidden"
                      name="weekNumber"
                      value={String(week.weekNumber)}
                    />
                    <Grid container spacing={1.25}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          select
                          label="Day"
                          name="weekday"
                          defaultValue="1"
                          fullWidth
                        >
                          {PLAN_WEEKDAY_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={String(option.value)}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 8 }}>
                        <TextField
                          select
                          label="Template"
                          name="workoutTemplateId"
                          defaultValue={plan.templateOptions[0]?.id ?? ""}
                          fullWidth
                        >
                          {plan.templateOptions.map((template) => (
                            <MenuItem key={template.id} value={template.id}>
                              {template.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                    <FormStatusButton
                      type="submit"
                      variant="outlined"
                      loadingLabel="Adding..."
                      fullWidth
                    >
                      Add planned workout
                    </FormStatusButton>
                  </Stack>
                </form>
              </Paper>
            ) : null}
          </Stack>
        </Paper>
      ))}

      {plan.templateOptions.length === 0 &&
      (plan.status === "draft" || plan.status === "active") ? (
        <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
          <Stack spacing={1.25}>
            <Typography variant="h3">No workout templates yet</Typography>
            <Typography color="text.secondary">
              Plans are built from saved workout templates. Create one first, then
              come back here to assign it to a day.
            </Typography>
            <Button
              component={NextLink}
              href="/workouts"
              variant="contained"
              endIcon={<EastRounded />}
            >
              Open workouts
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
