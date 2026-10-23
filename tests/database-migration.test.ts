import { afterAll, beforeEach, expect, test } from 'bun:test'
import postgres from 'postgres'

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl)
  throw new Error(
    'TEST_DATABASE_URL must point to a disposable local database ending in _test'
  )
const target = new URL(databaseUrl)
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  !target.pathname.endsWith('_test')
) {
  throw new Error(
    'Database migration tests require a disposable local database ending in _test'
  )
}
const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} })

async function runScript(script: string) {
  const child = Bun.spawn(['bun', 'run', script], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ])
  return { exitCode, output: stdout + stderr }
}

beforeEach(async () => {
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`
  await sql`DROP SCHEMA public CASCADE`
  await sql`CREATE SCHEMA public`
  // Independent fixture matching the original app's db:push schema.
  await sql`CREATE TABLE guest (id uuid PRIMARY KEY, forename varchar NOT NULL)`
  await sql`CREATE TABLE "guest-image" (
    id uuid PRIMARY KEY, key varchar(256) NOT NULL,
    "guestId" uuid NOT NULL REFERENCES guest(id) ON DELETE CASCADE
  )`
  await sql`INSERT INTO guest VALUES ('00000000-0000-4000-8000-000000000001', 'Migration Guest')`
  await sql`INSERT INTO "guest-image" VALUES (
    '00000000-0000-4000-8000-000000000002', 'https://example.com/photo.jpg',
    '00000000-0000-4000-8000-000000000001'
  )`
})

afterAll(async () => {
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`
  await sql`DROP SCHEMA public CASCADE`
  await sql`CREATE SCHEMA public`
  await sql.end()
})

test('existing guests and photos survive adopting migrations and repeated migrate runs', async () => {
  const baseline = await runScript('db:baseline')
  expect(baseline.exitCode, baseline.output).toBe(0)
  const repeatedBaseline = await runScript('db:baseline')
  expect(repeatedBaseline.exitCode, repeatedBaseline.output).toBe(0)
  for (let attempt = 0; attempt < 2; attempt++) {
    const migrated = await runScript('db:migrate')
    expect(migrated.exitCode, migrated.output).toBe(0)
  }
  expect(Array.from(await sql`SELECT forename FROM guest`)).toEqual([
    { forename: 'Migration Guest' }
  ])
  expect(Array.from(await sql`SELECT key FROM "guest-image"`)).toEqual([
    { key: 'https://example.com/photo.jpg' }
  ])
  expect(
    Array.from(
      await sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`
    )
  ).toEqual([{ count: 1 }])
})

test('a database with incompatible image columns cannot be marked as migrated', async () => {
  await sql`ALTER TABLE "guest-image" ALTER COLUMN key TYPE varchar(32)`
  const baseline = await runScript('db:baseline')
  expect(baseline.exitCode).not.toBe(0)
  expect(baseline.output).toContain('does not match')
  expect(
    Array.from(
      await sql`SELECT to_regclass('drizzle.__drizzle_migrations') AS table_name`
    )
  ).toEqual([{ table_name: null }])
  expect(Array.from(await sql`SELECT forename FROM guest`)).toEqual([
    { forename: 'Migration Guest' }
  ])
})

test('a database missing the guest relationship cannot be marked as migrated', async () => {
  await sql`ALTER TABLE "guest-image" DROP CONSTRAINT "guest-image_guestId_fkey"`
  const baseline = await runScript('db:baseline')
  expect(baseline.exitCode).not.toBe(0)
  expect(baseline.output).toContain('does not match')
  expect(
    Array.from(
      await sql`SELECT to_regclass('drizzle.__drizzle_migrations') AS table_name`
    )
  ).toEqual([{ table_name: null }])
})
