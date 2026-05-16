import { http, HttpResponse } from "msw";

import type { ExerciseUnit } from "@/lib/exercise-units";

export const exerciseSearchPath = "/api/exercises/search";

export type MockExerciseSearchResult = {
  id: string;
  name: string;
  categories: string[];
  category: string;
  defaultUnit: ExerciseUnit;
};

type ExerciseResultsByQuery = Record<string, MockExerciseSearchResult[]>;

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

export function exerciseSearchSuccessHandler(
  resultsByQuery: ExerciseResultsByQuery = {},
) {
  return http.get(exerciseSearchPath, ({ request }) => {
    const query = normalizeQuery(new URL(request.url).searchParams.get("q") ?? "");

    return HttpResponse.json({
      exercises: resultsByQuery[query] ?? [],
    });
  });
}

export function exerciseSearchErrorHandler(status = 500) {
  return http.get(
    exerciseSearchPath,
    () => new HttpResponse(null, { status }),
  );
}

export const handlers = [exerciseSearchSuccessHandler()];
