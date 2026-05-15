"use client";

import { useState, useTransition } from "react";

import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
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
import {
  formatExerciseUnitShort,
  type ExerciseUnit,
} from "@/lib/exercise-units";

type PlannedExerciseItem = {
  id: string;
  exerciseCategorySnapshot: string;
  exerciseNameSnapshot: string;
  unitSnapshot: ExerciseUnit;
};

type PlannedExerciseOrderListProps = {
  sessionId: string;
  entries: PlannedExerciseItem[];
  reorderWorkoutEntriesAction: (formData: FormData) => Promise<void>;
};

function reorderItems<T>(items: T[], startIndex: number, endIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(startIndex, 1);

  nextItems.splice(endIndex, 0, movedItem);

  return nextItems;
}

export function PlannedExerciseOrderList({
  sessionId,
  entries,
  reorderWorkoutEntriesAction,
}: PlannedExerciseOrderListProps) {
  const [orderedEntries, setOrderedEntries] = useState(entries);
  const [isSaving, startSavingTransition] = useTransition();
  const canReorder = orderedEntries.length > 1 && !isSaving;

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

    const nextEntries = reorderItems(
      orderedEntries,
      source.index,
      destination.index,
    );

    setOrderedEntries(nextEntries);
    startSavingTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);

      for (const entry of nextEntries) {
        formData.append("entryId", entry.id);
      }

      await reorderWorkoutEntriesAction(formData);
    });
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="planned-exercise-order">
        {(droppableProvided) => (
          <Stack
            spacing={1}
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
          >
            {orderedEntries.map((entry, index) => (
              <Draggable
                key={entry.id}
                draggableId={entry.id}
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
                      px: 2,
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
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        minWidth={0}
                        flex={1}
                      >
                        <IconButton
                          {...draggableProvided.dragHandleProps}
                          aria-label={`Reorder ${entry.exerciseNameSnapshot}`}
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

                        <Stack spacing={0.25} minWidth={0}>
                          <Typography variant="body1" fontWeight={700} noWrap>
                            {entry.exerciseNameSnapshot}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            {entry.exerciseCategorySnapshot} ·{" "}
                            {formatExerciseUnitShort(entry.unitSnapshot)}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Chip
                        label={`Next ${index + 1}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
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
