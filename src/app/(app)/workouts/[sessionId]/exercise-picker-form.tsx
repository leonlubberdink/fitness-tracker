"use client";

import { useEffect, useState } from "react";

type ExerciseOption = {
  id: string;
  name: string;
  category: string;
  defaultUnit: "kg" | "bodyweight";
};

type ExerciseSearchResponse = {
  exercises: ExerciseOption[];
};

type ExercisePickerFormProps = {
  sessionId: string;
  initialExercises: ExerciseOption[];
  addExerciseEntryAction: (formData: FormData) => Promise<void>;
};

function formatUnit(unit: "kg" | "bodyweight") {
  return unit === "kg" ? "kg" : "BW";
}

export function ExercisePickerForm({
  sessionId,
  initialExercises,
  addExerciseEntryAction,
}: ExercisePickerFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<ExerciseOption | null>(
    null,
  );
  const [results, setResults] = useState<ExerciseOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const normalizedQuery = searchQuery.trim();
  const visibleResults = normalizedQuery.length === 0 ? initialExercises : results;

  useEffect(() => {
    if (normalizedQuery.length === 0) {
      return;
    }

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/exercises/search?q=${encodeURIComponent(normalizedQuery)}`,
          {
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Search request failed.");
        }

        const data = (await response.json()) as ExerciseSearchResponse;
        setResults(data.exercises);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setResults([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Search request failed.",
        );
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 200);

    return () => {
      abortController.abort();
      window.clearTimeout(timeoutId);
    };
  }, [normalizedQuery]);

  async function formAction(formData: FormData) {
    await addExerciseEntryAction(formData);
    setSearchQuery("");
    setSelectedExercise(null);
    setResults([]);
    setErrorMessage("");
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setSelectedExercise(null);
    setErrorMessage("");

    if (value.trim().length === 0) {
      setIsLoading(false);
      setResults([]);
    }
  }

  function handleExerciseSelect(exercise: ExerciseOption) {
    setSelectedExercise(exercise);
    setSearchQuery(exercise.name);
    setResults(initialExercises);
    setErrorMessage("");
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input
        type="hidden"
        name="exerciseId"
        value={selectedExercise?.id ?? ""}
        required
      />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Exercise</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search exercises by name"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none"
        />
      </label>

      {selectedExercise ? (
        <div className="rounded-[1.25rem] border border-border bg-background px-4 py-3">
          <div className="text-sm font-semibold text-foreground">
            {selectedExercise.name}
          </div>
          <div className="mt-1 text-sm text-muted">
            {selectedExercise.category} ·{" "}
            {formatUnit(selectedExercise.defaultUnit)}
          </div>
        </div>
      ) : (
        <div className="rounded-[1.25rem] border border-border bg-background/70 p-2">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
              Matches
            </span>
            {isLoading ? (
              <span className="text-xs text-muted">Searching…</span>
            ) : null}
          </div>

          {visibleResults.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted">
              {errorMessage || "No exercises match that search."}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleResults.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => handleExerciseSelect(exercise)}
                  className="flex w-full items-center justify-between rounded-[1rem] border border-border bg-surface px-3 py-3 text-left transition-colors hover:bg-background"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {exercise.name}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {exercise.category}
                    </span>
                  </span>
                  <span className="ml-3 shrink-0 text-xs font-medium uppercase tracking-[0.16em] text-muted">
                    {formatUnit(exercise.defaultUnit)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedExercise}
        className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add to workout
      </button>
    </form>
  );
}
