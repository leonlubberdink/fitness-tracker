"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type ActiveExerciseScrollProps = {
  enabled: boolean;
  targetId: string;
};

export function ActiveExerciseScroll({
  enabled,
  targetId,
}: ActiveExerciseScrollProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("focusSet");
    nextParams.delete("scrollTo");
    const nextSearch = nextParams.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;

    const frameId = window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      window.history.replaceState(window.history.state, "", nextUrl);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [enabled, pathname, searchParams, targetId]);

  return null;
}
