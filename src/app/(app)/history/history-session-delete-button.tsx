"use client";

import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";

import { FormStatusIconButton } from "@/components/app/FormStatusButtons";
import { deleteCompletedWorkoutSessionAction } from "@/features/workouts/actions";

type HistorySessionDeleteButtonProps = {
  sessionId: string;
};

export function HistorySessionDeleteButton({
  sessionId,
}: HistorySessionDeleteButtonProps) {
  return (
    <form action={deleteCompletedWorkoutSessionAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <FormStatusIconButton
        type="submit"
        aria-label="Delete workout from history"
        color="inherit"
        size="small"
        sx={{ color: "text.secondary", mt: 0.75 }}
      >
        <DeleteOutlineRounded fontSize="small" />
      </FormStatusIconButton>
    </form>
  );
}
