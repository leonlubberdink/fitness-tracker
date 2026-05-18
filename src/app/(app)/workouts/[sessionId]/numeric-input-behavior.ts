"use client";

import type {
  FocusEventHandler,
  InputHTMLAttributes,
  HTMLInputTypeAttribute,
} from "react";

export type WorkoutNumericInputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "inputMode" | "min" | "step"
>;

export function getWorkoutInputType(): HTMLInputTypeAttribute {
  return "text";
}

export function getWorkoutInputHtmlProps(
  inputProps: WorkoutNumericInputProps,
  {
    allowSignedValue = false,
  }: {
    allowSignedValue?: boolean;
  } = {},
): InputHTMLAttributes<HTMLInputElement> {
  return {
    ...inputProps,
    autoComplete: "off",
    spellCheck: false,
    inputMode: allowSignedValue ? "text" : inputProps.inputMode,
  };
}

export const selectWorkoutInputValueOnFocus: FocusEventHandler<
  HTMLInputElement | HTMLTextAreaElement
> = (event) => {
  const input = event.currentTarget;

  window.requestAnimationFrame(() => {
    if (document.activeElement !== input) {
      return;
    }

    input.select();
  });
};
