import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionBodyweightEditor } from "./session-bodyweight-editor";

describe("SessionBodyweightEditor", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  it("prefills the current bodyweight when no session snapshot exists yet", () => {
    render(
      <SessionBodyweightEditor
        currentBodyweightKg={82.4}
        sessionBodyweightKg={null}
        sessionId="session-1"
        updateWorkoutSessionBodyweightAction={vi.fn(async () => {})}
      />,
    );

    expect(
      screen.getByText("Prefilled with 82.4 kg. Replace it if needed."),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: /bodyweight \(kg\)/i }),
    ).toHaveValue("82.4");
  });
});
