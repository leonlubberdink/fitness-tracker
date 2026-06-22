"use client";

import { useState } from "react";

import FitnessCenterRounded from "@mui/icons-material/FitnessCenterRounded";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import {
  getWorkoutInputHtmlProps,
  getWorkoutInputType,
  selectWorkoutInputValueOnFocus,
} from "@/app/(app)/workouts/[sessionId]/numeric-input-behavior";
import type { ButtonProps } from "@mui/material/Button";

type StartWorkoutDialogButtonProps = {
  action: (formData: FormData) => Promise<void>;
  buttonLabel: string;
  color?: ButtonProps["color"];
  currentBodyweightKg: number | null;
  disabled?: boolean;
  dialogDescription: string;
  dialogTitle: string;
  fullWidth?: boolean;
  hiddenFields: Record<string, string>;
  submitLabel?: string;
  variant?: ButtonProps["variant"];
};

export function StartWorkoutDialogButton({
  action,
  buttonLabel,
  color = "primary",
  currentBodyweightKg,
  disabled = false,
  dialogDescription,
  dialogTitle,
  fullWidth = false,
  hiddenFields,
  submitLabel = "Start workout",
  variant = "contained",
}: StartWorkoutDialogButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bodyweightValue, setBodyweightValue] = useState(
    currentBodyweightKg?.toString() ?? "",
  );

  function handleOpen() {
    setBodyweightValue(currentBodyweightKg?.toString() ?? "");
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  const currentBodyweightLabel =
    currentBodyweightKg === null
      ? null
      : `${currentBodyweightKg} kg`;
  const currentBodyweightValue = currentBodyweightKg?.toString() ?? "";

  return (
    <>
      <Button
        type="button"
        variant={variant}
        color={color}
        startIcon={<FitnessCenterRounded />}
        onClick={handleOpen}
        disabled={disabled}
        fullWidth={fullWidth}
      >
        {buttonLabel}
      </Button>

      <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <form action={action}>
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {dialogDescription}
              </Typography>

              {currentBodyweightLabel ? (
                <Typography variant="body2" color="text.secondary">
                  Current bodyweight: {currentBodyweightLabel}
                </Typography>
              ) : null}

              <Stack spacing={0.75}>
                <TextField
                  autoFocus
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
                      ? `Leave this as-is to use ${currentBodyweightValue}.`
                      : "Optional. You can enter it now or later from the workout page."
                  }
                  fullWidth
                />

                {currentBodyweightLabel ? (
                  <Button
                    type="button"
                    variant="text"
                    onClick={() => setBodyweightValue(currentBodyweightValue)}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Use current bodyweight
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
            <FormStatusButton type="submit" variant="contained" loadingLabel="Starting...">
              {submitLabel}
            </FormStatusButton>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
