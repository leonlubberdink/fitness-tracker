"use client";

import { useActionState } from "react";

import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import { upsertDailyHealthCheckinAction } from "@/features/health-coach/actions";
import { HEALTH_RATING_OPTIONS } from "@/features/health-coach/constants";
import {
  getDailyHealthCheckinActionState,
  type DailyHealthCheckinActionValues,
} from "@/features/health-coach/state";

type HealthCheckinFormProps = {
  initialValues: DailyHealthCheckinActionValues;
};

export function HealthCheckinForm({
  initialValues,
}: HealthCheckinFormProps) {
  const [state, formAction] = useActionState(
    upsertDailyHealthCheckinAction,
    getDailyHealthCheckinActionState(initialValues),
  );
  const recordedOnError = state.fieldErrors.recordedOn?.[0];
  const weightKgError = state.fieldErrors.weightKg?.[0];
  const readinessRatingError = state.fieldErrors.readinessRating?.[0];
  const sorenessPainRatingError =
    state.fieldErrors.sorenessPainRating?.[0];
  const noteError = state.fieldErrors.note?.[0];

  return (
    <form action={formAction}>
      <Stack spacing={2.5}>
        <TextField
          label="Check-in date"
          name="recordedOn"
          type="date"
          defaultValue={state.values.recordedOn}
          error={Boolean(recordedOnError)}
          helperText={recordedOnError}
          fullWidth
          required
        />

        <TextField
          label="Weight (kg)"
          name="weightKg"
          type="number"
          defaultValue={state.values.weightKg}
          error={Boolean(weightKgError)}
          helperText={weightKgError}
          slotProps={{ htmlInput: { min: 0.1, step: 0.1, inputMode: "decimal" } }}
          fullWidth
          required
        />

        <TextField
          select
          label="Readiness / recovery"
          name="readinessRating"
          defaultValue={state.values.readinessRating}
          error={Boolean(readinessRatingError)}
          helperText={readinessRatingError ?? "1 is poor, 5 is excellent."}
          fullWidth
          required
        >
          {HEALTH_RATING_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Soreness / pain"
          name="sorenessPainRating"
          defaultValue={state.values.sorenessPainRating}
          error={Boolean(sorenessPainRatingError)}
          helperText={
            sorenessPainRatingError ?? "1 is none, 5 is very high."
          }
          fullWidth
          required
        >
          {HEALTH_RATING_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Daily note"
          name="note"
          defaultValue={state.values.note}
          error={Boolean(noteError)}
          helperText={noteError ?? "Optional."}
          multiline
          minRows={3}
          fullWidth
        />

        {state.error ? (
          <Alert severity="error" variant="outlined">
            {state.error}
          </Alert>
        ) : null}

        {state.success ? (
          <Alert severity="success" variant="outlined">
            {state.success}
          </Alert>
        ) : null}

        <FormStatusButton
          type="submit"
          variant="contained"
          loadingLabel="Saving check-in..."
          fullWidth
        >
          Save check-in
        </FormStatusButton>
      </Stack>
    </form>
  );
}
