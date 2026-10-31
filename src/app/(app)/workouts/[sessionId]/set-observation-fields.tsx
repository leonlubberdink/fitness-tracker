"use client";

import { useState } from "react";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import type { RepsBasis, SetType } from "@/lib/training-metadata";

export type SetObservationValues = {
  setType: SetType | null;
  repsBasis: RepsBasis | null;
  rir: number | null;
};

export function SetObservationFields({
  initial,
  onChange,
}: {
  initial: SetObservationValues;
  onChange?: () => void;
}) {
  const [setType, setSetType] = useState(initial.setType ?? "");
  const [rir, setRir] = useState(
    initial.rir === null ? "" : String(initial.rir),
  );
  return (
    <Grid container spacing={1.25} sx={{ mt: 1.5 }} onChange={onChange}>
      <Grid size={{ xs: 6, sm: 4 }}>
        <TextField
          select
          name="setType"
          label="Set type"
          value={setType}
          onChange={(event) => {
            setSetType(event.target.value as SetType);
            setRir("");
            onChange?.();
          }}
          fullWidth
        >
          {initial.setType === null ? (
            <MenuItem value="">Unrecorded</MenuItem>
          ) : null}
          <MenuItem value="working">Working</MenuItem>
          <MenuItem value="warmup">Warm-up</MenuItem>
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
        {setType === "working" ? (
          <>
            <TextField
              name="rir"
              label="RIR (optional)"
              type="number"
              value={rir}
              onChange={(event) => {
                setRir(event.target.value);
                onChange?.();
              }}
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              fullWidth
              helperText="Exact reps remaining. Blank = unrecorded."
            />
            <Button
              type="button"
              size="small"
              onClick={() => {
                setRir("");
                onChange?.();
              }}
            >
              Skip RIR
            </Button>
          </>
        ) : (
          <input type="hidden" name="rir" value="" />
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          select
          name="repsBasis"
          label="Repetition basis"
          defaultValue={initial.repsBasis ?? ""}
          onChange={onChange}
          fullWidth
        >
          <MenuItem value="">Unrecorded</MenuItem>
          <MenuItem value="total">Total</MenuItem>
          <MenuItem value="per_side">Per side</MenuItem>
        </TextField>
      </Grid>
    </Grid>
  );
}
