import PendingActionsRounded from "@mui/icons-material/PendingActionsRounded";
import PsychologyRounded from "@mui/icons-material/PsychologyRounded";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import NextLink from "@/components/app/NextLink";
import {
  approveHealthCoachProposalAction,
  rejectHealthCoachProposalAction,
} from "@/features/health-coach/actions";
import {
  formatHealthCoachTimestamp,
  getHealthCoachModel,
  isHealthCoachConfigured,
} from "@/features/health-coach/coach";
import {
  getHealthCoachChatPageData,
  getHealthCoachPageData,
} from "@/features/health-coach/queries";
import { requireUser } from "@/features/auth/session";

import { HealthChatForm } from "./health-chat-form";
import { HealthChatThread } from "./health-chat-thread";

type Citation = {
  endIndex: number;
  startIndex: number;
  title: string | null;
  url: string;
};

type HealthCoachChatViewProps = {
  embedded?: boolean;
  showHeader?: boolean;
};

function getRecentResolvedProposals(
  proposals: Array<{
    appliedAt?: Date | null;
    createdAt: Date;
    errorMessage?: string | null;
    id: string;
    kind: string;
    rejectedAt?: Date | null;
    status: string;
    summary: string;
    title: string;
  }>,
) {
  return proposals
    .filter((proposal) => proposal.status !== "pending")
    .slice(0, 6);
}

function getProposalStatusColor(status: string) {
  switch (status) {
    case "applied":
      return "success";
    case "approved":
      return "info";
    case "failed":
      return "error";
    case "rejected":
      return "default";
    default:
      return "warning";
  }
}

export async function HealthCoachChatView({
  embedded = false,
  showHeader = false,
}: HealthCoachChatViewProps) {
  const user = await requireUser();
  const [pageData, chatPageData] = await Promise.all([
    getHealthCoachPageData(user.id, user.timeZone),
    getHealthCoachChatPageData(user.id),
  ]);
  const coachEnabled = isHealthCoachConfigured();
  const resolvedProposalActivity = getRecentResolvedProposals(
    chatPageData.recentProposals,
  );
  const messages = chatPageData.messages.map((message) => ({
    citations: (message.citations ?? []) as Citation[],
    content: message.content,
    id: message.id,
    role: message.role,
    timestampLabel: formatHealthCoachTimestamp(message.createdAt, user.timeZone),
  }));

  return (
    <Stack
      spacing={3}
      sx={
        embedded
          ? {
              flex: 1,
              minHeight: 0,
            }
          : undefined
      }
    >
      {showHeader ? (
        <Paper elevation={0} sx={{ borderRadius: "12px", px: 2.75, py: 3.25 }}>
          <Stack spacing={1.25}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Typography variant="h1">Health coach chat</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={
                    pageData.readiness.isReady ? "Coach ready" : "Setup needed"
                  }
                  color={pageData.readiness.isReady ? "success" : "warning"}
                  variant="outlined"
                />
                <Chip
                  label={
                    coachEnabled ? getHealthCoachModel() : "API not configured"
                  }
                  color={coachEnabled ? "info" : "default"}
                  variant="outlined"
                />
              </Stack>
            </Stack>
            <Typography color="text.secondary">
              Ask about your training, recovery, nutrition, or weight goal.
              Setup stays in{" "}
              <Link component={NextLink} href="/health-coach" underline="hover">
                Health coach
              </Link>
              .
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      {!coachEnabled ? (
        <Alert severity="warning" variant="filled">
          The AI coach is disabled until <code>OPENAI_API_KEY</code> is
          configured on the server.
        </Alert>
      ) : null}

      {!pageData.readiness.isReady ? (
        <Alert severity="info" variant="outlined">
          Personalized coaching is available now, but it will improve after you
          complete the profile and at least one daily check-in.
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              height: embedded
                ? { xs: "100%", lg: "min(100%, 680px)" }
                : { xs: 640, lg: 720 },
              maxHeight: embedded ? "100%" : undefined,
              minHeight: 0,
              px: 2.25,
              py: 2.5,
            }}
          >
            <Stack spacing={2.25} sx={{ flex: 1, minHeight: 0 }}>
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PsychologyRounded color="primary" />
                  <Typography variant="h3">Chat</Typography>
                </Stack>
                <Typography color="text.secondary">
                  The coach can read your fitness data, use web search for
                  current information, and stage write proposals for your
                  review.
                </Typography>
              </Stack>

              <Divider />
              <HealthChatThread messages={messages} />

              {coachEnabled ? (
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "16px",
                    mt: "auto",
                    px: 1.5,
                    py: 1.5,
                    bgcolor: "rgba(255,255,255,0.03)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <HealthChatForm />
                </Paper>
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}
            >
              <Stack spacing={2}>
                <Stack spacing={0.75}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PendingActionsRounded color="primary" />
                    <Typography variant="h3">Pending review</Typography>
                  </Stack>
                </Stack>

                {chatPageData.pendingProposals.length === 0 ? (
                  <Typography color="text.secondary">
                    No pending proposals right now.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {chatPageData.pendingProposals.map((proposal) => (
                      <Paper
                        key={proposal.id}
                        elevation={0}
                        sx={{
                          borderRadius: "8px",
                          px: 1.75,
                          py: 1.5,
                          bgcolor: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <Stack spacing={1.25}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Typography variant="body1" fontWeight={700}>
                              {proposal.title}
                            </Typography>
                            <Chip
                              label="Pending"
                              color="warning"
                              size="small"
                              variant="outlined"
                            />
                          </Stack>

                          <Typography color="text.secondary">
                            {proposal.summary}
                          </Typography>

                          <Stack spacing={0.75}>
                            {proposal.diff.changes.map((change, index) => (
                              <Stack
                                key={`${proposal.id}:change:${index}`}
                                spacing={0.2}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {change.label}
                                </Typography>
                                <Typography variant="body2">
                                  {change.before ? `${change.before} -> ` : ""}
                                  {change.after ?? "Cleared"}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>

                          {proposal.diff.details &&
                          proposal.diff.details.length > 0 ? (
                            <Stack spacing={0.5}>
                              {proposal.diff.details.map((detail, index) => (
                                <Typography
                                  key={`${proposal.id}:detail:${index}`}
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {detail}
                                </Typography>
                              ))}
                            </Stack>
                          ) : null}

                          <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            flexWrap="wrap"
                          >
                            <form action={approveHealthCoachProposalAction}>
                              <input
                                type="hidden"
                                name="proposalId"
                                value={proposal.id}
                              />
                              <FormStatusButton
                                type="submit"
                                variant="contained"
                                loadingLabel="Applying..."
                              >
                                Approve
                              </FormStatusButton>
                            </form>

                            <form action={rejectHealthCoachProposalAction}>
                              <input
                                type="hidden"
                                name="proposalId"
                                value={proposal.id}
                              />
                              <FormStatusButton
                                type="submit"
                                variant="outlined"
                                color="inherit"
                                loadingLabel="Rejecting..."
                              >
                                Reject
                              </FormStatusButton>
                            </form>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{ borderRadius: "10px", px: 2.25, py: 2.5 }}
            >
              <Stack spacing={1.5}>
                <Typography variant="h3">Recent proposal activity</Typography>

                {resolvedProposalActivity.length === 0 ? (
                  <Typography color="text.secondary">
                    No approved, rejected, or failed proposals yet.
                  </Typography>
                ) : (
                  resolvedProposalActivity.map((proposal) => (
                    <Paper
                      key={proposal.id}
                      elevation={0}
                      sx={{
                        borderRadius: "8px",
                        px: 1.75,
                        py: 1.5,
                        bgcolor: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="body2" fontWeight={700}>
                            {proposal.title}
                          </Typography>
                          <Chip
                            label={proposal.status}
                            color={getProposalStatusColor(proposal.status)}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {proposal.summary}
                        </Typography>
                        {proposal.errorMessage ? (
                          <Typography variant="caption" color="error.main">
                            {proposal.errorMessage}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
