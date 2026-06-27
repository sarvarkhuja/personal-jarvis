import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';

const TABLES = [
  'profiles',
  'habits',
  'habit_logs',
  'medications',
  'medication_logs',
  'goals',
  'events',
  'focus_sessions',
] as const;

export async function GET() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const dump: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    const ownerColumn = table === 'profiles' ? 'id' : 'user_id';
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(ownerColumn, userId);
    if (error) {
      return NextResponse.json(
        { error: `Failed to read ${table}: ${error.message}` },
        { status: 500 },
      );
    }
    dump[table] = data ?? [];
  }

  const filename = `jarvis-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(dump, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
