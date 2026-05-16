"use client";

import { useActionState } from "react";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { updateWorkoutSessionNoteAction } from "@/features/workouts/actions";
import { getWorkoutSessionNoteActionState } from "@/features/workouts/state";

import { FormStatusButton } from "./FormStatusButtons";

type WorkoutSessionNoteFormProps = {
  sessionId: string;
  initialNote: string | null;
  title: string;
  description: string;
};

export function WorkoutSessionNoteForm({
  sessionId,
  initialNote,
  title,
  description,
}: WorkoutSessionNoteFormProps) {
  const [state, formAction] = useActionState(
    updateWorkoutSessionNoteAction,
    getWorkoutSessionNoteActionState(initialNote ?? ""),
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />

      <Stack spacing={1.5}>
        <Stack spacing={0.5}>
          <Typography variant="h3">{title}</Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Stack>

        <TextField
          label="Note"
          name="note"
          defaultValue={state.note}
          placeholder="How the session felt, adjustments to make next time, or anything worth remembering"
          multiline
          minRows={4}
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
          variant="outlined"
          loadingLabel="Saving note..."
          fullWidth
        >
          Save note
        </FormStatusButton>
      </Stack>
    </form>
  );
}
