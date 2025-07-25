import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { image, guest } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
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

    return NextResponse.json(images)
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { images, guestId } = await request.json()

    if (!guestId) {
      return NextResponse.json(
        { error: 'Guest ID is required' },
        { status: 400 }
      )
    }

    const imageRecords = await db
      .insert(image)
      .values(
        images.map((url: string) => ({
          key: url,
          guestId
        }))
      )
      .returning()

    return NextResponse.json(imageRecords)
  } catch (error) {
    console.error('Error inserting images:', error)
    return NextResponse.json(
      { error: 'Failed to insert images' },
      { status: 500 }
    )
  }
}
