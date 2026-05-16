import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRounded from "@mui/icons-material/RadioButtonUncheckedRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import NextLink from "@/components/app/NextLink";
import {
  getHealthCoachModel,
  isHealthCoachConfigured,
} from "@/features/health-coach/coach";
import { getHealthCoachPageData } from "@/features/health-coach/queries";
import {
  getDailyHealthCheckinActionState,
  getHealthProfileActionState,
} from "@/features/health-coach/state";
import { requireUser } from "@/features/auth/session";
import { formatDateForDisplay } from "@/lib/date";

import { HealthCheckinForm } from "./health-checkin-form";
import { HealthProfileForm } from "./health-profile-form";
import { WeightTrendCard } from "./weight-trend-card";

type HealthCoachPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

function formatFullDate(dateKey: string, timeZone: string) {
  return formatDateForDisplay(dateKey, timeZone, {
    dateStyle: "medium",
  });
}

export default async function HealthCoachPage({
  searchParams,
}: HealthCoachPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const pageData = await getHealthCoachPageData(
    user.id,
    user.timeZone,
    resolvedSearchParams?.date,
  );
  const coachEnabled = isHealthCoachConfigured();
  const profileInitialValues = getHealthProfileActionState({
    sex: pageData.profile?.sex ?? "",
    birthDate: pageData.profile?.birthDate ?? "",
    heightCm:
      pageData.profile?.heightCm === null || pageData.profile?.heightCm === undefined
        ? ""
        : String(pageData.profile.heightCm),
    activityLevel: pageData.profile?.activityLevel ?? "",
    dietPreference: pageData.profile?.dietPreference ?? "",
    allergies: pageData.profile?.allergies ?? "",
    injuriesLimitations: pageData.profile?.injuriesLimitations ?? "",
    goalMode: pageData.profile?.goalMode ?? "",
    targetWeightKg:
      pageData.profile?.targetWeightKg === null ||
      pageData.profile?.targetWeightKg === undefined
        ? ""
        : String(pageData.profile.targetWeightKg),
    paceKgPerMonth:
      pageData.profile?.paceKgPerMonth === null ||
      pageData.profile?.paceKgPerMonth === undefined
        ? ""
        : String(pageData.profile.paceKgPerMonth),
  }).values;
  const checkinInitialValues = getDailyHealthCheckinActionState({
    recordedOn: pageData.selectedDateKey,
    weightKg:
      pageData.selectedCheckin?.weightKg === null ||
      pageData.selectedCheckin?.weightKg === undefined
        ? ""
        : String(pageData.selectedCheckin.weightKg),
    readinessRating: pageData.selectedCheckin
      ? String(pageData.selectedCheckin.readinessRating)
      : "3",
    sorenessPainRating: pageData.selectedCheckin
      ? String(pageData.selectedCheckin.sorenessPainRating)
      : "3",
    note: pageData.selectedCheckin?.note ?? "",
  }).values;

  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ borderRadius: "12px", px: 2.75, py: 3.25 }}>
        <Stack spacing={1.25}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="h1">Health coach setup</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={pageData.readiness.isReady ? "Coach ready" : "Setup needed"}
                color={pageData.readiness.isReady ? "success" : "warning"}
                variant="outlined"
              />
              <Chip
                label={coachEnabled ? getHealthCoachModel() : "API not configured"}
                color={coachEnabled ? "info" : "default"}
                variant="outlined"
              />
            </Stack>
          </Stack>
          <Typography color="text.secondary">
            Save the health context your coach uses for personalized advice. Open
            the live chat from the floating Coach button or below.
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button component={NextLink} href="/health-coach/chat" variant="contained">
              Open chat
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {!coachEnabled ? (
        <Alert severity="warning" variant="filled">
          The AI coach is disabled until <code>OPENAI_API_KEY</code> is configured
          on the server.
        </Alert>
      ) : null}

      {!pageData.hasTodayCheckin ? (
        <Alert severity="info" variant="filled">
          Today&apos;s daily check-in is still missing. Add it below so the
          coach has current recovery and weight data.
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Coach readiness</Typography>
            <Typography color="text.secondary">
              The coach becomes more personalized after the core profile fields
              are set and at least one daily check-in exists.
            </Typography>
          </Stack>

          <Stack spacing={1}>
            {pageData.readiness.isReady ? (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: "8px",
                  px: 2,
                  py: 1.75,
                  bgcolor: "rgba(120,200,161,0.08)",
                  borderColor: "rgba(120,200,161,0.18)",
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <CheckCircleRounded color="success" />
                  <Typography variant="body1" fontWeight={700}>
                    Your Health coach setup is ready.
                  </Typography>
                </Stack>
              </Paper>
            ) : (
              pageData.readiness.missingItems.map((item) => (
                <Paper
                  key={item}
                  elevation={0}
                  sx={{
                    borderRadius: "8px",
                    px: 2,
                    py: 1.5,
                    bgcolor: "rgba(255,255,255,0.02)",
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <RadioButtonUncheckedRounded color="warning" />
                    <Typography variant="body2">{item}</Typography>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>

          {pageData.profile ? (
            <Paper
              elevation={0}
              sx={{
                borderRadius: "8px",
                px: 2,
                py: 1.75,
                bgcolor: "rgba(255,255,255,0.02)",
              }}
            >
              <Stack spacing={0.75}>
                <Typography variant="overline" color="text.secondary">
                  Current profile summary
                </Typography>
                <Typography color="text.secondary">
                  {[
                    pageData.labels.sex,
                    pageData.profile.heightCm
                      ? `${pageData.profile.heightCm} cm`
                      : null,
                    pageData.labels.activityLevel,
                    pageData.labels.goalMode,
                  ]
                    .filter((value): value is string => Boolean(value))
                    .join(" · ") || "Profile still incomplete."}
                </Typography>
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
            <Stack spacing={2.25}>
              <Stack spacing={0.75}>
                <Typography variant="h3">Profile</Typography>
                <Typography color="text.secondary">
                  Save the stable health context the coach will rely on.
                </Typography>
              </Stack>

              <HealthProfileForm initialValues={profileInitialValues} />
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
            <Stack spacing={2.25}>
              <Stack spacing={0.75}>
                <Typography variant="h3">Daily check-in</Typography>
                <Typography color="text.secondary">
                  Editing{" "}
                  {pageData.selectedDateKey === pageData.todayDateKey
                    ? "today"
                    : formatFullDate(pageData.selectedDateKey, user.timeZone)}
                  .
                </Typography>
              </Stack>

              <HealthCheckinForm
                key={`${pageData.selectedDateKey}:${pageData.selectedCheckin?.id ?? "new"}`}
                initialValues={checkinInitialValues}
              />
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <WeightTrendCard
        currentWeightLabel={pageData.weightSummary.currentWeightLabel}
        targetWeightLabel={pageData.weightSummary.targetWeightLabel}
        trendDeltaKg={pageData.weightSummary.trendDeltaKg}
        weightTrend={pageData.weightTrend}
      />

      <Paper elevation={0} sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}>
        <Stack spacing={2.25}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Recent check-ins</Typography>
            <Typography color="text.secondary">
              Open any recorded day to review or update it.
            </Typography>
          </Stack>

          {pageData.recentCheckins.length === 0 ? (
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
                  No check-ins saved yet.
                </Typography>
                <Typography color="text.secondary">
                  Save the first entry above to start building your trend and
                  history.
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <Stack spacing={1.25}>
              {pageData.recentCheckins.map((checkin) => {
                const selected = checkin.recordedOn === pageData.selectedDateKey;

                return (
                  <Paper
                    key={checkin.id}
                    elevation={0}
                    sx={{
                      borderRadius: "8px",
                      px: 2,
                      py: 1.75,
                      bgcolor: selected
                        ? "rgba(139,194,172,0.06)"
                        : "rgba(255,255,255,0.02)",
                      borderColor: selected
                        ? "rgba(139,194,172,0.18)"
                        : undefined,
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                      >
                        <Stack spacing={0.35}>
                          <Typography variant="body1" fontWeight={700}>
                            {formatFullDate(checkin.recordedOn, user.timeZone)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {checkin.weightKg} kg · recovery {checkin.readinessRating}
                            /5 · soreness {checkin.sorenessPainRating}/5
                          </Typography>
                        </Stack>
                        <Button
                          component={NextLink}
                          href={`/health-coach?date=${checkin.recordedOn}`}
                          variant={selected ? "contained" : "outlined"}
                          color={selected ? "primary" : "inherit"}
                        >
                          {selected ? "Editing" : "Open"}
                        </Button>
                      </Stack>

                      {checkin.note ? (
                        <Typography color="text.secondary">{checkin.note}</Typography>
                      ) : null}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}

          {pageData.selectedDateKey !== pageData.todayDateKey ? (
            <Button
              component={NextLink}
              href="/health-coach"
              variant="text"
              color="inherit"
            >
              Back to today
            </Button>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}
