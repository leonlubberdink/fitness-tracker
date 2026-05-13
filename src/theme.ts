"use client";

import { alpha, createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: true,
  shape: {
    borderRadius: 8,
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
    },
    h2: {
      fontSize: "1.75rem",
      fontWeight: 620,
      lineHeight: 1.1,
    },
    h3: {
      fontSize: "1.16rem",
      fontWeight: 600,
      lineHeight: 1.25,
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
            "radial-gradient(circle at top, rgba(139, 194, 172, 0.08), transparent 24%), linear-gradient(180deg, #101318 0%, #0f1115 52%, #0c0e12 100%)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(15, 17, 21, 0.88)",
          backgroundImage: "none",
          borderBottom: `1px solid ${alpha("#d7e1e7", 0.06)}`,
          boxShadow: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${alpha("#d7e1e7", 0.06)}`,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 48,
          paddingInline: 18,
        },
        containedPrimary: {
          boxShadow: `0 10px 24px ${alpha("#8bc2ac", 0.14)}`,
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
          borderRadius: 6,
          height: 30,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 10px 28px rgba(0, 0, 0, 0.14)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: alpha("#ffffff", 0.015),
          minHeight: 48,
        },
        notchedOutline: {
          borderColor: alpha("#d7e1e7", 0.1),
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: alpha("#171b21", 0.92),
          minHeight: 60,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 64,
          paddingTop: 8,
          paddingBottom: 8,
          color: alpha("#f3f6f8", 0.52),
        },
      },
    },
  },
});

export default theme;
