import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { z } from 'zod'

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
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const host = process.env.VERCEL_URL || 'localhost:3000'
      const baseUrl = `${protocol}://${host}`

      const response = await fetch(`${baseUrl}/api/guest/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ forename: trimmedForename })
      })
      console.log(response)
      if (!response.ok) {
        throw new UploadThingError('Unauthorized')
      }

      const guest = await response.json()
      return { guestId: guest.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Upload complete for guestId:', metadata.guestId)

      console.log('file url', file.url)

      return { uploadedBy: metadata.guestId }
    })
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
