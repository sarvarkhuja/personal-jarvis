import { createClient } from '@/lib/supabase/server'
import { getCurrentProgrammePosition } from '@/lib/utils/week-calculator'
import { BlockCard } from '@/components/programme/BlockCard'
import { redirect } from 'next/navigation'
import type { Block, ProgrammeDay } from '@/types'

export default async function ProgrammePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('programme_start_date')
    .eq('id', user.id)
    .single()

  const { data: blocks } = await supabase
    .from('blocks')
    .select('*')
    .order('sort_order')

  const { data: days } = await supabase
    .from('programme_days')
    .select('*')
    .order('sort_order')

  const startDate = profile?.programme_start_date
    ? new Date(profile.programme_start_date)
    : new Date()

  const position = getCurrentProgrammePosition(startDate)

  const daysByBlock = (days ?? []).reduce<Record<string, ProgrammeDay[]>>((acc, day) => {
    if (!acc[day.block_id]) acc[day.block_id] = []
    acc[day.block_id].push(day)
    return acc
  }, {})

  return (
    <div className="max-w-4xl px-6 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">12-Week Programme</h1>
        <p className="text-sm text-muted-foreground">
          Currently Week {position.weekNumber} · Block {position.blockName}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {(blocks ?? []).map((block: Block) => (
        <div key={block.id} className="space-y-2">
          <BlockCard
            block={block}
            days={daysByBlock[block.id] ?? []}
            currentWeekNumber={position.weekNumber}
          />
          <div className="pl-2 space-y-1">
            {Array.from(
              { length: block.week_end - block.week_start + 1 },
              (_, i) => block.week_start + i
            ).map((weekNum) => {
              const isDeload = weekNum === 4 || weekNum === 8
              const isCurrent = weekNum === position.weekNumber
              return (
                <div
                  key={weekNum}
                  className={`flex items-center gap-2 text-sm py-1 px-2 rounded ${isCurrent ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}
                >
                  <span>Week {weekNum}</span>
                  {isDeload && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">Deload</span>
                  )}
                  {isCurrent && <span className="text-xs ml-auto">← You are here</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}
