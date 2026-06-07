import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TemplateExercisePrescriptionEditor } from "./template-exercise-prescription-editor";

describe("TemplateExercisePrescriptionEditor", () => {
  it("toggles the prescription form when editing a complete exercise", async () => {
    const user = userEvent.setup();

    render(
      <TemplateExercisePrescriptionEditor
        initialNotes="Primary strength exercise"
        initialRestTime="2-3 min"
        initialSetsReps="4 x 4-6"
        templateExerciseId="template-exercise-1"
        templateId="template-1"
        updateTemplateExercisePrescriptionAction={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Sets x reps")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit prescription" }));

    expect(screen.getByLabelText(/Sets x reps/i)).toHaveValue("4 x 4-6");
    expect(screen.getByLabelText(/Rest time/i)).toHaveValue("2-3 min");
    expect(screen.getByLabelText(/Notes/i)).toHaveValue(
      "Primary strength exercise",
    );
  });

  it("opens by default when required prescription fields are missing", () => {
    render(
      <TemplateExercisePrescriptionEditor
        initialNotes={null}
        initialRestTime={null}
        initialSetsReps={null}
        templateExerciseId="template-exercise-1"
        templateId="template-1"
        updateTemplateExercisePrescriptionAction={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Sets x reps/i)).toBeVisible();
    expect(screen.getByLabelText(/Rest time/i)).toBeVisible();
  });
});
