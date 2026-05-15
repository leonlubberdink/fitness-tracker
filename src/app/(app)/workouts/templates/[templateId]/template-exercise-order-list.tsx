"use client";

import { useState, useTransition } from "react";

import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";

import { FormStatusIconButton } from "@/components/app/FormStatusButtons";
import {
  formatExerciseUnitShort,
  type ExerciseUnit,
} from "@/lib/exercise-units";

type TemplateExerciseItem = {
  id: string;
  exerciseCategory: string;
  exerciseName: string;
  defaultUnit: ExerciseUnit;
};

type TemplateExerciseOrderListProps = {
  templateId: string;
  exercises: TemplateExerciseItem[];
  reorderTemplateExercisesAction: (formData: FormData) => Promise<void>;
  removeTemplateExerciseAction: (formData: FormData) => Promise<void>;
};

function reorderItems<T>(items: T[], startIndex: number, endIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(startIndex, 1);

  nextItems.splice(endIndex, 0, movedItem);

  return nextItems;
}

export function TemplateExerciseOrderList({
  templateId,
  exercises,
  reorderTemplateExercisesAction,
  removeTemplateExerciseAction,
}: TemplateExerciseOrderListProps) {
  const [orderedExercises, setOrderedExercises] = useState(exercises);
  const [isSaving, startSavingTransition] = useTransition();
  const canReorder = orderedExercises.length > 1 && !isSaving;

  function handleDragEnd(result: DropResult) {
    const { destination, source } = result;

    if (
      !destination ||
      destination.index === source.index ||
      source.index < 0 ||
      destination.index < 0
    ) {
      return;
    }

    const nextExercises = reorderItems(
      orderedExercises,
      source.index,
      destination.index,
    );

    setOrderedExercises(nextExercises);
    startSavingTransition(async () => {
      const formData = new FormData();
      formData.set("templateId", templateId);

      for (const exercise of nextExercises) {
        formData.append("templateExerciseId", exercise.id);
      }

      await reorderTemplateExercisesAction(formData);
    });
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="template-exercise-order">
        {(droppableProvided) => (
          <Stack
            spacing={1.25}
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
          >
            {orderedExercises.map((exercise, index) => (
              <Draggable
                key={exercise.id}
                draggableId={exercise.id}
                index={index}
                isDragDisabled={!canReorder}
              >
                {(draggableProvided, draggableSnapshot) => (
                  <Paper
                    ref={draggableProvided.innerRef}
                    {...draggableProvided.draggableProps}
                    elevation={0}
                    sx={{
                      borderRadius: "8px",
                      px: 1.5,
                      py: 1.5,
                      border: "1px solid",
                      borderColor: draggableSnapshot.isDragging
                        ? "rgba(139,194,172,0.22)"
                        : "transparent",
                      bgcolor: draggableSnapshot.isDragging
                        ? "rgba(139,194,172,0.08)"
                        : "rgba(255,255,255,0.02)",
                    }}
                    style={draggableProvided.draggableProps.style}
                  >
                    <Stack
                      direction="row"
                      spacing={1.25}
                      alignItems="center"
                      minWidth={0}
                    >
                      <IconButton
                        {...draggableProvided.dragHandleProps}
                        aria-label={`Reorder ${exercise.exerciseName}`}
                        size="small"
                        disabled={!canReorder}
                        sx={{
                          color: "text.secondary",
                          cursor: canReorder ? "grab" : "default",
                          touchAction: "none",
                        }}
                      >
                        <DragIndicatorRounded fontSize="small" />
                      </IconButton>

                      <Chip
                        label={index + 1}
                        color="primary"
                        variant="outlined"
                      />

                      <Stack spacing={0.25} flex={1} minWidth={0}>
                        <Typography variant="body1" fontWeight={700} noWrap>
                          {exercise.exerciseName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {exercise.exerciseCategory} ·{" "}
                          {formatExerciseUnitShort(exercise.defaultUnit)}
                        </Typography>
                      </Stack>

                      <form action={removeTemplateExerciseAction}>
                        <input type="hidden" name="templateId" value={templateId} />
                        <input
                          type="hidden"
                          name="templateExerciseId"
                          value={exercise.id}
                        />
                        <FormStatusIconButton
                          type="submit"
                          aria-label={`Remove ${exercise.exerciseName}`}
                          size="small"
                          sx={{ color: "text.secondary" }}
                          pendingMatch={{
                            name: "templateExerciseId",
                            value: exercise.id,
                          }}
                        >
                          <DeleteOutlineRounded fontSize="small" />
                        </FormStatusIconButton>
                      </form>
                    </Stack>
                  </Paper>
                )}
              </Draggable>
            ))}
            {droppableProvided.placeholder}
          </Stack>
        )}
      </Droppable>
    </DragDropContext>
  );
}
