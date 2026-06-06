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

  if (
    !activeWorkoutHref ||
    pathname === "/" ||
    pathname === activeWorkoutHref
  ) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        borderRadius: "10px",
        px: 2,
        py: 1.75,
        bgcolor: alpha("#8bc2ac", 0.08),
        borderColor: alpha("#8bc2ac", 0.18),
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack spacing={0.5} minWidth={0}>
          <Typography variant="overline" color="primary.light">
            Workout in progress
          </Typography>
        </Stack>

        <Button
          component={NextLink}
          href={activeWorkoutHref}
          variant="contained"
          startIcon={<FitnessCenterRounded />}
          sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "auto" } }}
        >
          Resume
        </Button>
      </Stack>
    </Paper>
  );
}
