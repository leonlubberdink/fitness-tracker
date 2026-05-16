import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExercisePickerForm } from "./exercise-picker-form";

type FetchResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    const fetchMock = vi.fn<(...args: unknown[]) => Promise<FetchResponse>>().mockResolvedValue({
      ok: true,
      json: async () => ({
        exercises: [
          {
            id: "exercise-3",
            name: "Cable Row",
            categories: ["Pull"],
            category: "Pull",
            defaultUnit: "kg",
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

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

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/exercises/search?q=cable",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    expect(await screen.findByText("Cable Row")).toBeVisible();
    expect(screen.queryByText("Bench Press")).not.toBeInTheDocument();
  });

  it("shows an error when the search request fails", async () => {
    const fetchMock = vi.fn<(...args: unknown[]) => Promise<FetchResponse>>().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    vi.stubGlobal("fetch", fetchMock);

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

  it("clears remote results when the search query becomes empty", async () => {
    const fetchMock = vi.fn<(...args: unknown[]) => Promise<FetchResponse>>();
    vi.stubGlobal("fetch", fetchMock);

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
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
