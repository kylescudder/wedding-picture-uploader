import { join } from 'node:path'

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
    const pathname = new URL(request.url).pathname
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
  },
  error() {
    console.error('Request failed')
    return new Response('Internal server error', { status: 500 })
  }
})

console.log(
  `Wedding Picture Uploader listening on http://${server.hostname}:${server.port}`
)
