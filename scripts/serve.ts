import { join } from 'node:path'

import { healthResponse, revision } from './health'

// TanStack Start emits a fetch handler; Bun serves its public assets directly.
const clientDirectory = new URL('../dist/client/', import.meta.url).pathname
const entryUrl = new URL('../dist/server/server.js', import.meta.url).href
const { default: handler } = (await import(entryUrl)) as {
  default: { fetch: (request: Request) => Response | Promise<Response> }
}
const assets = new Map<string, ReturnType<typeof Bun.file>>()

for await (const path of new Bun.Glob('**/*').scan({
  cwd: clientDirectory,
  onlyFiles: true
})) {
  assets.set(`/${path}`, Bun.file(join(clientDirectory, path)))
}

const server = Bun.serve({
  hostname: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3000),
  async fetch(request) {
    const response = await respond(request)
    response.headers.set('X-Wedding-Picture-Uploader-Revision', revision)
    return response
  },
  error() {
    console.error('Request failed')
    return new Response('Internal server error', { status: 500 })
  }
})

async function respond(request: Request) {
  const pathname = new URL(request.url).pathname
  // Answer before the app so a broken bundle can't hide a healthy database.
  if (pathname === '/healthz') return healthResponse(process.env.DATABASE_URL)
  const asset = assets.get(pathname)

  if (asset && (request.method === 'GET' || request.method === 'HEAD')) {
    return new Response(request.method === 'HEAD' ? null : asset, {
      headers: {
        'Content-Type': asset.type,
        'Content-Length': String(asset.size),
        'Cache-Control': pathname.startsWith('/assets/')
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=0, must-revalidate'
      }
    })
  }

  return handler.fetch(request)
}

console.log(
  `Wedding Picture Uploader ${revision} listening on http://${server.hostname}:${server.port}`
)
