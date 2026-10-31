import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkoutFirstSetForm } from "./first-set-form";

describe("WorkoutFirstSetForm", () => {
  it("saves an explicit RIR zero and leaves skipped RIR unrecorded", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn<(form: FormData) => Promise<void>>()
      .mockResolvedValue(undefined);
    render(
      <WorkoutFirstSetForm
        sessionId="session-1"
        entryId="entry-1"
        initialReps={8}
        initialMetricValue={20}
        metricLabel="Weight"
        metricInputProps={{ inputMode: "decimal", step: 0.5 }}
        createSetAction={action}
      />,
    );
    await user.type(
      screen.getByRole("spinbutton", { name: "RIR (optional)" }),
      "0",
    );
    await user.click(screen.getByRole("button", { name: "Log first set" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0][0].get("rir")).toBe("0");
    expect(
      screen.queryByRole("combobox", { name: "Set status" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /^Side$/ }),
    ).not.toBeInTheDocument();
    expect(action.mock.calls[0][0].has("status")).toBe(false);
    expect(action.mock.calls[0][0].has("side")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Skip RIR" }));
    await user.click(screen.getByRole("button", { name: "Log first set" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    expect(action.mock.calls[1][0].get("rir")).toBe("");
  });

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
        metricHelperText="Session bodyweight: 82.4 kg."
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
    expect(screen.getByText("Session bodyweight: 82.4 kg.")).toBeVisible();

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
    ).toHaveAttribute("inputmode", "numeric");
  });
});
