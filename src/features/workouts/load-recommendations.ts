export const LOAD_RECOMMENDATIONS = [
  "increase",
  "keep",
  "decrease",
] as const;

export type LoadRecommendation = (typeof LOAD_RECOMMENDATIONS)[number];

export function isLoadRecommendation(
  value: string,
): value is LoadRecommendation {
  return LOAD_RECOMMENDATIONS.includes(value as LoadRecommendation);
}

export function getLoadRecommendationLabel(
  recommendation: LoadRecommendation,
) {
  switch (recommendation) {
    case "increase":
      return "Increase";
    case "keep":
      return "Keep";
    case "decrease":
      return "Decrease";
  }
}
