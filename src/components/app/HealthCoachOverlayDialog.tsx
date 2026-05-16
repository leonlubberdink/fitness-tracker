"use client";

import CloseRounded from "@mui/icons-material/CloseRounded";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type HealthCoachOverlayDialogProps = {
  children: ReactNode;
};

export function HealthCoachOverlayDialog({
  children,
}: HealthCoachOverlayDialogProps) {
  const router = useRouter();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  function handleClose() {
    router.back();
  }

  return (
    <Dialog
      open
      onClose={handleClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      PaperProps={{
        sx: {
          height: {
            xs: "100dvh",
            md: "min(900px, calc(100dvh - 48px))",
          },
        },
      }}
    >
      <DialogTitle sx={{ pr: 7 }}>Health coach chat</DialogTitle>
      <IconButton
        aria-label="Close coach chat"
        onClick={handleClose}
        sx={{
          position: "absolute",
          right: 12,
          top: 12,
        }}
      >
        <CloseRounded />
      </IconButton>
      <DialogContent
        dividers
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
