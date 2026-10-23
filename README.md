# Wedding Picture Uploader

A TanStack Start application using React, TypeScript, TanStack Router, TanStack Query, Tailwind CSS, PostgreSQL, Drizzle ORM, and UploadThing.

Guests continue to enter their first name, which is matched against the existing guest list without regard to case. The existing `guest` localStorage entry remembers their login. Clerk is not used. The guest and `guest-image` tables and the `/api/guest/validate`, `/api/images`, and `/api/uploadthing` endpoints are preserved.

## Local development

Use Bun **1.4.2**, matching `.bun-version`, CI, and the Dockerfile.

```sh
bun install --frozen-lockfile
cp .env.example .env
# Set DATABASE_URL to the existing PostgreSQL database.
# Set UPLOADTHING_TOKEN to the existing UploadThing token.
bun run dev
```

Open http://localhost:3000. Database credentials and the UploadThing token stay on the server. `NEXT_PUBLIC_UT_APP_ID` is no longer needed; the upload component reads its configuration from `/api/uploadthing`. Keep that endpoint reachable for UploadThing callbacks.

## Database migrations

The schema is in `src/server/db/schema.ts`. No guest or photo columns were changed during the framework migration.

For a **new, empty database**:

```sh
bun run db:migrate
```

For an **existing database created with the old `db:push` command**, adopt the initial migration once before running migrations:

```sh
bun run db:baseline
bun run db:migrate
```

The baseline command verifies the existing columns, primary keys, and guest foreign key, then records the initial migration in Drizzle's migration journal. It preserves guest and photo rows and refuses a schema mismatch or conflicting migration history. Use a database backup and resolve any reported mismatch before proceeding. Run it only against the original schema; an installation that already uses migrations does not need baselining.

For subsequent schema changes:

```sh
bun run db:generate --name describe_the_change
# Review and commit the generated SQL and metadata in drizzle/.
bun run db:migrate
```

## Build and run

```sh
bun run build
bun run start
```

The build does not require application secrets. At runtime, set `DATABASE_URL` and `UPLOADTHING_TOKEN`. The Bun server serves `dist/client` assets and the TanStack Start server bundle. `HOST` defaults to `0.0.0.0` and `PORT` defaults to `3000`.

For Docker:

```sh
docker build -t wedding-picture-uploader .
docker run --rm -p 3000:3000 --env-file .env wedding-picture-uploader
```

Run database baselining/migrations once from a checkout with development dependencies before deploying the new application image. Startup does not change the database. Keep using the existing PostgreSQL infrastructure and UploadThing storage.

## Verification

```sh
bun run check
bun run build
```

Database and browser tests require an explicitly configured **disposable local database whose name ends in `_test`**. Migration tests reset its `public` and `drizzle` schemas. Never use a database containing real guest data. For example:

```sh
docker run --detach --rm --name wedding-uploader-tests \
  -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=wedding_test \
  -p 127.0.0.1:55463:5432 postgres:18.6-alpine
export TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55463/wedding_test
bun run test:db
bunx --no-install playwright install chromium
bun run test:e2e
docker stop wedding-uploader-tests
```

The database tests cover migration adoption, data preservation, and refusing schema drift. The Playwright suite builds and starts the production application on port 3190 and checks desktop and mobile layouts, guest login and persistence, gallery navigation, uploads, and failure paths against real PostgreSQL. It creates and removes only its own fixture guest and photos. The external UploadThing signing/storage boundary is stubbed, so these tests do not verify live UploadThing uploads or callback delivery; those require a configured UploadThing app and token.

CI runs the same checks with Bun 1.4.2 and PostgreSQL. Browser reports are in `playwright-report/`; traces and screenshots are in `.artifacts/tanstack-migration/test-results/`.
