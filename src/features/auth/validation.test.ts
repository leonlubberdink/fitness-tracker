import { describe, expect, it } from "vitest";

import { loginSchema } from "@/features/auth/validation";

describe("auth validation", () => {
  it("parses valid login input and trims the email", () => {
    const result = loginSchema.safeParse({
      email: " user@example.com ",
      password: "secret",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      email: "user@example.com",
      password: "secret",
    });
  });

  it("rejects missing or invalid login fields", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const issues = result.error.flatten().fieldErrors;
    expect(issues.email).toContain("Enter a valid email address.");
    expect(issues.password).toContain("Password is required.");
  });
});
