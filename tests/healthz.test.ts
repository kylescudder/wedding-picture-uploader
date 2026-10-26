import { afterAll, beforeAll, expect, test } from 'bun:test'
import postgres from 'postgres'

import { healthResponse } from '../scripts/health'

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
    'Health tests require a disposable local database ending in _test'
  )
}
const sql = postgres(databaseUrl, { max: 2, onnotice: () => {} })

let createdGuestTable = false

beforeAll(async () => {
  const [{ exists }] =
    await sql`SELECT to_regclass('public.guest') IS NOT NULL AS exists`
  if (!exists) {
    // Leave the database as found so later migrations still apply cleanly.
    await sql`CREATE TABLE guest (id uuid PRIMARY KEY, forename varchar NOT NULL)`
    createdGuestTable = true
  }
})

afterAll(async () => {
  if (createdGuestTable) await sql`DROP TABLE guest`
  await sql.end()
})

test('reports ok with the revision and no-store when the database answers', async () => {
  const response = await healthResponse(databaseUrl)

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(await response.json()).toEqual({ ok: true, revision: 'development' })
})

test('reports 503 without a database URL', async () => {
  const response = await healthResponse(undefined)

  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ ok: false })
})

test('reports 503 when the database is unreachable', async () => {
  const unreachable = new URL(databaseUrl)
  unreachable.port = '1'
  const response = await healthResponse(unreachable.href)

  expect(response.status).toBe(503)
})

test('gives up on a blocked database within the 3 second budget', async () => {
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  const lock = sql.begin(async (tx) => {
    await tx`LOCK TABLE guest IN ACCESS EXCLUSIVE MODE`
    await held
  })
  await Bun.sleep(100)

  const started = performance.now()
  const response = await healthResponse(databaseUrl)
  const elapsed = performance.now() - started
  release()
  await lock

  expect(response.status).toBe(503)
  expect(elapsed).toBeLessThan(4000)
}, 10_000)
