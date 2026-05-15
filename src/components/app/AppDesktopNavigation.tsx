"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { usePathname } from "next/navigation";

import NextLink from "./NextLink";
import { getPrimaryNavValue, primaryAppNavItems } from "./appNavigation";

export function AppDesktopNavigation() {
  const pathname = usePathname();
  const activeValue = getPrimaryNavValue(pathname);

  return (
    <Box sx={{ display: { xs: "none", md: "block" }, pb: 1.5 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {primaryAppNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.value === activeValue;

          return (
            <Box
              key={item.value}
              component={NextLink}
              href={item.href}
              aria-current={active ? "page" : undefined}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                minHeight: 44,
                px: 1.75,
                borderRadius: "10px",
                textDecoration: "none",
                color: active ? "primary.light" : "text.secondary",
                bgcolor: active
                  ? alpha("#8bc2ac", 0.14)
                  : alpha("#ffffff", 0.02),
                border: "1px solid",
                borderColor: active
                  ? alpha("#8bc2ac", 0.22)
                  : alpha("#d7e1e7", 0.08),
                transition:
                  "background-color 180ms ease, border-color 180ms ease, color 180ms ease",
                "&:hover": {
                  color: "text.primary",
                  bgcolor: active
                    ? alpha("#8bc2ac", 0.18)
                    : alpha("#ffffff", 0.04),
                },
                "&:focus-visible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: "2px",
                },
              }}
            >
              <Icon fontSize="small" />
              <Typography variant="button" component="span" sx={{ color: "inherit" }}>
                {item.desktopLabel ?? item.label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
