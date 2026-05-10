This is a Next.js fitness tracking app.

## Local Development

Run the app locally with the Next.js dev server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing files under `src/`. The page auto-updates as you edit the code.

## Docker Development

If you want the app and database to run in Docker during development, use the dedicated dev stack instead of `pnpm dev`:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Then open [http://localhost:3000](http://localhost:3000).

What this does:

- runs the Next.js dev server inside the `app` container
- bind-mounts the repository into the container so source changes are visible immediately
- keeps container-managed `node_modules` and `.next` in named volumes
- applies pending Drizzle migrations before starting the dev server
- runs PostgreSQL in a sibling `db` container on `localhost:5432`
- uses a separate Docker volume for the development database so it does not share state with the production-style stack
- avoids URL-encoding issues in database passwords by using `PG*` variables inside the container instead of composing `DATABASE_URL`

Useful commands:

```bash
docker compose -f docker-compose.dev.yml up
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml logs -f app
docker compose -f docker-compose.dev.yml exec app sh
```

Notes:

- the dev container runs `pnpm install --frozen-lockfile` on startup so dependency changes are picked up automatically
- the dev container forces `next dev --webpack` because Next.js 16 uses Turbopack by default, and the Docker polling fallback in this stack relies on webpack/watchpack behavior
- `WATCHPACK_POLLING` and `CHOKIDAR_USEPOLLING` are enabled because file watching in Docker on Windows can otherwise miss changes
- if you change `POSTGRES_PASSWORD`, recreate the dev database volume with `docker compose -f docker-compose.dev.yml down -v` because Postgres only applies that password when the data directory is first initialized
- Next.js recommends local development over Docker on Windows or macOS because filesystem performance is slower there, so hot reload may still be less responsive than native development

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
