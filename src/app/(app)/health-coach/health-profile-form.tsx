"use client";

import { useActionState, useState } from "react";

import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import { upsertHealthProfileAction } from "@/features/health-coach/actions";
import {
  HEALTH_ACTIVITY_LEVEL_OPTIONS,
  HEALTH_GOAL_MODE_OPTIONS,
  HEALTH_SEX_OPTIONS,
} from "@/features/health-coach/constants";
import {
  getHealthProfileActionState,
  type HealthProfileActionValues,
} from "@/features/health-coach/state";

type HealthProfileFormProps = {
  initialValues: HealthProfileActionValues;
};

export function HealthProfileForm({
  initialValues,
}: HealthProfileFormProps) {
  const [state, formAction] = useActionState(
    upsertHealthProfileAction,
    getHealthProfileActionState(initialValues),
  );
  const [goalMode, setGoalMode] = useState(initialValues.goalMode);
  const sexError = state.fieldErrors.sex?.[0];
  const birthDateError = state.fieldErrors.birthDate?.[0];
  const heightCmError = state.fieldErrors.heightCm?.[0];
  const activityLevelError = state.fieldErrors.activityLevel?.[0];
  const dietPreferenceError = state.fieldErrors.dietPreference?.[0];
  const allergiesError = state.fieldErrors.allergies?.[0];
  const injuriesLimitationsError = state.fieldErrors.injuriesLimitations?.[0];
  const goalModeError = state.fieldErrors.goalMode?.[0];
  const targetWeightKgError = state.fieldErrors.targetWeightKg?.[0];
  const paceKgPerMonthError = state.fieldErrors.paceKgPerMonth?.[0];
  const paceDisabled = goalMode === "maintain" || goalMode === "";

  return (
    <form action={formAction}>
      <Stack spacing={2.5}>
        <TextField
          select
          label="Biological sex"
          name="sex"
          defaultValue={state.values.sex}
          error={Boolean(sexError)}
          helperText={sexError}
          fullWidth
          required
        >
          <MenuItem value="" disabled>
            Choose a value
          </MenuItem>
          {HEALTH_SEX_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Birth date"
          name="birthDate"
          type="date"
          defaultValue={state.values.birthDate}
          error={Boolean(birthDateError)}
          helperText={birthDateError}
          fullWidth
          required
        />

        <TextField
          label="Height (cm)"
          name="heightCm"
          type="number"
          defaultValue={state.values.heightCm}
          error={Boolean(heightCmError)}
          helperText={heightCmError}
          slotProps={{ htmlInput: { min: 1, step: 1, inputMode: "numeric" } }}
          fullWidth
          required
        />

        <TextField
          select
          label="Activity level"
          name="activityLevel"
          defaultValue={state.values.activityLevel}
          error={Boolean(activityLevelError)}
          helperText={activityLevelError ?? "Optional."}
          fullWidth
        >
          <MenuItem value="">Not set</MenuItem>
          {HEALTH_ACTIVITY_LEVEL_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Diet preference"
          name="dietPreference"
          defaultValue={state.values.dietPreference}
          error={Boolean(dietPreferenceError)}
          helperText={dietPreferenceError ?? "Optional."}
          placeholder="Mediterranean, vegetarian, dairy-free..."
          fullWidth
        />

        <TextField
          label="Allergies"
          name="allergies"
          defaultValue={state.values.allergies}
          error={Boolean(allergiesError)}
          helperText={allergiesError ?? "Optional."}
          multiline
          minRows={2}
          fullWidth
        />

        <TextField
          label="Injuries or limitations"
          name="injuriesLimitations"
          defaultValue={state.values.injuriesLimitations}
          error={Boolean(injuriesLimitationsError)}
          helperText={injuriesLimitationsError ?? "Optional."}
          multiline
          minRows={3}
          fullWidth
        />

        <TextField
          select
          label="Goal mode"
          name="goalMode"
          value={goalMode}
          onChange={(event) =>
            setGoalMode(event.target.value as HealthProfileActionValues["goalMode"])
          }
          error={Boolean(goalModeError)}
          helperText={goalModeError}
          fullWidth
          required
        >
          <MenuItem value="" disabled>
            Choose a goal
          </MenuItem>
          {HEALTH_GOAL_MODE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Target weight (kg)"
          name="targetWeightKg"
          type="number"
          defaultValue={state.values.targetWeightKg}
          error={Boolean(targetWeightKgError)}
          helperText={targetWeightKgError}
          slotProps={{ htmlInput: { min: 0.1, step: 0.1, inputMode: "decimal" } }}
          fullWidth
          required
        />

        <TextField
          label="Preferred pace (kg/month)"
          name="paceKgPerMonth"
          type="number"
          defaultValue={state.values.paceKgPerMonth}
          error={Boolean(paceKgPerMonthError)}
          helperText={
            paceKgPerMonthError ??
            (paceDisabled
              ? "Not needed for maintain mode."
              : "Required for lose or gain mode.")
          }
          slotProps={{ htmlInput: { min: 0.1, step: 0.1, inputMode: "decimal" } }}
          disabled={paceDisabled}
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
          loadingLabel="Saving profile..."
          fullWidth
        >
          Save profile
        </FormStatusButton>
      </Stack>
    </form>
  );
}
