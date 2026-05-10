import BoltRounded from "@mui/icons-material/BoltRounded";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { redirectIfAuthenticated } from "@/features/auth/session";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login",
};

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        py: 4,
      }}
    >
      <Container maxWidth="sm" sx={{ px: 2 }}>
        <Stack spacing={3}>
          <Stack spacing={1.5}>
            <Chip
              icon={<BoltRounded />}
              label="Seeded account access"
              color="primary"
              variant="outlined"
              sx={{ alignSelf: "flex-start" }}
            />
            <Stack spacing={1}>
              <Typography variant="h1">Focused logging, no noise.</Typography>
              <Typography color="text.secondary" sx={{ maxWidth: "36ch" }}>
                Sign in to the workout logger and keep the session flow ready
                for the next set.
              </Typography>
            </Stack>
          </Stack>

          <Paper
            component="section"
            elevation={0}
            sx={{
              borderRadius: "14px",
              px: 3,
              py: 3.5,
            }}
          >
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography variant="h2">Sign in</Typography>
                <Typography color="text.secondary">
                  Use your seeded email and password to enter the protected app.
                </Typography>
              </Stack>

              <LoginForm />
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
