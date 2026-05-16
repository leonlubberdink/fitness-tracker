"use client";

import { useActionState } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import { sendHealthCoachMessageAction } from "@/features/health-coach/actions";
import { getHealthCoachChatActionState } from "@/features/health-coach/chat-state";

export function HealthChatForm() {
  const [state, formAction] = useActionState(
    sendHealthCoachMessageAction,
    getHealthCoachChatActionState(),
  );

  return (
    <form action={formAction}>
      <Stack spacing={1.5}>
        <TextField
          key={state.message || "__empty__"}
          label="Message"
          name="message"
          defaultValue={state.message}
          multiline
          minRows={2}
          maxRows={6}
          placeholder="Ask about your plan, recovery, nutrition, or request a proposed app change."
          slotProps={{ htmlInput: { maxLength: 4000 } }}
          fullWidth
          required
        />

        {state.error ? (
          <Alert severity="error" variant="outlined">
            {state.error}
          </Alert>
        ) : null}

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <FormStatusButton
            type="submit"
            variant="contained"
            loadingLabel="Thinking..."
          >
            Send
          </FormStatusButton>
        </Box>
      </Stack>
    </form>
  );
}
