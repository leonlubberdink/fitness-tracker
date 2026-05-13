"use client";

import { useActionState } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import { loginAction } from "@/features/auth/actions";
import { initialLoginActionState } from "@/features/auth/state";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialLoginActionState);
  const emailError = state.fieldErrors.email?.[0];
  const passwordError = state.fieldErrors.password?.[0];

  return (
    <Box component="form" action={formAction}>
      <Stack spacing={2.25}>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values.email}
          error={Boolean(emailError)}
          helperText={emailError}
          fullWidth
          required
        />

        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={Boolean(passwordError)}
          helperText={passwordError}
          fullWidth
          required
        />

        {state.error ? (
          <Alert severity="error" variant="outlined">
            {state.error}
          </Alert>
        ) : null}

        <FormStatusButton
          type="submit"
          variant="contained"
          loadingLabel="Signing in..."
          fullWidth
        >
          Sign in
        </FormStatusButton>
      </Stack>
    </Box>
  );
}
