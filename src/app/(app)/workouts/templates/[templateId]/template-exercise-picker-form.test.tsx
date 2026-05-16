import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplateExercisePickerForm } from "./template-exercise-picker-form";

const initialExercises = [
  {
    id: "exercise-1",
    name: "Bench Press",
    categories: ["Push", "Upper"],
    category: "Push",
    defaultUnit: "kg" as const,
  },
  {
    id: "exercise-2",
    name: "Pull Up",
    categories: ["Pull", "Upper"],
    category: "Pull",
    defaultUnit: "bodyweight" as const,
  },
  {
    id: "exercise-3",
    name: "Air Bike",
    categories: ["Conditioning"],
    category: "Conditioning",
    defaultUnit: "time" as const,
  },
];

describe("TemplateExercisePickerForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("filters out excluded exercises from the available matches", () => {
    render(
      <TemplateExercisePickerForm
        templateId="template-1"
        availableCategories={["Push", "Pull", "Conditioning"]}
        initialExercises={initialExercises}
        excludedExerciseIds={["exercise-2"]}
        addTemplateExerciseAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Bench Press")).toBeVisible();
    expect(screen.getByText("Air Bike")).toBeVisible();
    expect(screen.queryByText("Pull Up")).not.toBeInTheDocument();
  });

  it("filters the visible matches by selected categories", async () => {
    const user = userEvent.setup();

    render(
      <TemplateExercisePickerForm
        templateId="template-1"
        availableCategories={["Push", "Pull", "Conditioning"]}
        initialExercises={initialExercises}
        excludedExerciseIds={[]}
        addTemplateExerciseAction={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Conditioning" }));

    expect(screen.getByText("Air Bike")).toBeVisible();
    expect(screen.queryByText("Bench Press")).not.toBeInTheDocument();
    expect(screen.queryByText("Pull Up")).not.toBeInTheDocument();
  });

  it("shows the selected exercise summary and enables the add button", async () => {
    const user = userEvent.setup();

    render(
      <TemplateExercisePickerForm
        templateId="template-1"
        availableCategories={["Push", "Pull", "Conditioning"]}
        initialExercises={initialExercises}
        excludedExerciseIds={[]}
        addTemplateExerciseAction={vi.fn()}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Add to template" });
    expect(submitButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Bench Press.*kg.*Push/ }));

    expect(screen.getAllByText("Bench Press").length).toBeGreaterThan(0);
    expect(screen.getByText("kg")).toBeVisible();
    expect(submitButton).toBeEnabled();
  });
});
