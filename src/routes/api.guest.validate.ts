import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/server/db'
import { guest } from '@/server/db/schema'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const loginInput = z.object({ forename: z.string().trim().min(1) })

export const Route = createFileRoute('/api/guest/validate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = loginInput.safeParse(
          await request.json().catch(() => null)
        )
        if (!input.success) {
          return Response.json(
            { error: 'Forename is required' },
            { status: 400 }
          )
        }

        try {
          const [existingGuest] = await db
            .select()
            .from(guest)
            .where(
              sql`LOWER(${guest.forename}) = LOWER(${input.data.forename})`
            )
            .limit(1)

          if (!existingGuest) {
            return Response.json(
              {
                error: 'Guest not found. Please check the name and try again.'
              },
              { status: 404 }
            )
          }

          return Response.json(existingGuest)
        } catch {
          console.error('Error validating guest')
          return Response.json(
            { error: 'Failed to validate guest' },
            { status: 500 }
          )
        }
      }
    }
  }
})
