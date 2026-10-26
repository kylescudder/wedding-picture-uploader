import postgres from 'postgres'

const revision = process.env.WEDDING_PICTURE_UPLOADER_REVISION || 'development'
let healthProbe: Promise<void> | undefined

async function probeDatabase(databaseUrl: string) {
  // Own the connection so a stalled probe can be retired without touching app SQL.
  const client = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 3,
    connection: { statement_timeout: 3000 }
  })
  const query = client`SELECT id FROM guest LIMIT 0`
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      query,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), 3000)
      })
    ])
  } catch (error) {
    // Closing the socket doesn't stop a backend waiting on a lock, so cancel it.
    // The cancel request uses its own connection, so bound it too.
    await Promise.race([query.cancel(), Bun.sleep(500)]).catch(() => {})
    throw error
  } finally {
    clearTimeout(timer)
    await client.end({ timeout: 0 })
  }
}

export { revision }

export async function healthResponse(databaseUrl: string | undefined) {
  const headers = { 'Cache-Control': 'no-store' }
  if (!databaseUrl)
    return Response.json({ ok: false }, { status: 503, headers })
  healthProbe ??= probeDatabase(databaseUrl).finally(() => {
    healthProbe = undefined
  })
  try {
    await healthProbe
    return Response.json({ ok: true, revision }, { headers })
  } catch {
    return Response.json({ ok: false }, { status: 503, headers })
  }
}
