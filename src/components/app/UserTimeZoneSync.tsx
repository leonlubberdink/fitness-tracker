"use client";

import { startTransition, useEffect } from "react";

import { updateUserTimeZoneAction } from "@/features/plans/actions";

type UserTimeZoneSyncProps = {
  initialTimeZone: string;
};

export function UserTimeZoneSync({
  initialTimeZone,
}: UserTimeZoneSyncProps) {
  useEffect(() => {
    const browserTimeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";

    if (!browserTimeZone || browserTimeZone === initialTimeZone) {
      return;
    }

    startTransition(() => {
      void updateUserTimeZoneAction(browserTimeZone);
    });
  }, [initialTimeZone]);

  return null;
}
