# Fitness App Implementation Plan

## Executive Summary

- Repo state: `d:\Projects\Coding\fitness-app` is empty and not a Git repo, so this is a true greenfield build.
- Recommended v1 stack: `Next.js` App Router, `TypeScript`, `Material UI`, `Drizzle ORM` + `drizzle-kit`, `PostgreSQL`, `Zod`, `pg`, and a small custom credentials auth layer using `Argon2id` password hashes plus database-backed opaque sessions.
- Main architectural choice: use Server Components for reads, Server Actions for writes, and keep Route Handlers minimal. This matches current Next.js patterns and keeps the codebase clean and low-ops.
- General auth frameworks are intentionally deferred for v1 because seeded-user-only email/password auth is narrower than Better Auth/Auth.js are built for; a small custom auth layer is simpler to host, easier to reason about, and avoids unnecessary tables and flows.

## Full Implementation Plan

- Stack choices: `pnpm`, `Next.js` App Router, strict `TypeScript`, `Material UI`, `Drizzle ORM`, `drizzle-kit`, `pg`, `Zod`, `@node-rs/argon2`, and a small app-specific component layer on top of the Material UI system.
- Rendering model: protected app pages are Server Components; forms and interactive logging widgets use Client Components only where needed; writes happen through Server Actions with `revalidatePath`.
- Folder structure: `src/app` for routes/layouts, `src/features/auth|exercises|workouts|history` for domain logic, `src/components/ui` for shared primitives, `src/db/schema` for table definitions, `src/db/client.ts` for the DB client, `scripts` for seed/ops scripts, `drizzle/` for generated SQL migrations.
- Route groups: `(public)` for `/login`, `(app)` for authenticated pages and shared mobile navigation.
- Auth approach: no signup route, no password reset, no magic links. Users only come from seed/admin scripts. Login verifies `email + password`, creates a random opaque session token, stores only its SHA-256 hash in Postgres, and sets an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Auth guard: `middleware.ts` only checks whether the session cookie exists for fast redirects; real auth validation happens server-side in the protected layout and in every mutating Server Action.
- Password policy: hash with Argon2id, store only `password_hash`, return generic login errors, and add lightweight rate limiting on login attempts.
- Data model `users`: `id uuid pk`, `email text not null`, `password_hash text not null`, `is_active boolean default true`, `last_login_at timestamptz null`, `created_at`, `updated_at`; unique index on `lower(email)`.
- Data model `sessions`: `id uuid pk`, `user_id uuid fk users.id`, `token_hash text unique not null`, `expires_at timestamptz not null`, `last_seen_at timestamptz not null`, `created_at`; index on `(user_id, expires_at)`.
- Data model `exercises`: `id uuid pk`, `user_id uuid fk users.id`, `name text not null`, `category text not null`, `default_unit enum('kg','bodyweight') not null`, `created_at`, `updated_at`; unique index on `(user_id, lower(name))`.
- Exercise search index: enable `pg_trgm` and create a GIN trigram index on `exercises.name` for fast substring search; fallback is plain `ILIKE` if extension support becomes an issue.
- Data model `workout_sessions`: `id uuid pk`, `user_id uuid fk users.id`, `performed_on date not null`, `started_at timestamptz not null default now()`, `completed_at timestamptz null`, `created_at`, `updated_at`; index on `(user_id, performed_on desc, started_at desc)` and partial unique index allowing only one open session per user where `completed_at is null`.
- Data model `workout_exercise_entries`: `id uuid pk`, `workout_session_id uuid fk workout_sessions.id`, `exercise_id uuid fk exercises.id`, `exercise_name_snapshot text not null`, `exercise_category_snapshot text not null`, `unit_snapshot enum('kg','bodyweight') not null`, `sort_order int not null`, `created_at`; unique index on `(workout_session_id, sort_order)`.
- Data model `workout_sets`: `id uuid pk`, `workout_exercise_entry_id uuid fk workout_exercise_entries.id`, `set_number int not null`, `reps int not null`, `weight numeric(6,2) not null default 0`, `created_at`; unique index on `(workout_exercise_entry_id, set_number)` plus checks `reps > 0` and `weight >= 0`.
- Snapshot rationale: entries store exercise name/category/unit snapshots so history stays correct if you later rename an exercise or change its default unit.
- Migration strategy: Drizzle schema lives in TypeScript, `drizzle-kit` generates SQL migrations into `drizzle/`, migrations are committed to the repo, and production uses forward-only migrations.
- Seed strategy: one script to create or update seeded users from CLI arguments, for example `pnpm users:seed --email ... --password ...`; no app runtime auto-signup. This keeps plaintext passwords out of the repo and avoids accidental reseeding on every deploy.
- Core pages: `/login`, `/` as “today/home”, `/exercises`, `/workouts/[sessionId]`, and `/history`.
- Home page design: if an open session exists, show “Continue workout”; otherwise show “Start workout” defaulting to today’s date. Keep this page intentionally sparse for fast logging.
- Exercises page design: searchable list plus a compact create form with `name`, `category`, and `default_unit`. Editing can wait unless it proves necessary during implementation.
- Workout logging page design: session header with date and finish button; exercise entries rendered in order; each entry shows exercise name and a compact editable sets table; add/remove set and remove exercise entry actions are in-line and mobile-first.
- Logging flow: create session, add existing exercise from a searchable picker, auto-create first set row, then edit reps and weight quickly without page navigation.
- Search approach: a debounced read-only `GET /api/exercises/search?q=` route returns the top matching reusable exercises for the in-workout picker; write operations remain Server Actions.
- Core Server Actions: `loginAction`, `logoutAction`, `createExerciseAction`, `createWorkoutSessionAction`, `addExerciseEntryAction`, `removeExerciseEntryAction`, `addSetAction`, `updateSetAction`, `removeSetAction`, `completeWorkoutSessionAction`.
- Query boundaries: read queries stay in feature-level query modules; pages call those server-side directly; only interactive client-side search gets a JSON route.
- History page design: list sessions grouped by `performed_on` descending, render each session as an expandable card, and show exercise entries with set details when expanded. Summary line shows date, start time, number of exercises, and total sets.
- Pagination strategy: start with the most recent 30-50 sessions; add cursor-based “Load more” only if needed. The schema does not need to change later.
- Validation strategy: Zod validates every action input; Drizzle types cover DB access; DB constraints enforce positivity, uniqueness, and ownership-related FK integrity; every write re-checks that the session/exercise belongs to the authenticated user.
- Docker Compose design: two services, `app` and `db`. `db` uses a named volume and is not exposed publicly. `app` builds a standalone Next.js image and listens on `127.0.0.1:3000`, intended to sit behind Caddy or Nginx for TLS.
- Container design: multi-stage Docker build, production Node image, non-root runtime user, `app` startup command runs migrations before starting the server because this is a single-instance VPS deployment.
- Environment variables: `DATABASE_URL`, `APP_URL`, `NODE_ENV`, `PORT`, and optional `SESSION_TTL_DAYS`. No public signup or email provider env vars are needed in v1.
- Security considerations: HTTPS only in production, secure cookies, DB not public, Argon2id password hashing, generic auth errors, login throttling, server-side ownership checks, and origin-safe writes via Server Actions.
- Scope control: no notes, charts, templates, nutrition, photos, measurements, invites, or public account flows in v1. The schema leaves room for those later without needing a rewrite.

## Milestones With Validation

- Milestone 1: scaffold the app, set up `pnpm`, Next.js, Material UI, TypeScript, base layouts, env handling, and Docker skeleton. Validate with `pnpm lint`, `pnpm typecheck`, and a running `/login` page.
- Milestone 2: implement Postgres + Drizzle, migrations, `users` and `sessions`, seed script, login/logout, and protected layout flow. Validate by migrating a fresh DB, seeding a user, successful login/logout, and redirecting unauthenticated access.
- Milestone 3: implement exercise management and search. Validate by creating exercises, blocking duplicate names for the same user, and confirming partial-name search returns expected results.
- Milestone 4: implement workout session creation and the in-progress logging page. Validate by starting a session, adding exercises, adding/updating/removing sets, and enforcing only one open session at a time.
- Milestone 5: implement session completion and history by date with expandable details. Validate by finishing sessions, confirming correct reverse-chronological ordering, and checking expanded exercise/set details against the DB.
- Milestone 6: harden deployment and ops flow. Validate with `docker compose up --build` on a clean machine, persisted DB data after restart, and successful restart with migrations already applied.

## Assumptions And Open Questions

- Assumption: this is a greenfield app with no existing conventions to preserve.
- Assumption: single-user oriented means one primary account now, but the schema will still support multiple seeded users cleanly.
- Assumption: workouts may occur multiple times on the same date, so sessions are not unique per day.
- Assumption: `category` will be free text with suggested presets rather than a hard DB enum, because that is more flexible for a personal app.
- Assumption: for `bodyweight` exercises, v1 stores `weight = 0` and displays `BW`; weighted or assisted variations can be separate exercises or a later enhancement.
- Tradeoff: custom auth is intentionally smaller than a general auth framework, but it means we own a small amount of security-sensitive code. That is the right trade for this scope.
- Tradeoff: `pg_trgm` is one extra Postgres extension, but it buys a much better exercise search experience with little operational cost.
- Open question, not blocking: if you already know you want editing completed sessions in v1, include it during Phase 2; otherwise optimize for create/log/history first.
