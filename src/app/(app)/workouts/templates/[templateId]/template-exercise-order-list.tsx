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

import { TemplateExercisePrescriptionEditor } from "./template-exercise-prescription-editor";

type TemplateExerciseItem = {
  id: string;
  notes: string | null;
  exerciseCategory: string;
  exerciseName: string;
  defaultUnit: ExerciseUnit;
  restTime: string | null;
  setsReps: string | null;
};

type TemplateExerciseOrderListProps = {
  templateId: string;
  exercises: TemplateExerciseItem[];
  reorderTemplateExercisesAction: (formData: FormData) => Promise<void>;
  removeTemplateExerciseAction: (formData: FormData) => Promise<void>;
  updateTemplateExercisePrescriptionAction: (
    formData: FormData,
  ) => Promise<void>;
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
  updateTemplateExercisePrescriptionAction,
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
                      borderRadius: 2,
                      px: 1.75,
                      py: 1.5,
                      border: "1px solid",
                      borderColor: draggableSnapshot.isDragging
                        ? "rgba(139,194,172,0.28)"
                        : "rgba(255,255,255,0.08)",
                      bgcolor: draggableSnapshot.isDragging
                        ? "rgba(139,194,172,0.09)"
                        : "rgba(255,255,255,0.02)",
                      boxShadow: draggableSnapshot.isDragging
                        ? "0 12px 32px rgba(0,0,0,0.18)"
                        : "none",
                      transition:
                        "border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                      overflow: "hidden",
                    }}
                    style={{
                      ...draggableProvided.draggableProps.style,
                      transform: draggableSnapshot.isDragging
                        ? `${draggableProvided.draggableProps.style?.transform ?? ""} scale(1.01)`
                        : draggableProvided.draggableProps.style?.transform,
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="flex-start"
                        minWidth={0}
                      >
                        <IconButton
                          {...draggableProvided.dragHandleProps}
                          aria-label={`Reorder ${exercise.exerciseName}`}
                          size="small"
                          disabled={!canReorder}
                          sx={{
                            mt: -0.25,
                            color: "text.secondary",
                            bgcolor: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            cursor: canReorder ? "grab" : "default",
                            touchAction: "none",
                            flexShrink: 0,
                            "&:hover": {
                              bgcolor: "rgba(255,255,255,0.05)",
                            },
                          }}
                        >
                          <DragIndicatorRounded fontSize="small" />
                        </IconButton>

                        <Stack spacing={0.75} flex={1} minWidth={0}>
                          <Stack direction="row" spacing={1} minWidth={0}>
                            <Stack spacing={0.3} minWidth={0} flex={1}>
                              <Typography variant="body1" fontWeight={700} noWrap>
                                {exercise.exerciseName}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                              >
                                {exercise.exerciseCategory} ·{" "}
                                {formatExerciseUnitShort(exercise.defaultUnit)}
                              </Typography>
                            </Stack>
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={0.75}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Chip
                              label={`Reps: ${exercise.setsReps ?? "missing"}`}
                              size="small"
                              color={exercise.setsReps ? "default" : "warning"}
                              variant="outlined"
                            />
                            <Chip
                              label={`Rest: ${exercise.restTime ?? "missing"}`}
                              size="small"
                              color={exercise.restTime ? "default" : "warning"}
                              variant="outlined"
                            />
                          </Stack>
                        </Stack>

                        <form action={removeTemplateExerciseAction}>
                          <input
                            type="hidden"
                            name="templateId"
                            value={templateId}
                          />
                          <input
                            type="hidden"
                            name="templateExerciseId"
                            value={exercise.id}
                          />
                          <FormStatusIconButton
                            type="submit"
                            aria-label={`Remove ${exercise.exerciseName}`}
                            size="small"
                            sx={{
                              color: "text.secondary",
                              flexShrink: 0,
                              mt: -0.25,
                            }}
                            pendingMatch={{
                              name: "templateExerciseId",
                              value: exercise.id,
                            }}
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </FormStatusIconButton>
                        </form>
                      </Stack>

                      {exercise.notes ? (
                        <Stack
                          spacing={0.5}
                          sx={{
                            borderRadius: 1.5,
                            px: 1.25,
                            py: 1,
                            bgcolor: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Notes
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}
                          >
                            {exercise.notes}
                          </Typography>
                        </Stack>
                      ) : null}

                      <Stack
                        spacing={1}
                        sx={{
                          pt: 1.25,
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <TemplateExercisePrescriptionEditor
                          initialNotes={exercise.notes}
                          initialRestTime={exercise.restTime}
                          initialSetsReps={exercise.setsReps}
                          templateExerciseId={exercise.id}
                          templateId={templateId}
                          updateTemplateExercisePrescriptionAction={
                            updateTemplateExercisePrescriptionAction
                          }
                        />
                      </Stack>
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
