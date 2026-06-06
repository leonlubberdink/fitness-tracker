"use client";

import { useState } from "react";

import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import HorizontalRuleRounded from "@mui/icons-material/HorizontalRuleRounded";
import SkipNextRounded from "@mui/icons-material/SkipNextRounded";
import TrendingDownRounded from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import {
  getLoadRecommendationLabel,
  type LoadRecommendation,
} from "@/features/workouts/load-recommendations";

type ExerciseCompletionActionsProps = {
  sessionId: string;
  canAdvance: boolean;
  recommendationRequired: boolean;
  initialRecommendation: LoadRecommendation | null;
  advanceWorkoutExerciseAction: (formData: FormData) => Promise<void>;
  completeWorkoutSessionAction: (formData: FormData) => Promise<void>;
};

function RecommendationIcon({
  recommendation,
}: {
  recommendation: LoadRecommendation;
}) {
  switch (recommendation) {
    case "increase":
      return <TrendingUpRounded fontSize="small" />;
    case "keep":
      return <HorizontalRuleRounded fontSize="small" />;
    case "decrease":
      return <TrendingDownRounded fontSize="small" />;
  }
}

export function ExerciseCompletionActions({
  sessionId,
  canAdvance,
  recommendationRequired,
  initialRecommendation,
  advanceWorkoutExerciseAction,
  completeWorkoutSessionAction,
}: ExerciseCompletionActionsProps) {
  const [recommendation, setRecommendation] =
    useState<LoadRecommendation | null>(initialRecommendation);
  const completionDisabled = recommendationRequired && recommendation === null;
  const recommendationValue = recommendation ?? "";

  return (
    <Stack spacing={1.5}>
      {recommendationRequired ? (
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">
            Next-time recommendation
          </Typography>
          <ToggleButtonGroup
            value={recommendation}
            exclusive
            fullWidth
            onChange={(_, nextValue: LoadRecommendation | null) =>
              setRecommendation(nextValue)
            }
            aria-label="Next-time recommendation"
          >
            {(["increase", "keep", "decrease"] as const).map((option) => (
              <ToggleButton
                key={option}
                value={option}
                aria-label={getLoadRecommendationLabel(option)}
                sx={{
                  display: "flex",
                  gap: 0.75,
                  justifyContent: "center",
                  textTransform: "none",
                }}
              >
                <RecommendationIcon recommendation={option} />
                {getLoadRecommendationLabel(option)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary">
            Save what to do with this exercise the next time it comes up.
          </Typography>
        </Stack>
      ) : null}

      <Stack spacing={1}>
        {canAdvance ? (
          <form action={advanceWorkoutExerciseAction}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input
              type="hidden"
              name="nextLoadRecommendation"
              value={recommendationValue}
            />
            <FormStatusButton
              type="submit"
              variant="contained"
              color="secondary"
              startIcon={<SkipNextRounded />}
              loadingLabel="Moving..."
              disabled={completionDisabled}
              fullWidth
            >
              Next exercise
            </FormStatusButton>
          </form>
        ) : null}

        <form action={completeWorkoutSessionAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input
            type="hidden"
            name="nextLoadRecommendation"
            value={recommendationValue}
          />
          <FormStatusButton
            type="submit"
            variant={canAdvance ? "outlined" : "contained"}
            color="primary"
            startIcon={<CheckCircleRounded />}
            loadingLabel="Finishing workout..."
            disabled={completionDisabled}
            fullWidth
          >
            Finish workout
          </FormStatusButton>
        </form>
      </Stack>
    </Stack>
  );
}
