"use client";

import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import { usePathname } from "next/navigation";

import NextLink from "./NextLink";
import { getPrimaryNavValue, primaryAppNavItems } from "./appNavigation";

export function AppBottomNavigation() {
  const pathname = usePathname();

  return (
    <Box
      sx={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        display: { xs: "flex", md: "none" },
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
          borderRadius: "12px",
          overflow: "hidden",
          borderColor: alpha("#d7e1e7", 0.06),
          pointerEvents: "auto",
          boxShadow: "0 8px 22px rgba(0, 0, 0, 0.2)",
        }}
      >
        <BottomNavigation showLabels value={getPrimaryNavValue(pathname)}>
          {primaryAppNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <BottomNavigationAction
                key={item.value}
                value={item.value}
                label={item.label}
                href={item.href}
                component={NextLink}
                icon={<Icon />}
              />
            );
          })}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
