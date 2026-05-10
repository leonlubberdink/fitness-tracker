"use client";

import { useState } from "react";

import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import { FormStatusButton } from "@/components/app/FormStatusButtons";

type WorkoutSetEditorFormProps = {
  sessionId: string;
  setId: string;
  setNumber: number;
  initialReps: number;
  initialWeight: number;
  weightLabel: string;
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
  initialWeight,
  weightLabel,
  canDelete,
  emphasize = false,
  updateSetAction,
  removeSetAction,
}: WorkoutSetEditorFormProps) {
  const initialRepsValue = String(initialReps);
  const initialWeightValue = String(initialWeight);
  const [reps, setReps] = useState(initialRepsValue);
  const [weight, setWeight] = useState(initialWeightValue);
  const isDirty = areValuesChanged(
    initialRepsValue,
    initialWeightValue,
    reps,
    weight,
  );

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
      <form action={updateSetAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="setId" value={setId} />

        <Stack spacing={1.5}>
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
                  type="number"
                  inputProps={{ min: 1, step: 1, inputMode: "numeric" }}
                  value={reps}
                  onChange={(event) => setReps(event.target.value)}
                  required
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label={weightLabel}
                  name="weight"
                  type="number"
                  inputProps={{ min: 0, step: 0.5, inputMode: "decimal" }}
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  required
                />
              </Grid>
            </Grid>
          </Stack>

          <Stack direction="row" spacing={1}>
            <FormStatusButton
              type="submit"
              name="intent"
              value="save-set"
              pendingMatch={{ name: "intent", value: "save-set" }}
              variant="contained"
              loadingLabel="Saving..."
              disabled={!isDirty}
              sx={{ flex: 1 }}
            >
              Save set
            </FormStatusButton>

            {canDelete ? (
              <FormStatusButton
                type="submit"
                formAction={removeSetAction}
                formNoValidate
                name="intent"
                value="delete-set"
                pendingMatch={{ name: "intent", value: "delete-set" }}
                variant="outlined"
                color="inherit"
                loadingLabel="Deleting..."
                sx={{ minWidth: 88 }}
              >
                Delete
              </FormStatusButton>
            ) : null}
          </Stack>
        </Stack>
      </form>
    </Paper>
  );
}
