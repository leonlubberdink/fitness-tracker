import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkoutSetEditorForm } from "./set-editor-form";

describe("WorkoutSetEditorForm", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  it("uses a signed-friendly metric input and selects values on focus", async () => {
    const user = userEvent.setup();
    const selectSpy = vi.spyOn(HTMLInputElement.prototype, "select");

    render(
      <WorkoutSetEditorForm
        sessionId="session-1"
        setId="set-1"
        setNumber={2}
        initialReps={6}
        initialMetricValue={-20}
        metricLabel="Load"
        metricInputProps={{ inputMode: "decimal", step: 0.5 }}
        canDelete
        updateSetAction={vi.fn()}
        removeSetAction={vi.fn()}
      />,
    );

    const repsInput = screen.getByRole("textbox", { name: /reps/i });
    const loadInput = screen.getByRole("textbox", { name: /load/i });

    expect(repsInput).toHaveAttribute("inputmode", "numeric");
    expect(loadInput).toHaveAttribute("inputmode", "text");

    await user.click(loadInput);
    await user.click(repsInput);

    await waitFor(() => {
      expect(selectSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("autofocuses the reps input when requested", () => {
    render(
      <WorkoutSetEditorForm
        sessionId="session-1"
        setId="set-1"
        setNumber={2}
        initialReps={6}
        initialMetricValue={20}
        metricLabel="Load"
        metricInputProps={{ inputMode: "decimal", step: 0.5 }}
        canDelete
        autoFocus
        updateSetAction={vi.fn()}
        removeSetAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: /reps/i })).toHaveFocus();
  });
});
