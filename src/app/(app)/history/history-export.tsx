"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DownloadRounded from "@mui/icons-material/DownloadRounded";

export function HistoryExport() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"all" | "range" | null>(null);
  async function download(scope: "all" | "range") {
    setError(null);
    if (scope === "range" && (!start || !end || start > end)) {
      setError("Choose a start and end date, with start on or before end.");
      return;
    }
    setBusy(scope);
    try {
      const params =
        scope === "range"
          ? new URLSearchParams({ start, end })
          : new URLSearchParams();
      const response = await fetch(`/api/workouts/export?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error ?? "Could not export history. Try again.",
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        scope === "all"
          ? "workout-history-all.json"
          : `workout-history-${start}-${end}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not export history.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Download every stored workout and set, including history beyond the
        displayed list. Date ranges include both boundary dates.
      </Typography>
      <Button
        variant="outlined"
        startIcon={<DownloadRounded />}
        loading={busy === "all"}
        disabled={busy !== null}
        onClick={() => download("all")}
      >
        Export all history (JSON)
      </Button>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          label="From"
          type="date"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
        <TextField
          label="Through"
          type="date"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
        <Button
          variant="outlined"
          loading={busy === "range"}
          disabled={busy !== null}
          onClick={() => download("range")}
          sx={{ flexShrink: 0 }}
        >
          Export date range
        </Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}
