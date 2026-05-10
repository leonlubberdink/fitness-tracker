"use client";

import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import type { SyntheticEvent } from "react";

import { FormStatusIconButton } from "@/components/app/FormStatusButtons";
import { deleteCompletedWorkoutSessionAction } from "@/features/workouts/actions";

type HistorySessionDeleteButtonProps = {
  sessionId: string;
};

function stopAccordionToggle(event: SyntheticEvent) {
  event.stopPropagation();
}

export function HistorySessionDeleteButton({
  sessionId,
}: HistorySessionDeleteButtonProps) {
  return (
    <form
      action={deleteCompletedWorkoutSessionAction}
      onClick={stopAccordionToggle}
      onFocus={stopAccordionToggle}
      onKeyDown={stopAccordionToggle}
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <FormStatusIconButton
        type="submit"
        aria-label="Delete workout from history"
        color="inherit"
        size="small"
        sx={{ color: "text.secondary" }}
      >
        <DeleteOutlineRounded fontSize="small" />
      </FormStatusIconButton>
    </form>
  );
}
