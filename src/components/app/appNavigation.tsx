import FitnessCenterRounded from "@mui/icons-material/FitnessCenterRounded";
import EventNoteRounded from "@mui/icons-material/EventNoteRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import PsychologyRounded from "@mui/icons-material/PsychologyRounded";

export type AppNavItem = {
  value: string;
  label: string;
  desktopLabel?: string;
  href: string;
  icon: typeof HomeRounded;
  matches: (pathname: string) => boolean;
};

export const primaryAppNavItems: AppNavItem[] = [
  {
    value: "home",
    label: "Today",
    href: "/",
    icon: HomeRounded,
    matches: (pathname) => pathname === "/",
  },
  {
    value: "plans",
    label: "Plans",
    href: "/plans",
    icon: EventNoteRounded,
    matches: (pathname) => pathname.startsWith("/plans"),
  },
  {
    value: "workouts",
    label: "Workouts",
    href: "/workouts",
    icon: FitnessCenterRounded,
    matches: (pathname) => pathname.startsWith("/workouts"),
  },
  {
    value: "exercises",
    label: "Exercises",
    href: "/exercises",
    icon: LibraryBooksRounded,
    matches: (pathname) => pathname.startsWith("/exercises"),
  },
  {
    value: "statistics",
    label: "Stats",
    desktopLabel: "Statistics",
    href: "/statistics",
    icon: InsightsRounded,
    matches: (pathname) => pathname.startsWith("/statistics"),
  },
  {
    value: "health-coach",
    label: "Coach",
    desktopLabel: "Health coach",
    href: "/health-coach",
    icon: PsychologyRounded,
    matches: (pathname) => pathname.startsWith("/health-coach"),
  },
  {
    value: "history",
    label: "History",
    href: "/history",
    icon: HistoryRounded,
    matches: (pathname) => pathname.startsWith("/history"),
  },
];

export function getPrimaryNavValue(pathname: string) {
  return (
    primaryAppNavItems.find((item) => item.matches(pathname))?.value ?? "home"
  );
}
