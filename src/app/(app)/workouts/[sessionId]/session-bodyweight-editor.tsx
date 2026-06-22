"use client";

import { useState, useTransition } from "react";

import ScaleRounded from "@mui/icons-material/ScaleRounded";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import {
  getWorkoutInputHtmlProps,
  getWorkoutInputType,
  selectWorkoutInputValueOnFocus,
} from "./numeric-input-behavior";

type SessionBodyweightEditorProps = {
  currentBodyweightKg: number | null;
  sessionBodyweightKg: number | null;
  sessionId: string;
  updateWorkoutSessionBodyweightAction: (formData: FormData) => Promise<void>;
};

export function SessionBodyweightEditor({
  currentBodyweightKg,
  sessionBodyweightKg,
  sessionId,
  updateWorkoutSessionBodyweightAction,
}: SessionBodyweightEditorProps) {
  const [bodyweightValue, setBodyweightValue] = useState(
    (sessionBodyweightKg ?? currentBodyweightKg ?? "").toString(),
  );
  const [isSaving, startSavingTransition] = useTransition();
  const currentBodyweightLabel =
    currentBodyweightKg === null ? null : `${currentBodyweightKg} kg`;
  const sessionBodyweightLabel =
    sessionBodyweightKg === null ? null : `${sessionBodyweightKg} kg`;

  async function handleSaveAction(formData: FormData) {
    startSavingTransition(async () => {
      await updateWorkoutSessionBodyweightAction(formData);
    });
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "10px",
        px: 2.25,
        py: 2.25,
        bgcolor: "rgba(255,255,255,0.02)",
      }}
    >
      <form action={handleSaveAction}>
        <input type="hidden" name="sessionId" value={sessionId} />

        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <ScaleRounded color="primary" fontSize="small" />
            <Typography variant="h3">Session bodyweight</Typography>
          </Stack>

          {sessionBodyweightLabel ? (
            <Typography variant="body2" color="text.secondary">
              This workout currently uses {sessionBodyweightLabel}.
            </Typography>
          ) : currentBodyweightLabel ? (
            <Typography variant="body2" color="text.secondary">
              Leave this as-is to use your current registered bodyweight of{" "}
              {currentBodyweightLabel}.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Add your bodyweight before logging any bodyweight exercises.
            </Typography>
          )}

          <TextField
            label="Bodyweight (kg)"
            name="bodyweightKg"
            value={bodyweightValue}
            onChange={(event) => setBodyweightValue(event.target.value)}
            onFocus={selectWorkoutInputValueOnFocus}
            type={getWorkoutInputType()}
            slotProps={{
              htmlInput: getWorkoutInputHtmlProps({
                inputMode: "decimal",
                step: 0.1,
              }),
            }}
            helperText={
              currentBodyweightLabel
                ? `Prefilled with ${currentBodyweightLabel}. Replace it if needed.`
                : "Enter the bodyweight used for this workout."
            }
            fullWidth
          />

          <FormStatusButton
            type="submit"
            variant="outlined"
            loadingLabel="Saving bodyweight..."
            disabled={isSaving}
          >
            Save bodyweight
          </FormStatusButton>
        </Stack>
      </form>
    </Paper>
  );
}
