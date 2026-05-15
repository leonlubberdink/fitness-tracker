"use client";

import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import { deleteExerciseAction } from "@/features/exercises/actions";

type ExerciseDeleteButtonProps = {
  exerciseId: string;
  exerciseName: string;
  searchQuery: string;
};

export function ExerciseDeleteButton({
  exerciseId,
  exerciseName,
  searchQuery,
}: ExerciseDeleteButtonProps) {
  return (
    <form action={deleteExerciseAction}>
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <input type="hidden" name="q" value={searchQuery} />
      <FormStatusButton
        type="submit"
        aria-label={`Delete ${exerciseName}`}
        variant="outlined"
        color="error"
        sx={{ minWidth: 48, width: 40, px: 0 }}
      >
        <DeleteOutlineRounded fontSize="small" />
      </FormStatusButton>
    </form>
  );
}
