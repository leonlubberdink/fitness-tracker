import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StartWorkoutDialogButton } from "./StartWorkoutDialogButton";

describe("StartWorkoutDialogButton", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  it("prefills the current bodyweight and lets the user reuse it", async () => {
    const user = userEvent.setup();

    render(
      <StartWorkoutDialogButton
        action={vi.fn(async () => {})}
        buttonLabel="Start from template"
        currentBodyweightKg={82.4}
        dialogDescription="Pick a bodyweight before starting."
        dialogTitle="Start workout"
        hiddenFields={{ templateId: "template-1" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start from template" }));

    const bodyweightInput = await screen.findByRole("textbox", {
      name: /bodyweight \(kg\)/i,
    });

    expect(bodyweightInput).toHaveValue("82.4");
    expect(
      screen.getByText("Current bodyweight: 82.4 kg"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /use current bodyweight/i }),
    ).toBeVisible();

    await user.clear(bodyweightInput);
    await user.click(
      screen.getByRole("button", { name: /use current bodyweight/i }),
    );

    expect(bodyweightInput).toHaveValue("82.4");
  });
});
