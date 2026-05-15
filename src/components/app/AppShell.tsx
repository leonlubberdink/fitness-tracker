import LogoutRounded from "@mui/icons-material/LogoutRounded";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";

import { logoutAction } from "@/features/auth/actions";

import { ActiveWorkoutBanner } from "./ActiveWorkoutBanner";
import { AppBottomNavigation } from "./AppBottomNavigation";
import { AppDesktopNavigation } from "./AppDesktopNavigation";
import { FormStatusIconButton } from "./FormStatusButtons";
import { UserTimeZoneSync } from "./UserTimeZoneSync";

type AppShellProps = {
  children: ReactNode;
  email: string;
  activeWorkoutHref: string | null;
  userTimeZone: string;
};

function getInitials(email: string) {
  const [localPart] = email.split("@");
  return localPart.slice(0, 2).toUpperCase();
}

export function AppShell({
  children,
  email,
  activeWorkoutHref,
  userTimeZone,
}: AppShellProps) {
  return (
    <Box sx={{ minHeight: "100dvh", color: "text.primary" }}>
      <UserTimeZoneSync initialTimeZone={userTimeZone} />

      <AppBar position="sticky" elevation={0}>
        <Container
          maxWidth={false}
          sx={{
            px: { xs: 2, md: 3 },
            width: "100%",
            maxWidth: { xs: 600, md: 1280 },
            mx: "auto",
          }}
        >
          <Toolbar
            disableGutters
            sx={{
              minHeight: 76,
              gap: 1.5,
              pt: "max(6px, env(safe-area-inset-top))",
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" flexGrow={1}>
              <Avatar
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: alpha("#8bc2ac", 0.16),
                  color: "primary.light",
                  fontWeight: 700,
                }}
              >
                {getInitials(email)}
              </Avatar>
              <Stack spacing={0.25} minWidth={0}>
                <Typography variant="h3" sx={{ fontSize: "1.1rem" }}>
                  Lift Log
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {email}
                </Typography>
              </Stack>
            </Stack>

            <form action={logoutAction}>
              <FormStatusIconButton
                type="submit"
                aria-label="Log out"
                sx={{
                  border: `1px solid ${alpha("#d7e1e7", 0.08)}`,
                  bgcolor: alpha("#ffffff", 0.02),
                  borderRadius: "10px",
                }}
              >
                <LogoutRounded />
              </FormStatusIconButton>
            </form>
          </Toolbar>
          <AppDesktopNavigation />
        </Container>
      </AppBar>

      <Container
        maxWidth={false}
        sx={{
          px: { xs: 2, md: 3 },
          width: "100%",
          maxWidth: { xs: 600, md: 1280 },
          mx: "auto",
        }}
      >
        <ActiveWorkoutBanner activeWorkoutHref={activeWorkoutHref} />
      </Container>

      <Container
        maxWidth={false}
        component="main"
        sx={{
          px: { xs: 2, md: 3 },
          pt: { xs: 3, md: 4 },
          pb: { xs: "calc(112px + env(safe-area-inset-bottom))", md: 5 },
          width: "100%",
          maxWidth: { xs: 600, md: 1280 },
          mx: "auto",
        }}
      >
        {children}
      </Container>

      <AppBottomNavigation />
    </Box>
  );
}
