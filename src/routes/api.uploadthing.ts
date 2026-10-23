import { createFileRoute } from '@tanstack/react-router'
import { createRouteHandler } from 'uploadthing/server'
import { ourFileRouter } from '@/server/uploadthing'

const handler = createRouteHandler({ router: ourFileRouter })

export const Route = createFileRoute('/api/uploadthing')({
  server: {
    handlers: {
      GET: ({ request }) => handler(request),
      POST: ({ request }) => handler(request)
    }
  }
})
