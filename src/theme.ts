"use client";

import { alpha, createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: true,
  shape: {
    borderRadius: 10,
  },
  spacing: 4,
  palette: {
    mode: "dark",
    primary: {
      main: "#8bc2ac",
      light: "#b8ddcf",
      dark: "#5e907b",
      contrastText: "#08110d",
    },
    secondary: {
      main: "#98a8d8",
      light: "#c5d0f0",
      dark: "#6b7cad",
      contrastText: "#0c0f17",
    },
    background: {
      default: "#0f1115",
      paper: "#161a20",
    },
    divider: alpha("#d7e1e7", 0.1),
    text: {
      primary: "#f3f6f8",
      secondary: alpha("#f3f6f8", 0.68),
    },
    success: {
      main: "#78c8a1",
    },
    warning: {
      main: "#e6c37b",
    },
    error: {
      main: "#ff8f8f",
    },
  },
  typography: {
    fontFamily:
      'var(--font-roboto-flex), "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: {
      fontSize: "2.375rem",
      fontWeight: 650,
      lineHeight: 1.05,
      letterSpacing: "-0.04em",
    },
    h2: {
      fontSize: "1.75rem",
      fontWeight: 620,
      lineHeight: 1.1,
      letterSpacing: "-0.03em",
    },
    h3: {
      fontSize: "1.2rem",
      fontWeight: 600,
      lineHeight: 1.2,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.65,
    },
    body2: {
      fontSize: "0.95rem",
      lineHeight: 1.6,
    },
    button: {
      fontSize: "0.95rem",
      fontWeight: 600,
      letterSpacing: "0.01em",
      textTransform: "none",
    },
    caption: {
      fontSize: "0.78rem",
      lineHeight: 1.4,
      letterSpacing: "0.01em",
    },
    overline: {
      fontSize: "0.72rem",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#0f1115",
          backgroundImage:
            "radial-gradient(circle at top, rgba(139, 194, 172, 0.12), transparent 30%), linear-gradient(180deg, #101318 0%, #0f1115 46%, #0b0d11 100%)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(18px)",
          backgroundColor: "rgba(15, 17, 21, 0.82)",
          backgroundImage: "none",
          borderBottom: `1px solid ${alpha("#d7e1e7", 0.08)}`,
          boxShadow: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.022), rgba(255,255,255,0))",
          border: `1px solid ${alpha("#d7e1e7", 0.08)}`,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 48,
          paddingInline: 18,
        },
        containedPrimary: {
          boxShadow: `0 18px 36px ${alpha("#8bc2ac", 0.18)}`,
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.18)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: alpha("#ffffff", 0.02),
        },
        notchedOutline: {
          borderColor: alpha("#d7e1e7", 0.12),
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: alpha("#171b21", 0.92),
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 64,
          color: alpha("#f3f6f8", 0.52),
        },
      },
    },
  },
});

export default theme;
