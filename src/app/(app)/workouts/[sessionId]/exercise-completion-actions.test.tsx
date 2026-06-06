import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ExerciseCompletionActions } from "./exercise-completion-actions";

describe("ExerciseCompletionActions", () => {
  it("requires a recommendation before allowing exercise completion when sets are logged", async () => {
    const user = userEvent.setup();
    const advanceAction = vi.fn();
    const finishAction = vi.fn();

    const { container } = render(
      <ExerciseCompletionActions
        sessionId="session-1"
        canAdvance
        recommendationRequired
        initialRecommendation={null}
        advanceWorkoutExerciseAction={advanceAction}
        completeWorkoutSessionAction={finishAction}
      />,
    );

    const nextButton = screen.getByRole("button", { name: "Next exercise" });
    const finishButton = screen.getByRole("button", { name: "Finish workout" });

    expect(nextButton).toBeDisabled();
    expect(finishButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Keep" }));

    expect(nextButton).toBeEnabled();
    expect(finishButton).toBeEnabled();

    const forms = container.querySelectorAll("form");
    expect(forms).toHaveLength(2);

    const nextRecommendationInput = within(forms[0] as HTMLFormElement).getByDisplayValue(
      "keep",
    );
    const finishRecommendationInput = within(
      forms[1] as HTMLFormElement,
    ).getByDisplayValue("keep");

    expect(nextRecommendationInput).toHaveAttribute(
      "name",
      "nextLoadRecommendation",
    );
    expect(finishRecommendationInput).toHaveAttribute(
      "name",
      "nextLoadRecommendation",
    );
  });

  it("preselects the current recommendation and shows only finish for the final exercise", () => {
    render(
      <ExerciseCompletionActions
        sessionId="session-1"
        canAdvance={false}
        recommendationRequired
        initialRecommendation="decrease"
        advanceWorkoutExerciseAction={vi.fn()}
        completeWorkoutSessionAction={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Next exercise" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish workout" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Decrease" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("does not require a recommendation when no sets have been logged yet", () => {
    render(
      <ExerciseCompletionActions
        sessionId="session-1"
        canAdvance
        recommendationRequired={false}
        initialRecommendation={null}
        advanceWorkoutExerciseAction={vi.fn()}
        completeWorkoutSessionAction={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("Next-time recommendation"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next exercise" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Finish workout" })).toBeEnabled();
  });
});
