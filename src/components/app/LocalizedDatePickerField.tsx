"use client";

import { type ChangeEvent, useState } from "react";

import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

import { formatDateForLocale } from "@/lib/date";

type LocalizedDatePickerFieldProps = {
  defaultValue: string;
  helperText?: string;
  label: string;
  locale?: string;
  name: string;
  required?: boolean;
};

const DISPLAY_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

export function LocalizedDatePickerField({
  defaultValue,
  helperText,
  label,
  locale = "de-DE",
  name,
  required = false,
}: LocalizedDatePickerFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        label={label}
        value={value ? formatDateForLocale(value, locale, DISPLAY_FORMAT) : ""}
        helperText={helperText}
        focused={isFocused}
        fullWidth
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <CalendarMonthRounded color="action" />
              </InputAdornment>
            ),
          },
          htmlInput: {
            "aria-hidden": true,
            tabIndex: -1,
          },
        }}
        sx={{
          "& .MuiInputBase-input": {
            cursor: "pointer",
          },
        }}
      />
      <Box
        component="input"
        aria-label={label}
        name={name}
        onBlur={() => setIsFocused(false)}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
        onFocus={() => setIsFocused(true)}
        required={required}
        sx={{
          cursor: "pointer",
          height: "100%",
          inset: 0,
          opacity: 0,
          position: "absolute",
          width: "100%",
          "&::-webkit-calendar-picker-indicator": {
            cursor: "pointer",
            height: "100%",
            inset: 0,
            position: "absolute",
            width: "100%",
          },
        }}
        type="date"
        value={value}
      />
    </Box>
  );
}
