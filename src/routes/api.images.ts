import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/server/db'
import { image, guest } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const imageInput = z.object({
  images: z.array(z.url().max(256)).min(1).max(1000),
  guestId: z.uuid()
})

export const Route = createFileRoute('/api/images')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const images = await db
            .select({
              id: image.id,
              key: image.key,
              guestId: image.guestId,
              uploadedBy: guest.forename
            })
            .from(image)
            .innerJoin(guest, eq(image.guestId, guest.id))
            .orderBy(image.id)

          return Response.json(images)
        } catch {
          console.error('Error fetching images')
          return Response.json(
            { error: 'Failed to fetch images' },
            { status: 500 }
          )
        }
      },
      POST: async ({ request }) => {
        const input = imageInput.safeParse(
          await request.json().catch(() => null)
        )
        if (!input.success) {
          return Response.json(
            {
              error: 'A valid guest ID and at least one image URL are required'
            },
            { status: 400 }
          )
        }

        try {
          const [existingGuest] = await db
            .select({ id: guest.id })
            .from(guest)
            .where(eq(guest.id, input.data.guestId))
            .limit(1)

          if (!existingGuest) {
            return Response.json({ error: 'Guest not found' }, { status: 404 })
          }

          const imageRecords = await db
            .insert(image)
            .values(
              input.data.images.map((key) => ({
                key,
                guestId: existingGuest.id
              }))
            )
            .returning()

          return Response.json(imageRecords)
        } catch {
          console.error('Error inserting images')
          return Response.json(
            { error: 'Failed to insert images' },
            { status: 500 }
          )
        }
      }
    }
  }
})
