"use client";

import { useState } from "react";

import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";

type TemplateExercisePrescriptionEditorProps = {
  initialNotes: string | null;
  initialRestTime: string | null;
  initialSetsReps: string | null;
  templateExerciseId: string;
  templateId: string;
  updateTemplateExercisePrescriptionAction: (formData: FormData) => Promise<void>;
};

export function TemplateExercisePrescriptionEditor({
  initialNotes,
  initialRestTime,
  initialSetsReps,
  templateExerciseId,
  templateId,
  updateTemplateExercisePrescriptionAction,
}: TemplateExercisePrescriptionEditorProps) {
  const [isOpen, setIsOpen] = useState(
    initialSetsReps === null || initialRestTime === null,
  );

  return (
    <Stack spacing={1}>
      <Button
        type="button"
        onClick={() => setIsOpen((currentState) => !currentState)}
        endIcon={<ExpandMoreRounded />}
        size="small"
        sx={{ alignSelf: "flex-start" }}
      >
        {isOpen ? "Hide prescription" : "Edit prescription"}
      </Button>

      <Collapse in={isOpen} timeout="auto" unmountOnExit={false}>
        <Stack
          component="form"
          action={updateTemplateExercisePrescriptionAction}
          spacing={1.25}
          sx={{
            borderRadius: "8px",
            px: 1.5,
            py: 1.5,
            bgcolor: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <input type="hidden" name="templateId" value={templateId} />
          <input
            type="hidden"
            name="templateExerciseId"
            value={templateExerciseId}
          />
          <Typography variant="caption" color="text.secondary">
            Update the prescription for this template entry.
          </Typography>
          <TextField
            label="Sets x reps"
            name="setsReps"
            defaultValue={initialSetsReps ?? ""}
            placeholder="4 x 4-6"
            slotProps={{ htmlInput: { maxLength: 80 } }}
            required
            fullWidth
          />
          <TextField
            label="Rest time"
            name="restTime"
            defaultValue={initialRestTime ?? ""}
            placeholder="2-3 min"
            slotProps={{ htmlInput: { maxLength: 40 } }}
            required
            fullWidth
          />
          <TextField
            label="Notes"
            name="notes"
            defaultValue={initialNotes ?? ""}
            placeholder="Primary strength exercise"
            slotProps={{ htmlInput: { maxLength: 240 } }}
            multiline
            minRows={2}
            fullWidth
          />
          <FormStatusButton
            type="submit"
            variant="outlined"
            loadingLabel="Saving..."
            fullWidth
          >
            Save prescription
          </FormStatusButton>
        </Stack>
      </Collapse>
    </Stack>
  );
}
