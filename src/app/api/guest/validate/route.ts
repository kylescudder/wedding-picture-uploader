import { db } from '@/server/db'
import { guest } from '@/server/db/schema'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { forename } = await request.json()
    if (!forename) {
      return NextResponse.json(
        { error: 'Forename is required' },
        { status: 400 }
      )
    }

    const existingGuest = await db
      .select()
      .from(guest)
      .where(sql`LOWER(${guest.forename}) = LOWER(${forename.trim()})`)
      .limit(1)

    if (!existingGuest.length) {
      return NextResponse.json(
        { error: 'Guest not found. Please check the name and try again.' },
        { status: 404 }
      )
    }

    return NextResponse.json(existingGuest[0])
  } catch (error) {
    console.error('Error validating guest:', error)
    return NextResponse.json(
      { error: 'Failed to validate guest' },
      { status: 500 }
    )
  }
}
