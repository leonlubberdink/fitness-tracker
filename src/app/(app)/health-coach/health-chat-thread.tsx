"use client";

import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef } from "react";

type Citation = {
  endIndex: number;
  startIndex: number;
  title: string | null;
  url: string;
};

type ChatMessage = {
  citations: Citation[];
  content: string;
  id: string;
  role: "assistant" | "user";
  timestampLabel: string;
};

type HealthChatThreadProps = {
  messages: ChatMessage[];
};

function getMessageTextWithCitationMarkers(
  content: string,
  citations: Citation[] | null | undefined,
) {
  if (!citations || citations.length === 0) {
    return content;
  }

  const sortedCitations = [...citations].sort(
    (left, right) => left.endIndex - right.endIndex,
  );
  let result = "";
  let cursor = 0;

  for (const [index, citation] of sortedCitations.entries()) {
    const safeEndIndex = Math.max(
      cursor,
      Math.min(content.length, citation.endIndex),
    );
    result += content.slice(cursor, safeEndIndex);
    result += ` [${index + 1}]`;
    cursor = safeEndIndex;
  }

  result += content.slice(cursor);
  return result;
}

export function HealthChatThread({ messages }: HealthChatThreadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: "8px",
          px: 2,
          py: 2.5,
          bgcolor: "rgba(255,255,255,0.02)",
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant="h3" sx={{ fontSize: "1rem" }}>
            No conversation yet.
          </Typography>
          <Typography color="text.secondary">
            Try asking about your current plan, a recent workout, or how to
            structure a new template for one of your goals.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack
      ref={containerRef}
      spacing={1.5}
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        pr: 0.5,
      }}
    >
      {messages.map((message) => (
        <Paper
          key={message.id}
          elevation={0}
          sx={{
            alignSelf: message.role === "user" ? "flex-end" : "stretch",
            borderRadius: "16px",
            borderTopRightRadius: message.role === "user" ? "4px" : "16px",
            borderTopLeftRadius: message.role === "assistant" ? "4px" : "16px",
            maxWidth: { xs: "92%", md: "80%" },
            px: 2,
            py: 1.75,
            bgcolor:
              message.role === "user"
                ? "rgba(139,194,172,0.14)"
                : "rgba(255,255,255,0.04)",
            borderColor:
              message.role === "user"
                ? "rgba(139,194,172,0.24)"
                : "rgba(255,255,255,0.08)",
          }}
        >
          <Stack spacing={1}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="overline" color="text.secondary">
                {message.role === "user" ? "You" : "Health coach"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {message.timestampLabel}
              </Typography>
            </Stack>

            <Typography sx={{ whiteSpace: "pre-wrap" }}>
              {getMessageTextWithCitationMarkers(message.content, message.citations)}
            </Typography>

            {message.citations.length > 0 ? (
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Sources
                </Typography>
                {message.citations.map((citation, index) => (
                  <Link
                    key={`${message.id}:${citation.url}:${index}`}
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                    color="primary.light"
                    sx={{ wordBreak: "break-word" }}
                  >
                    [{index + 1}] {citation.title ?? citation.url}
                  </Link>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
