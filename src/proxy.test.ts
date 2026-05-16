import { beforeEach, describe, expect, it, vi } from "vitest";

const { nextMock, redirectMock } = vi.hoisted(() => ({
  nextMock: vi.fn(() => ({
    type: "next",
  })),
  redirectMock: vi.fn((url: URL) => ({
    type: "redirect",
    url: url.toString(),
  })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: nextMock,
    redirect: redirectMock,
  },
}));

import { proxy } from "@/proxy";

function createRequest(pathname: string, hasSessionCookie = false) {
  return {
    cookies: {
      has: (cookieName: string) =>
        hasSessionCookie && cookieName === "liftlog_session",
    },
    nextUrl: {
      pathname,
    },
    url: `https://example.com${pathname}`,
  };
}

describe("proxy", () => {
  beforeEach(() => {
    nextMock.mockClear();
    redirectMock.mockClear();
  });

  it("redirects unauthenticated users away from protected paths", () => {
    expect(proxy(createRequest("/") as never)).toEqual({
      type: "redirect",
      url: "https://example.com/login",
    });
    expect(proxy(createRequest("/workouts/active") as never)).toEqual({
      type: "redirect",
      url: "https://example.com/login",
    });
  });

  it("allows authenticated protected requests through", () => {
    expect(proxy(createRequest("/history", true) as never)).toEqual({
      type: "next",
    });
    expect(nextMock).toHaveBeenCalledTimes(1);
  });

  it("allows public routes through without a session cookie", () => {
    expect(proxy(createRequest("/login") as never)).toEqual({
      type: "next",
    });
    expect(proxy(createRequest("/about") as never)).toEqual({
      type: "next",
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
