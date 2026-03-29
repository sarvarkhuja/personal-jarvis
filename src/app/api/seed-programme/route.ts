import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seedProgramme } from '@/actions/programme'

// One-time seed endpoint. Call once after schema migration.
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Idempotency check: don't seed if blocks already exist
    const { count } = await supabase
      .from('blocks')
      .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
      return NextResponse.json({ error: 'Programme already seeded' }, { status: 409 })
    }

    const result = await seedProgramme()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Seed failed' },
      { status: 500 }
    )
  }
}
