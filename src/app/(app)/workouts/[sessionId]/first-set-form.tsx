"use client";

import { useState, useTransition } from "react";

import AddRounded from "@mui/icons-material/AddRounded";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

type WorkoutFirstSetFormProps = {
  sessionId: string;
  entryId: string;
  initialReps: number;
  initialWeight: number;
  weightLabel: string;
  createSetAction: (formData: FormData) => Promise<void>;
};

export function WorkoutFirstSetForm({
  sessionId,
  entryId,
  initialReps,
  initialWeight,
  weightLabel,
  createSetAction,
}: WorkoutFirstSetFormProps) {
  const [reps, setReps] = useState(String(initialReps));
  const [weight, setWeight] = useState(String(initialWeight));
  const [isSaving, startSavingTransition] = useTransition();

  async function handleCreateAction(formData: FormData) {
    startSavingTransition(async () => {
      await createSetAction(formData);
    });
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: "8px",
        bgcolor: "rgba(139,194,172,0.05)",
        borderColor: "rgba(139,194,172,0.16)",
      }}
    >
      <form action={handleCreateAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="entryId" value={entryId} />

        <Stack spacing={1.5}>
          <Stack
            direction="row"
            spacing={0}
            alignItems="flex-start"
            sx={{ columnGap: 1.75 }}
          >
            <Chip
              label="Set 1"
              color="primary"
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

          <Button
            type="submit"
            variant="contained"
            loading={isSaving}
            loadingPosition="start"
            startIcon={<AddRounded />}
            fullWidth
          >
            Log first set
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
