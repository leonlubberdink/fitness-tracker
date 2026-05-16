import { mkdirSync } from "node:fs";
import path from "node:path";

import { test as setup } from "@playwright/test";

import { getE2ECredentials, loginAsE2EUser, seedE2EUser } from "./support/auth";

const authFile = path.resolve(process.cwd(), "playwright/.auth/user.json");

setup("authenticate seeded user", async ({ page }) => {
  const credentials = getE2ECredentials();
  seedE2EUser(credentials);
  await loginAsE2EUser(page, credentials);
  mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
