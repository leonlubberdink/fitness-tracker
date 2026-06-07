import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { exerciseSearchSuccessHandler } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";

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

  it("loads remote search matches through the shared MSW handlers", async () => {
    server.use(
      exerciseSearchSuccessHandler({
        bike: [
          {
            id: "exercise-4",
            name: "Bike Sprint",
            categories: ["Conditioning"],
            category: "Conditioning",
            defaultUnit: "time",
          },
        ],
      }),
    );

    render(
      <TemplateExercisePickerForm
        templateId="template-1"
        availableCategories={["Push", "Pull", "Conditioning"]}
        initialExercises={initialExercises}
        excludedExerciseIds={[]}
        addTemplateExerciseAction={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Exercise"), {
      target: { value: "bike" },
    });

    expect(await screen.findByText("Bike Sprint")).toBeVisible();
    expect(screen.queryByText("Bench Press")).not.toBeInTheDocument();
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

    expect(
      screen.queryByRole("button", { name: "Add to template" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Bench Press.*kg.*Push/ }));

    expect(screen.getAllByText("Bench Press").length).toBeGreaterThan(0);
    expect(screen.getByText("kg")).toBeVisible();
    expect(screen.getByLabelText(/Sets x reps/i)).toBeVisible();
    expect(screen.getByLabelText(/Rest time/i)).toBeVisible();
    expect(screen.getByLabelText(/Notes/i)).toBeVisible();

    await user.type(screen.getByLabelText(/Sets x reps/i), "4 x 4-6");
    await user.type(screen.getByLabelText(/Rest time/i), "2-3 min");
    await user.type(screen.getByLabelText(/Notes/i), "Primary strength exercise");

    expect(screen.getByRole("button", { name: "Add to template" })).toBeEnabled();
  });
});
