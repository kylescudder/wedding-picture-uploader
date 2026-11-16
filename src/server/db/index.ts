import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { getServerEnv } from '@/server/env'
import * as schema from './schema'

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

const env = getServerEnv()
const conn =
  globalForDb.conn ??
  postgres(env.DATABASE_URL, {
    max: 4,
    idle_timeout: 20,
    // postgres.js v4 retries a connection refused for too many connections
    // (53300) until connect_timeout has passed, so keep it short to fail fast.
    connect_timeout: 2
  })
if (env.NODE_ENV !== 'production') globalForDb.conn = conn

export const db = drizzle(conn, { schema })
