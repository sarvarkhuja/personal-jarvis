import { NextResponse } from 'next/server'
import { seedProgramme } from '@/actions/programme'

// One-time seed endpoint. Call once after schema migration.
// Disable or delete after seeding.
export async function POST() {
  try {
    const result = await seedProgramme()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Seed failed' },
      { status: 500 }
    )
  }
}
