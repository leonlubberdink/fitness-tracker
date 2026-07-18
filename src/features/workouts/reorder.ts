export type ReorderableWorkoutEntry = {
  id: string;
  sortOrder: number;
};

export function getActiveAndPlannedWorkoutEntries(
  entries: ReorderableWorkoutEntry[],
  activeEntrySortOrder: number | null,
) {
  if (entries.length === 0) {
    return [];
  }

  const fallbackSortOrder = entries.at(-1)?.sortOrder ?? entries[0].sortOrder;
  const resolvedActiveSortOrder =
    entries.find((entry) => entry.sortOrder === activeEntrySortOrder)
      ?.sortOrder ?? fallbackSortOrder;

  return entries.filter((entry) => entry.sortOrder >= resolvedActiveSortOrder);
}
