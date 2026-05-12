"use client";

import FitnessCenterRounded from "@mui/icons-material/FitnessCenterRounded";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { usePathname } from "next/navigation";

import NextLink from "./NextLink";

type ActiveWorkoutBannerProps = {
  activeWorkoutHref: string | null;
};

export function ActiveWorkoutBanner({
  activeWorkoutHref,
}: ActiveWorkoutBannerProps) {
  const pathname = usePathname();

  if (!activeWorkoutHref || pathname === activeWorkoutHref) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 1.5,
        borderRadius: "10px",
        px: 1.75,
        py: 1.5,
        bgcolor: alpha("#8bc2ac", 0.08),
        borderColor: alpha("#8bc2ac", 0.18),
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack spacing={0.25} minWidth={0}>
          <Typography variant="overline" color="primary.light">
            Workout in progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Resume the current session from anywhere.
          </Typography>
        </Stack>

        <Button
          component={NextLink}
          href={activeWorkoutHref}
          variant="contained"
          startIcon={<FitnessCenterRounded />}
          sx={{ flexShrink: 0 }}
        >
          Resume
        </Button>
      </Stack>
    </Paper>
  );
}
