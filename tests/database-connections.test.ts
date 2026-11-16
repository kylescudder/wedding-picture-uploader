import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'

import { healthResponse } from '../scripts/health'

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl)
  throw new Error('TEST_DATABASE_URL must point to a disposable local database')
const target = new URL(databaseUrl)
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  !target.pathname.endsWith('_test')
) {
  throw new Error('Connection tests require a disposable local _test database')
}

const applicationName = `wedding-pool-test-${process.pid}`
target.searchParams.set('application_name', applicationName)
const observer = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 2,
  onnotice: () => {}
})
let db: (typeof import('../src/server/db'))['db']
let createdGuestTable = false

async function importDatabase(
  path: string,
  url = target.href,
  mode = 'development'
) {
  const originalUrl = process.env.DATABASE_URL
  const originalMode = process.env.NODE_ENV
  try {
    process.env.DATABASE_URL = url
    process.env.NODE_ENV = mode
    return (await import(path)) as typeof import('../src/server/db')
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = originalUrl
    if (originalMode === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalMode
  }
}

beforeAll(async () => {
  ;({ db } = await importDatabase('../src/server/db'))
  const [{ exists }] =
    await observer`SELECT to_regclass('public.guest') IS NOT NULL AS exists`
  if (!exists) {
    await observer`CREATE TABLE guest (id uuid PRIMARY KEY, forename varchar NOT NULL)`
    createdGuestTable = true
  }
})

test('development reloads reuse the application client', async () => {
  const reloaded = await importDatabase('../src/server/db/index.ts?reload')
  expect(reloaded.db).not.toBe(db)
  expect(reloaded.db.$client).toBe(db.$client)
})

test('the application client bounds connection setup and retires idle sessions', async () => {
  expect(db.$client.options.connect_timeout).toBe(2)
  expect(db.$client.options.idle_timeout).toBe(20)
  await db.execute(sql`SELECT 1`)
  const countSessions = async () => {
    const [{ count }] = await observer<{ count: number }[]>`
      SELECT count(*)::int AS count FROM pg_stat_activity
      WHERE datname = current_database() AND application_name = ${applicationName}
    `
    return count
  }
  expect(await countSessions()).toBeGreaterThan(0)
  const deadline = performance.now() + 25_000
  while ((await countSessions()) > 0 && performance.now() < deadline) {
    await Bun.sleep(100)
  }
  expect(await countSessions()).toBe(0)
  // The same shared client reconnects after its idle sockets have been retired.
  expect(Array.from(await db.execute(sql`SELECT 1 AS ok`))).toEqual([{ ok: 1 }])
}, 30_000)

afterAll(async () => {
  await db?.$client.end({ timeout: 0 })
  Reflect.deleteProperty(globalThis, 'conn')
  if (createdGuestTable) await observer`DROP TABLE guest`
  await observer.end()
})

test('concurrent application queries and health probes use four plus one sessions', async () => {
  let queries: Promise<unknown> = Promise.resolve()
  let probes: Promise<Response[]> = Promise.resolve([])
  const healthTarget = new URL(target)
  healthTarget.searchParams.set('application_name', `${applicationName}-health`)
  try {
    await observer.begin(async (transaction) => {
      // Hold both workloads so all their sessions can be counted at once.
      await transaction`LOCK TABLE guest IN ACCESS EXCLUSIVE MODE`
      await transaction`SELECT pg_advisory_xact_lock(739150133)`
      queries = Promise.all(
        Array.from({ length: 12 }, () =>
          db.execute(sql`SELECT pg_advisory_xact_lock(739150133)`)
        )
      )
      probes = Promise.all(
        Array.from({ length: 12 }, () => healthResponse(healthTarget.href))
      )

      const sessions = () => transaction<{ app: number; health: number }[]>`
        SELECT
          count(*) FILTER (WHERE application_name = ${applicationName})::int AS app,
          count(*) FILTER (WHERE application_name = ${`${applicationName}-health`})::int AS health
        FROM pg_stat_activity WHERE datname = current_database()
      `
      const deadline = performance.now() + 2000
      while (performance.now() < deadline) {
        await transaction`SELECT pg_stat_clear_snapshot()`
        const [counts] = await sessions()
        if (counts.app >= 4 && counts.health >= 1) break
        await Bun.sleep(20)
      }
      // Allow excess connections to open if the cap regresses to the default 10.
      await Bun.sleep(100)
      await transaction`SELECT pg_stat_clear_snapshot()`
      const [counts] = await sessions()
      expect(counts).toEqual({ app: 4, health: 1 })
      expect(counts.app + counts.health).toBe(5)
    })
    await queries
    for (const response of await probes) expect(response.status).toBe(200)
  } finally {
    // Committing/rolling back the observer transaction releases both locks.
    await Promise.allSettled([queries, probes])
  }
})

test('the application client fails fast when the role connection limit refuses it', async () => {
  const role = `wedding_limit_test_${process.pid}`
  await observer`CREATE ROLE ${observer(role)} LOGIN CONNECTION LIMIT 1`
  const limitedUrl = new URL(target)
  limitedUrl.username = role
  limitedUrl.password = ''
  // Hold the role's only connection so the application client is refused.
  const holder = postgres(limitedUrl.href, {
    max: 1,
    connect_timeout: 2,
    onnotice: () => {}
  })
  const cached = Reflect.get(globalThis, 'conn')
  Reflect.deleteProperty(globalThis, 'conn')
  let refused: (typeof import('../src/server/db'))['db'] | undefined
  try {
    await holder`SELECT 1`
    // Production mode leaves the shared development client cached for the other tests.
    ;({ db: refused } = await importDatabase(
      '../src/server/db/index.ts?connection-limit',
      limitedUrl.href,
      'production'
    ))
    const started = performance.now()
    const error = await refused.execute(sql`SELECT 1`).then(
      () => undefined,
      (failure: unknown) => failure
    )
    const elapsed = performance.now() - started
    // Drizzle wraps the driver error, so read the code from its cause.
    const failure = error as { code?: string; cause?: { code?: string } }
    expect(failure?.cause?.code ?? failure?.code).toBe('53300')
    // postgres.js v4 retries 53300 until connect_timeout (2 s) has passed.
    expect(elapsed).toBeLessThan(5000)
  } finally {
    await refused?.$client.end({ timeout: 0 })
    Reflect.set(globalThis, 'conn', cached)
    await holder.end({ timeout: 0 })
    await observer`DROP ROLE ${observer(role)}`
  }
}, 15_000)
