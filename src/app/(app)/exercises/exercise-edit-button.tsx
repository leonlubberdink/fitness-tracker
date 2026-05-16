"use client";

import { useActionState, useState } from "react";

import EditRounded from "@mui/icons-material/EditRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import { updateExerciseAction } from "@/features/exercises/actions";
import {
  EXERCISE_UNITS,
  getExerciseActionState,
} from "@/features/exercises/state";
import {
  formatExerciseUnitLong,
  type ExerciseUnit,
} from "@/lib/exercise-units";

type ExerciseEditButtonProps = {
  exerciseId: string;
  name: string;
  category: string;
  defaultUnit: ExerciseUnit;
  note: string | null;
};

type ExerciseEditDialogFormProps = ExerciseEditButtonProps & {
  onClose: () => void;
};

function ExerciseEditDialogForm({
  exerciseId,
  name,
  category,
  defaultUnit,
  note,
  onClose,
}: ExerciseEditDialogFormProps) {
  async function handleUpdateExerciseAction(
    _previousState: ReturnType<typeof getExerciseActionState>,
    formData: FormData,
  ) {
    const nextState = await updateExerciseAction(
      getExerciseActionState({
        name,
        category,
        defaultUnit,
        note: note ?? "",
      }),
      formData,
    );

    if (nextState.success) {
      onClose();
    }

    return nextState;
  }

  const [state, formAction, isPending] = useActionState(
    handleUpdateExerciseAction,
    getExerciseActionState({
      name,
      category,
      defaultUnit,
      note: note ?? "",
    }),
  );
  const nameError = state.fieldErrors.name?.[0];
  const categoryError = state.fieldErrors.category?.[0];
  const defaultUnitError = state.fieldErrors.defaultUnit?.[0];
  const noteError = state.fieldErrors.note?.[0];

  return (
    <Box component="form" action={formAction}>
      <input type="hidden" name="exerciseId" value={exerciseId} />

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <TextField
            autoFocus
            label="Name"
            type="text"
            name="name"
            defaultValue={state.values.name}
            placeholder="Barbell bench press"
            error={Boolean(nameError)}
            helperText={nameError}
            fullWidth
            required
          />

          <TextField
            label="Categories"
            type="text"
            name="category"
            defaultValue={state.values.category}
            placeholder="Chest, Triceps"
            error={Boolean(categoryError)}
            helperText={
              categoryError ?? "Separate multiple categories with commas."
            }
            fullWidth
            required
          />

          <TextField
            select
            label="Default unit"
            name="defaultUnit"
            defaultValue={state.values.defaultUnit}
            error={Boolean(defaultUnitError)}
            helperText={defaultUnitError}
            fullWidth
          >
            {EXERCISE_UNITS.map((unit) => (
              <MenuItem key={unit} value={unit}>
                {formatExerciseUnitLong(unit)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Note"
            name="note"
            defaultValue={state.values.note}
            placeholder="Technique cues, setup reminders, or limitations"
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
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isPending}>
          Cancel
        </Button>
        <FormStatusButton
          type="submit"
          variant="contained"
          loadingLabel="Saving changes..."
        >
          Save changes
        </FormStatusButton>
      </DialogActions>
    </Box>
  );
}

export function ExerciseEditButton({
  exerciseId,
  name,
  category,
  defaultUnit,
  note,
}: ExerciseEditButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  function handleOpen() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
    setFormResetKey((currentValue) => currentValue + 1);
  }

  return (
    <>
      <Button
        type="button"
        variant="outlined"
        color="inherit"
        aria-label={`Edit ${name}`}
        onClick={handleOpen}
        sx={{ minWidth: 48, width: 40, px: 0 }}
      >
        <EditRounded fontSize="small" />
      </Button>

      <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Edit exercise</DialogTitle>
        <ExerciseEditDialogForm
          key={`${exerciseId}:${name}:${category}:${defaultUnit}:${note ?? ""}:${formResetKey}`}
          exerciseId={exerciseId}
          name={name}
          category={category}
          defaultUnit={defaultUnit}
          note={note}
          onClose={handleClose}
        />
      </Dialog>
    </>
  );
}
