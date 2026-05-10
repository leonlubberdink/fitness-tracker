"use client";

import { useActionState } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import { createExerciseAction } from "@/features/exercises/actions";
import {
  EXERCISE_UNITS,
  initialCreateExerciseActionState,
} from "@/features/exercises/state";

export function ExerciseCreateForm() {
  const [state, formAction] = useActionState(
    createExerciseAction,
    initialCreateExerciseActionState,
  );
  const nameError = state.fieldErrors.name?.[0];
  const categoryError = state.fieldErrors.category?.[0];
  const defaultUnitError = state.fieldErrors.defaultUnit?.[0];

  return (
    <Box component="form" action={formAction}>
      <Stack spacing={2.5}>
        <TextField
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
          label="Category"
          type="text"
          name="category"
          defaultValue={state.values.category}
          placeholder="Chest"
          error={Boolean(categoryError)}
          helperText={categoryError}
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
              {unit === "kg" ? "kg" : "bodyweight"}
            </MenuItem>
          ))}
        </TextField>

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
          loadingLabel="Creating exercise..."
          fullWidth
        >
          Create exercise
        </FormStatusButton>
      </Stack>
    </Box>
  );
}
