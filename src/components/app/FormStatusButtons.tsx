"use client";

import Button, { type ButtonProps } from "@mui/material/Button";
import IconButton, { type IconButtonProps } from "@mui/material/IconButton";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

type PendingMatch = {
  name: string;
  value: string;
};

type FormStatusButtonProps = ButtonProps & {
  loadingLabel?: ReactNode;
  pendingMatch?: PendingMatch;
};

type FormStatusIconButtonProps = IconButtonProps & {
  pendingMatch?: PendingMatch;
};

function matchesPendingSubmission(
  data: FormData | null,
  pendingMatch?: PendingMatch,
) {
  if (!pendingMatch) {
    return true;
  }

  return data?.get(pendingMatch.name) === pendingMatch.value;
}

export function FormStatusButton({
  children,
  disabled,
  loadingLabel,
  loadingPosition,
  pendingMatch,
  ...props
}: FormStatusButtonProps) {
  const { pending, data } = useFormStatus();
  const isPending = pending && matchesPendingSubmission(data, pendingMatch);
  const resolvedLoadingPosition =
    loadingPosition ??
    (props.startIcon ? "start" : props.endIcon ? "end" : "center");

  return (
    <Button
      {...props}
      disabled={Boolean(disabled) || isPending}
      loading={isPending}
      loadingPosition={resolvedLoadingPosition}
    >
      {isPending && loadingLabel ? loadingLabel : children}
    </Button>
  );
}

export function FormStatusIconButton({
  disabled,
  pendingMatch,
  ...props
}: FormStatusIconButtonProps) {
  const { pending, data } = useFormStatus();
  const isPending = pending && matchesPendingSubmission(data, pendingMatch);

  return (
    <IconButton
      {...props}
      disabled={Boolean(disabled) || isPending}
      loading={isPending}
    />
  );
}
