"use client";

import { useDeferredValue, useState } from "react";

import SearchRounded from "@mui/icons-material/SearchRounded";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import {
  formatExerciseUnitLong,
  type ExerciseUnit,
} from "@/lib/exercise-units";

import { ExerciseDeleteButton } from "./exercise-delete-button";
import { ExerciseEditButton } from "./exercise-edit-button";

type ExerciseLibraryItem = {
  id: string;
  name: string;
  category: string;
  defaultUnit: ExerciseUnit;
};

type ExerciseLibraryProps = {
  exercises: ExerciseLibraryItem[];
  initialQuery: string;
};

function matchesSearchQuery(
  exercise: ExerciseLibraryItem,
  normalizedSearchQuery: string,
) {
  return (
    exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
    exercise.category.toLowerCase().includes(normalizedSearchQuery)
  );
}

export function ExerciseLibrary({
  exercises,
  initialQuery,
}: ExerciseLibraryProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const typedCharacterCount = searchQuery.trim().length;
  const shouldFilter = normalizedSearchQuery.length >= 2;
  const visibleExercises = shouldFilter
    ? exercises.filter((exercise) =>
        matchesSearchQuery(exercise, normalizedSearchQuery),
      )
    : exercises;

  return (
    <Stack spacing={2.75}>
      <Stack spacing={1.25}>
        <Stack spacing={0.75}>
          <Typography variant="h3">Exercise library</Typography>
          <Typography color="text.secondary">
            Search by name or category. Filtering starts after 2 characters.
          </Typography>
        </Stack>

        <TextField
          fullWidth
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search exercises"
          helperText={
            typedCharacterCount === 1
              ? "Type one more character to filter the list."
              : " "
          }
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded />
                </InputAdornment>
              ),
            },
          }}
        />
      </Stack>

      {visibleExercises.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: "8px",
            px: 2,
            py: 3,
            bgcolor: "rgba(255,255,255,0.02)",
          }}
        >
          <Stack spacing={0.75}>
            <Typography variant="h3" sx={{ fontSize: "1rem" }}>
              {shouldFilter
                ? "No exercises match that search."
                : "No exercises yet."}
            </Typography>
            <Typography color="text.secondary">
              {shouldFilter
                ? "Try another name or category."
                : "Use the create panel to add your first exercise."}
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <List disablePadding sx={{ display: "grid", gap: 1.5 }}>
          {visibleExercises.map((exercise) => (
            <Paper
              key={exercise.id}
              elevation={0}
              sx={{ borderRadius: "8px", px: 2, py: 1.75 }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body1" fontWeight={700}>
                    {exercise.name}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ flexWrap: "wrap", rowGap: 1 }}
                  >
                    <Chip label={exercise.category} variant="outlined" />
                    <Chip
                      label={formatExerciseUnitLong(exercise.defaultUnit)}
                      variant="outlined"
                      color="primary"
                    />
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <ExerciseEditButton
                    exerciseId={exercise.id}
                    name={exercise.name}
                    category={exercise.category}
                    defaultUnit={exercise.defaultUnit}
                  />
                  <ExerciseDeleteButton
                    exerciseId={exercise.id}
                    exerciseName={exercise.name}
                    searchQuery={searchQuery.trim()}
                  />
                </Stack>
              </Stack>
            </Paper>
          ))}
        </List>
      )}
    </Stack>
  );
}
