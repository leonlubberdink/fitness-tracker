"use client";

import { useEffect, useMemo, useState } from "react";

import AddRounded from "@mui/icons-material/AddRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { FormStatusButton } from "@/components/app/FormStatusButtons";
import {
  formatExerciseUnitShort,
  type ExerciseUnit,
} from "@/lib/exercise-units";

type ExerciseOption = {
  id: string;
  name: string;
  category: string;
  defaultUnit: ExerciseUnit;
};

type ExerciseSearchResponse = {
  exercises: ExerciseOption[];
};

type TemplateExercisePickerFormProps = {
  templateId: string;
  initialExercises: ExerciseOption[];
  excludedExerciseIds: string[];
  addTemplateExerciseAction: (formData: FormData) => Promise<void>;
};

export function TemplateExercisePickerForm({
  templateId,
  initialExercises,
  excludedExerciseIds,
  addTemplateExerciseAction,
}: TemplateExercisePickerFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseOption | null>(null);
  const [results, setResults] = useState<ExerciseOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const excludedExerciseIdSet = useMemo(
    () => new Set(excludedExerciseIds),
    [excludedExerciseIds],
  );
  const normalizedQuery = searchQuery.trim();
  const visibleResults = (
    normalizedQuery.length === 0 ? initialExercises : results
  ).filter((exercise) => !excludedExerciseIdSet.has(exercise.id));

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
    await addTemplateExerciseAction(formData);
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
    <Box component="form" action={formAction}>
      <Stack spacing={2}>
        <input type="hidden" name="templateId" value={templateId} />
        <input
          type="hidden"
          name="exerciseId"
          value={selectedExercise?.id ?? ""}
          required
        />

        <TextField
          label="Exercise"
          type="search"
          value={searchQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search exercises"
          fullWidth
        />

        {selectedExercise ? (
          <Stack
            spacing={1}
            sx={{
              p: 2,
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "rgba(255,255,255,0.02)",
            }}
          >
            <Typography variant="body1" fontWeight={700}>
              {selectedExercise.name}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={selectedExercise.category} variant="outlined" />
              <Chip
                label={formatExerciseUnitShort(selectedExercise.defaultUnit)}
                color="primary"
                variant="outlined"
              />
            </Stack>
          </Stack>
        ) : (
          <Stack
            spacing={1.25}
            sx={{
              p: 1.5,
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "rgba(255,255,255,0.02)",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              px={1}
            >
              <Typography variant="overline" color="text.secondary">
                Matches
              </Typography>
              {isLoading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">
                    Searching
                  </Typography>
                </Stack>
              ) : null}
            </Stack>

            {visibleResults.length === 0 ? (
              errorMessage ? (
                <Alert severity="error" variant="outlined">
                  {errorMessage}
                </Alert>
              ) : (
                <Typography px={1} py={2} color="text.secondary">
                  No available exercises match that search.
                </Typography>
              )
            ) : (
              <List disablePadding sx={{ display: "grid", gap: 1 }}>
                {visibleResults.map((exercise) => (
                  <ListItemButton
                    key={exercise.id}
                    onClick={() => handleExerciseSelect(exercise)}
                    sx={{
                      borderRadius: "6px",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      alignItems: "flex-start",
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {exercise.name}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {exercise.category}
                        </Typography>
                      }
                    />
                    <Chip
                      label={formatExerciseUnitShort(exercise.defaultUnit)}
                      size="small"
                      variant="outlined"
                      sx={{ ml: 2 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Stack>
        )}

        <FormStatusButton
          type="submit"
          variant="contained"
          disabled={!selectedExercise}
          startIcon={<AddRounded />}
          loadingLabel="Adding exercise..."
          fullWidth
        >
          Add to template
        </FormStatusButton>
      </Stack>
    </Box>
  );
}
