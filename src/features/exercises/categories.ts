function sanitizeExerciseCategoryToken(value: string) {
  return value
    .trim()
    .replace(/^[{\["\s,]+/u, "")
    .replace(/[}\]"\s,]+$/u, "")
    .trim();
}

export function normalizeExerciseCategories(value: string) {
  const normalizedCategories: string[] = [];
  const seenCategories = new Set<string>();

  for (const rawCategory of value.split(",")) {
    const category = sanitizeExerciseCategoryToken(rawCategory);

    if (category.length === 0) {
      continue;
    }

    const categoryKey = category.toLowerCase();

    if (seenCategories.has(categoryKey)) {
      continue;
    }

    seenCategories.add(categoryKey);
    normalizedCategories.push(category);
  }

  return normalizedCategories;
}

export function hasExerciseCategories(value: string) {
  return normalizeExerciseCategories(value).length > 0;
}

export function formatExerciseCategories(categories: readonly string[]) {
  return categories.join(", ");
}

export function parseStoredExerciseCategories(
  value: string | readonly string[],
) {
  return normalizeExerciseCategories(
    typeof value === "string" ? value : value.join(", "),
  );
}

export function formatStoredExerciseCategories(
  value: string | readonly string[],
) {
  return formatExerciseCategories(parseStoredExerciseCategories(value));
}
