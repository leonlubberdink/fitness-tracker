export type SessionOutcome = "completed" | "partial" | "aborted" | "skipped";
type CompletionEntry = {
  id: string;
  sets: {
    reps: number | null;
    weight: number | null;
  }[];
};

export function resolveSessionOutcome(
  requested: SessionOutcome,
  entries: CompletionEntry[],
): SessionOutcome {
  const sets = entries.flatMap((entry) => entry.sets);
  const hasWork = sets.some((set) => set.reps !== null && set.weight !== null);
  if (requested === "skipped" && hasWork)
    throw new Error(
      "This workout has recorded work. Choose partial or aborted instead of skipped.",
    );
  if ((requested === "completed" || requested === "partial") && !hasWork)
    throw new Error(
      "Log a set, or choose skipped or aborted to end this workout.",
    );
  if (requested !== "completed") return requested;
  return entries.some(
    (entry) =>
      !entry.sets.some((set) => set.reps !== null && set.weight !== null),
  )
    ? "partial"
    : "completed";
}
