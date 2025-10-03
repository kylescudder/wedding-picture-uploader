import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { z } from 'zod'
import { db } from '@/server/db'
import { guest } from '@/server/db/schema'
import { sql } from 'drizzle-orm'

const f = createUploadthing()

export const ourFileRouter = {
  imageUploader: f({
    image: { maxFileSize: '4MB', maxFileCount: 1000 }
  })
    .input(
      z.object({
        forename: z.string().min(1)
      })
    )
    .middleware(async ({ input }) => {
      const trimmedForename = input.forename.trim()

      const existingGuest = await db
        .select()
        .from(guest)
        .where(sql`LOWER(${guest.forename}) = LOWER(${trimmedForename})`)
        .limit(1)

      if (!existingGuest.length) {
        throw new UploadThingError(
          'Guest not found. Please check the name and try again.'
        )
      }

      return { guestId: existingGuest[0].id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Upload complete for guestId:', metadata.guestId)

      console.log('file url', file.url)

      return { uploadedBy: metadata.guestId }
    })
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
