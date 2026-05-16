"use client";

import PsychologyRounded from "@mui/icons-material/PsychologyRounded";
import Fab from "@mui/material/Fab";
import Box from "@mui/material/Box";
import { usePathname } from "next/navigation";

import NextLink from "./NextLink";

export function HealthCoachLauncher() {
  const pathname = usePathname();

  if (pathname.startsWith("/health-coach")) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 16, md: 28 },
        bottom: {
          xs: "calc(92px + env(safe-area-inset-bottom))",
          md: 28,
        },
        zIndex: (theme) => theme.zIndex.appBar + 1,
      }}
    >
      <Fab
        component={NextLink}
        href="/health-coach/chat"
        variant="extended"
        color="primary"
      >
        <PsychologyRounded sx={{ mr: 1 }} />
        Coach
      </Fab>
    </Box>
  );
}
