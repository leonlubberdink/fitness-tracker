# Testing Setup

This repo currently uses five layers of test coverage:

- `pnpm lint`
  ESLint with `eslint-config-next`.
- `pnpm typecheck`
  TypeScript safety via `tsc --noEmit`.
- `pnpm test:unit`
  Vitest for pure logic and validation.
- `pnpm test:component`
  Vitest + React Testing Library for targeted component behavior.
- `pnpm test:e2e`
  Playwright for end-to-end flows.

## Main Commands

Local commands:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:component
pnpm test:e2e
```

There is no single `check` command for E2E. Browser tests are intentionally separate because they are slower and require a database-backed app server.

## E2E Notes

Playwright is configured in [playwright.config.ts](./playwright.config.ts).

Important details:

- E2E runs against a production-style server, not `next dev`.
- Startup is handled by [scripts/start-playwright-server.mjs](./scripts/start-playwright-server.mjs).
- That script:
  - runs runtime DB migrations first
  - builds the app
  - copies `.next/static` into `.next/standalone/.next/static`
  - copies `public/` into `.next/standalone/public`
  - starts the standalone server on `http://127.0.0.1:3100` by default

This matters because the earlier dev/standalone setup could serve HTML without hydrated client assets, which broke Playwright interactions.

## E2E Data

The E2E suite uses a seeded user and resets data between tests.

Relevant files:

- [tests/e2e/support/auth.ts](./tests/e2e/support/auth.ts)
- [tests/e2e/support/data.ts](./tests/e2e/support/data.ts)
- [tests/e2e/auth.setup.ts](./tests/e2e/auth.setup.ts)
- [scripts/seed-user.ts](./scripts/seed-user.ts)
- [scripts/reset-e2e-user-data.ts](./scripts/reset-e2e-user-data.ts)
- [scripts/seed-statistics-demo.ts](./scripts/seed-statistics-demo.ts)

Required env vars for E2E:

- `DATABASE_URL`
- `SESSION_TTL_DAYS`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

`.env` is optional in CI as long as those env vars are already present in the job environment.

## CI

GitHub Actions are defined in [quality.yml](./.github/workflows/quality.yml).

Current behavior:

- `Lint`, `Typecheck`, `Unit Tests`, and `Component Tests` run on pull requests only.
- `E2E Tests` runs on pull requests and on pushes to `master`.

## Guidance For Future Changes

When changing tests or test infrastructure:

- prefer unit tests for pure logic
- prefer component tests only for meaningful UI behavior
- keep E2E focused on critical user flows
- do not switch Playwright back to `next dev` without revalidating hydration behavior
- if E2E startup changes, preserve the migration step and static asset copy step

When referring back to the current setup in future tasks, use this file as the source of truth.
