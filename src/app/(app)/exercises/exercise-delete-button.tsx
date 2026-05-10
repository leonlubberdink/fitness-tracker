"use client";

import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";

import { FormStatusIconButton } from "@/components/app/FormStatusButtons";
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
      <FormStatusIconButton
        type="submit"
        aria-label={`Delete ${exerciseName}`}
        color="inherit"
        size="small"
        sx={{ color: "text.secondary", mr: 1 }}
      >
        <DeleteOutlineRounded fontSize="small" />
      </FormStatusIconButton>
    </form>
  );
}
