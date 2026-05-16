import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  exerciseSearchErrorHandler,
  exerciseSearchSuccessHandler,
} from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

import { ExercisePickerForm } from "./exercise-picker-form";

const initialExercises = [
  {
    id: "exercise-1",
    name: "Bench Press",
    categories: ["Push"],
    category: "Push",
    defaultUnit: "kg" as const,
  },
  {
    id: "exercise-2",
    name: "Pull Up",
    categories: ["Pull"],
    category: "Pull",
    defaultUnit: "bodyweight" as const,
  },
];

describe("ExercisePickerForm", () => {
  it("shows initial matches and enables submission after selecting an exercise", async () => {
    const user = userEvent.setup();

    render(
      <ExercisePickerForm
        sessionId="session-1"
        initialExercises={initialExercises}
        addExerciseEntryAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Bench Press")).toBeVisible();
    expect(screen.getByText("Pull Up")).toBeVisible();

    const submitButton = screen.getByRole("button", { name: "Add to workout" });
    expect(submitButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Pull Up.*BW/ }));

    expect(screen.getByText("Pull Up")).toBeVisible();
    expect(screen.getByText("BW")).toBeVisible();
    expect(submitButton).toBeEnabled();
  });

  it("loads remote search results after the debounce interval", async () => {
    server.use(
      exerciseSearchSuccessHandler({
        cable: [
          {
            id: "exercise-3",
            name: "Cable Row",
            categories: ["Pull"],
            category: "Pull",
            defaultUnit: "kg",
          },
        ],
      }),
    );

    render(
      <ExercisePickerForm
        sessionId="session-1"
        initialExercises={initialExercises}
        addExerciseEntryAction={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "cable" },
    });

    expect(await screen.findByText("Cable Row")).toBeVisible();
    expect(screen.queryByText("Bench Press")).not.toBeInTheDocument();
  });

  it("shows an error when the search request fails", async () => {
    server.use(exerciseSearchErrorHandler());

    render(
      <ExercisePickerForm
        sessionId="session-1"
        initialExercises={initialExercises}
        addExerciseEntryAction={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "row" },
    });

    expect(await screen.findByText("Search request failed.")).toBeVisible();
  });

  it("restores the initial matches when the search query becomes empty", async () => {
    render(
      <ExercisePickerForm
        sessionId="session-1"
        initialExercises={initialExercises}
        addExerciseEntryAction={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Exercise");

    fireEvent.change(input, { target: { value: "row" } });
    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByText("Bench Press")).toBeVisible();
    expect(screen.getByText("Pull Up")).toBeVisible();

    await waitFor(() => {
      expect(screen.queryByText("Search request failed.")).not.toBeInTheDocument();
    });
  });
});
