import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hello-pangea/dnd", async () => {
  const React = await import("react");

  return {
    DragDropContext({
      children,
      onDragEnd,
    }: {
      children: ReactNode;
      onDragEnd: (result: {
        destination: { droppableId: string; index: number };
        draggableId: string;
        mode: string;
        reason: string;
        source: { droppableId: string; index: number };
        type: string;
      }) => void;
    }) {
      return React.createElement(
        React.Fragment,
        null,
        children,
        React.createElement(
          "button",
          {
            onClick: () =>
              onDragEnd({
                destination: {
                  droppableId: "planned-exercise-order",
                  index: 1,
                },
                draggableId: "entry-current",
                mode: "FLUID",
                reason: "DROP",
                source: {
                  droppableId: "planned-exercise-order",
                  index: 0,
                },
                type: "DEFAULT",
              }),
            type: "button",
          },
          "Move current down",
        ),
      );
    },
    Draggable({
      children,
      draggableId,
      index,
      isDragDisabled,
    }: {
      children: (
        provided: {
          draggableProps: { style: undefined };
          dragHandleProps: Record<string, never>;
          innerRef: () => void;
        },
        snapshot: { isDragging: boolean },
      ) => ReactNode;
      draggableId: string;
      index: number;
      isDragDisabled: boolean;
    }) {
      return React.createElement(
        "div",
        {
          "data-disabled": String(isDragDisabled),
          "data-draggable-id": draggableId,
          "data-index": String(index),
        },
        children(
          {
            draggableProps: { style: undefined },
            dragHandleProps: {},
            innerRef: () => undefined,
          },
          { isDragging: false },
        ),
      );
    },
    Droppable({
      children,
    }: {
      children: (provided: {
        droppableProps: Record<string, never>;
        innerRef: () => void;
        placeholder: null;
      }) => ReactNode;
    }) {
      return children({
        droppableProps: {},
        innerRef: () => undefined,
        placeholder: null,
      });
    },
  };
});

import { PlannedExerciseOrderList } from "./planned-exercise-order-list";

describe("PlannedExerciseOrderList", () => {
  const entries = [
    {
      exerciseCategorySnapshot: "Push",
      exerciseNameSnapshot: "Bench press",
      id: "entry-current",
      unitSnapshot: "kg" as const,
    },
    {
      exerciseCategorySnapshot: "Pull",
      exerciseNameSnapshot: "Row",
      id: "entry-next",
      unitSnapshot: "kg" as const,
    },
    {
      exerciseCategorySnapshot: "Legs",
      exerciseNameSnapshot: "Squat",
      id: "entry-later",
      unitSnapshot: "kg" as const,
    },
  ];

  it("labels the first item as current and later items as next", () => {
    render(
      <PlannedExerciseOrderList
        sessionId="session-1"
        entries={entries}
        reorderWorkoutEntriesAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Next 1")).toBeInTheDocument();
    expect(screen.getByText("Next 2")).toBeInTheDocument();
  });

  it("submits the current exercise with upcoming exercises when it is moved down", async () => {
    const user = userEvent.setup();
    const reorderWorkoutEntriesAction = vi.fn();

    const { container } = render(
      <PlannedExerciseOrderList
        sessionId="session-1"
        entries={entries}
        reorderWorkoutEntriesAction={reorderWorkoutEntriesAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Move current down" }));

    await waitFor(() => {
      expect(reorderWorkoutEntriesAction).toHaveBeenCalledTimes(1);
    });

    const formData = reorderWorkoutEntriesAction.mock.calls[0]?.[0] as FormData;

    expect(formData.get("sessionId")).toBe("session-1");
    expect(formData.getAll("entryId")).toEqual([
      "entry-next",
      "entry-current",
      "entry-later",
    ]);
    expect(
      Array.from(container.querySelectorAll("[data-draggable-id]")).map(
        (element) => element.getAttribute("data-draggable-id"),
      ),
    ).toEqual(["entry-next", "entry-current", "entry-later"]);
    expect(screen.getAllByText("Current")).toHaveLength(1);
  });
});
