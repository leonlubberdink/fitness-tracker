"use client";

import { useState, useTransition } from "react";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import {
  getWorkoutInputHtmlProps,
  getWorkoutInputType,
  selectWorkoutInputValueOnFocus,
  type WorkoutNumericInputProps,
} from "./numeric-input-behavior";

type WorkoutSetEditorFormProps = {
  sessionId: string;
  setId: string;
  setNumber: number;
  initialReps: number;
  initialMetricValue: number;
  metricLabel: string;
  metricInputProps: WorkoutNumericInputProps;
  canDelete: boolean;
  emphasize?: boolean;
  updateSetAction: (formData: FormData) => Promise<void>;
  removeSetAction: (formData: FormData) => Promise<void>;
};

function areValuesChanged(
  initialReps: string,
  initialWeight: string,
  reps: string,
  weight: string,
) {
  return reps !== initialReps || weight !== initialWeight;
}

export function WorkoutSetEditorForm({
  sessionId,
  setId,
  setNumber,
  initialReps,
  initialMetricValue,
  metricLabel,
  metricInputProps,
  canDelete,
  emphasize = false,
  updateSetAction,
  removeSetAction,
}: WorkoutSetEditorFormProps) {
  const initialRepsValue = String(initialReps);
  const initialWeightValue = String(initialMetricValue);
  const [reps, setReps] = useState(initialRepsValue);
  const [weight, setWeight] = useState(initialWeightValue);
  const [isSaving, startSavingTransition] = useTransition();
  const [isDeleting, startDeletingTransition] = useTransition();
  const allowsSignedMetricValue = metricInputProps.inputMode === "decimal";
  const isDirty = areValuesChanged(
    initialRepsValue,
    initialWeightValue,
    reps,
    weight,
  );
  const updateFormId = `update-set-${setId}`;

  async function handleUpdateAction(formData: FormData) {
    startSavingTransition(async () => {
      await updateSetAction(formData);
    });
  }

  async function handleDeleteAction(formData: FormData) {
    startDeletingTransition(async () => {
      await removeSetAction(formData);
    });
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: "8px",
        bgcolor: emphasize
          ? "rgba(139,194,172,0.05)"
          : "rgba(255,255,255,0.03)",
        borderColor: emphasize ? "rgba(139,194,172,0.16)" : undefined,
      }}
    >
      <Stack spacing={1.5}>
        <form id={updateFormId} action={handleUpdateAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="setId" value={setId} />

          <Stack
            direction="row"
            spacing={0}
            alignItems="flex-start"
            sx={{ columnGap: 1.75 }}
          >
            <Chip
              label={`Set ${setNumber}`}
              color={emphasize ? "primary" : "default"}
              variant="outlined"
              sx={{ mt: 1, flexShrink: 0 }}
            />
            <Grid container spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Reps"
                  name="reps"
                  type={getWorkoutInputType()}
                  slotProps={{
                    htmlInput: getWorkoutInputHtmlProps({
                      min: 1,
                      step: 1,
                      inputMode: "numeric",
                    }),
                  }}
                  value={reps}
                  onChange={(event) => setReps(event.target.value)}
                  onFocus={selectWorkoutInputValueOnFocus}
                  required
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label={metricLabel}
                  name="weight"
                  type={getWorkoutInputType()}
                  slotProps={{
                    htmlInput: getWorkoutInputHtmlProps(metricInputProps, {
                      allowSignedValue: allowsSignedMetricValue,
                    }),
                  }}
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  onFocus={selectWorkoutInputValueOnFocus}
                  required
                />
              </Grid>
            </Grid>
          </Stack>
        </form>

        <Stack direction="row" spacing={1}>
          <Button
            type="submit"
            form={updateFormId}
            variant="contained"
            disabled={!isDirty || isSaving}
            loading={isSaving}
            sx={{ flex: 1 }}
          >
            Save set
          </Button>

          {canDelete ? (
            <form action={handleDeleteAction}>
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="setId" value={setId} />
              <Button
                type="submit"
                variant="outlined"
                color="inherit"
                disabled={isDeleting}
                loading={isDeleting}
                sx={{ minWidth: 88 }}
              >
                Delete
              </Button>
            </form>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}
