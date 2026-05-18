import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveExerciseScroll } from "./active-exercise-scroll";

let pathname = "/workouts/session-1";
let searchParams = new URLSearchParams("scrollTo=current-exercise&success=saved");

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
}));

describe("ActiveExerciseScroll", () => {
  beforeEach(() => {
    pathname = "/workouts/session-1";
    searchParams = new URLSearchParams(
      "scrollTo=current-exercise&success=saved",
    );

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  it("scrolls the target into view and removes the one-time scroll param", async () => {
    const target = document.createElement("div");
    const scrollIntoView = vi.fn();

    target.id = "current-exercise";
    Object.defineProperty(target, "scrollIntoView", {
      value: scrollIntoView,
      configurable: true,
    });
    document.body.appendChild(target);

    render(
      <ActiveExerciseScroll enabled targetId="current-exercise" />,
    );

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
    });

    expect(window.history.replaceState).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/workouts/session-1?success=saved",
    );
  });

  it("does nothing when scrolling is not enabled", () => {
    const target = document.createElement("div");
    const scrollIntoView = vi.fn();

    target.id = "current-exercise";
    Object.defineProperty(target, "scrollIntoView", {
      value: scrollIntoView,
      configurable: true,
    });
    document.body.appendChild(target);

    render(
      <ActiveExerciseScroll enabled={false} targetId="current-exercise" />,
    );

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});
