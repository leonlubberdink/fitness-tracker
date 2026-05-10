"use client";

import HomeRounded from "@mui/icons-material/HomeRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import FitnessCenterRounded from "@mui/icons-material/FitnessCenterRounded";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import { usePathname } from "next/navigation";

import NextLink from "./NextLink";

type AppBottomNavigationProps = {
  workoutHref: string;
};

function getNavValue(pathname: string) {
  if (pathname.startsWith("/workouts/")) {
    return "workout";
  }

  if (pathname.startsWith("/exercises")) {
    return "exercises";
  }

  if (pathname.startsWith("/history")) {
    return "history";
  }

  return "home";
}

export function AppBottomNavigation({
  workoutHref,
}: AppBottomNavigationProps) {
  const pathname = usePathname();

  return (
    <Box
      sx={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        pb: "max(12px, env(safe-area-inset-bottom))",
        pointerEvents: "none",
        zIndex: (currentTheme) => currentTheme.zIndex.appBar,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "min(calc(100% - 24px), 420px)",
          borderRadius: 999,
          overflow: "hidden",
          borderColor: alpha("#d7e1e7", 0.08),
          pointerEvents: "auto",
          boxShadow: "0 22px 50px rgba(0, 0, 0, 0.35)",
        }}
      >
        <BottomNavigation showLabels value={getNavValue(pathname)}>
          <BottomNavigationAction
            value="home"
            label="Today"
            href="/"
            component={NextLink}
            icon={<HomeRounded />}
          />
          <BottomNavigationAction
            value="workout"
            label="Workout"
            href={workoutHref}
            component={NextLink}
            icon={<FitnessCenterRounded />}
          />
          <BottomNavigationAction
            value="exercises"
            label="Exercises"
            href="/exercises"
            component={NextLink}
            icon={<LibraryBooksRounded />}
          />
          <BottomNavigationAction
            value="history"
            label="History"
            href="/history"
            component={NextLink}
            icon={<HistoryRounded />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
