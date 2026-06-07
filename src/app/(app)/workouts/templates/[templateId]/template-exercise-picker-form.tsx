"use client";

import { useEffect, useMemo, useState } from "react";

import AddRounded from "@mui/icons-material/AddRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import {
  FormStatusButton,
} from "@/components/app/FormStatusButtons";
import {
  formatExerciseUnitShort,
  type ExerciseUnit,
} from "@/lib/exercise-units";

type ExerciseOption = {
  id: string;
  name: string;
  categories: string[];
  category: string;
  defaultUnit: ExerciseUnit;
};

type ExerciseSearchResponse = {
  exercises: ExerciseOption[];
};

type TemplateExercisePickerFormProps = {
  templateId: string;
  availableCategories: string[];
  initialExercises: ExerciseOption[];
  excludedExerciseIds: string[];
  addTemplateExerciseAction: (formData: FormData) => Promise<void>;
};

export function TemplateExercisePickerForm({
  templateId,
  availableCategories,
  initialExercises,
  excludedExerciseIds,
  addTemplateExerciseAction,
}: TemplateExercisePickerFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseOption | null>(null);
  const [setsReps, setSetsReps] = useState("");
  const [restTime, setRestTime] = useState("");
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState<ExerciseOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const excludedExerciseIdSet = useMemo(
    () => new Set(excludedExerciseIds),
    [excludedExerciseIds],
  );
  const normalizedQuery = searchQuery.trim();
  const searchResults = normalizedQuery.length === 0 ? initialExercises : results;
  const visibleResults = searchResults.filter((exercise) => {
    if (excludedExerciseIdSet.has(exercise.id)) {
      return false;
    }

    if (selectedCategories.length === 0) {
      return true;
    }

    return exercise.categories.some((category) =>
      selectedCategories.includes(category),
    );
  });

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
    setSetsReps("");
    setRestTime("");
    setNotes("");
    setResults([]);
    setErrorMessage("");
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setSelectedExercise(null);
    setSetsReps("");
    setRestTime("");
    setNotes("");
    setErrorMessage("");

    if (value.trim().length === 0) {
      setIsLoading(false);
      setResults([]);
    }
  }

  function handleExerciseSelect(exercise: ExerciseOption) {
    setSelectedExercise(exercise);
    setSearchQuery(exercise.name);
    setSetsReps("");
    setRestTime("");
    setNotes("");
    setResults(initialExercises);
    setErrorMessage("");
  }

  function handleCategoryToggle(category: string) {
    setSelectedExercise(null);
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((currentCategory) => currentCategory !== category)
        : [...currentCategories, category],
    );
  }

  return (
    <Box>
      <Stack spacing={2}>
        <TextField
          label="Exercise"
          type="search"
          value={searchQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search exercises"
          fullWidth
        />

        {availableCategories.length > 0 ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {availableCategories.map((category) => {
              const isSelected = selectedCategories.includes(category);

              return (
                <Chip
                  key={category}
                  label={category}
                  onClick={() => handleCategoryToggle(category)}
                  color={isSelected ? "primary" : "default"}
                  variant={isSelected ? "filled" : "outlined"}
                />
              );
            })}
          </Stack>
        ) : null}

        {selectedExercise ? (
          <Box component="form" action={formAction}>
            <Stack
              spacing={1.5}
              sx={{
                p: 2,
                borderRadius: "8px",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "rgba(255,255,255,0.02)",
              }}
            >
              <input type="hidden" name="templateId" value={templateId} />
              <input
                type="hidden"
                name="exerciseId"
                value={selectedExercise.id}
              />
              <Stack spacing={0.75}>
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

              <TextField
                label="Sets x reps"
                name="setsReps"
                value={setsReps}
                onChange={(event) => setSetsReps(event.target.value)}
                placeholder="4 x 4-6"
                required
                fullWidth
              />
              <TextField
                label="Rest time"
                name="restTime"
                value={restTime}
                onChange={(event) => setRestTime(event.target.value)}
                placeholder="2-3 min"
                required
                fullWidth
              />
              <TextField
                label="Notes"
                name="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Primary strength exercise"
                multiline
                minRows={2}
                fullWidth
              />
              <FormStatusButton
                type="submit"
                variant="contained"
                loadingLabel="Adding exercise..."
                disabled={
                  setsReps.trim().length === 0 || restTime.trim().length === 0
                }
                fullWidth
              >
                Add to template
              </FormStatusButton>
            </Stack>
          </Box>
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
                  No available exercises match that search or filter.
                </Typography>
              )
            ) : (
              <List disablePadding sx={{ display: "grid", gap: 1 }}>
                {visibleResults.map((exercise) => (
                  <ListItem
                    key={exercise.id}
                    disablePadding
                    sx={{
                      borderRadius: "6px",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      overflow: "hidden",
                    }}
                  >
                    <ListItemButton
                      onClick={() => handleExerciseSelect(exercise)}
                      sx={{
                        alignItems: "flex-start",
                        px: 2,
                        py: 1.5,
                      }}
                    >
                      <ListItemText
                        primary={
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ minWidth: 0 }}
                          >
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {exercise.name}
                            </Typography>
                            <Chip
                              label={formatExerciseUnitShort(exercise.defaultUnit)}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
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
                    </ListItemButton>

                    <Box sx={{ pr: 1.25 }}>
                      <IconButton
                        type="button"
                        color="primary"
                        aria-label={`Open add form for ${exercise.name}`}
                        onClick={() => handleExerciseSelect(exercise)}
                        sx={{ alignSelf: "center" }}
                      >
                        <AddRounded />
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
