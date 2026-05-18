import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkoutFirstSetForm } from "./first-set-form";

describe("WorkoutFirstSetForm", () => {
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
      <WorkoutFirstSetForm
        sessionId="session-1"
        entryId="entry-1"
        initialReps={8}
        initialMetricValue={-12.5}
        metricLabel="Load"
        metricInputProps={{ inputMode: "decimal", step: 0.5 }}
        createSetAction={vi.fn()}
      />,
    );

    const repsInput = screen.getByRole("textbox", { name: /reps/i });
    const loadInput = screen.getByRole("textbox", { name: /load/i });

    expect(repsInput).toHaveAttribute("type", "text");
    expect(repsInput).toHaveAttribute("inputmode", "numeric");
    expect(loadInput).toHaveAttribute("type", "text");
    expect(loadInput).toHaveAttribute("inputmode", "text");

    await user.click(repsInput);
    await user.click(loadInput);

    await waitFor(() => {
      expect(selectSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps positive-only metric inputs on a numeric keypad", () => {
    render(
      <WorkoutFirstSetForm
        sessionId="session-1"
        entryId="entry-1"
        initialReps={1}
        initialMetricValue={90}
        metricLabel="Time (sec)"
        metricInputProps={{ inputMode: "numeric", min: 1, step: 1 }}
        createSetAction={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("textbox", { name: /time \(sec\)/i }),
    ).toHaveAttribute(
      "inputmode",
      "numeric",
    );
  });
});
