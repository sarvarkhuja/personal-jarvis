import type { Block, ProgrammeDay } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BlockCardProps {
  block: Block
  days: ProgrammeDay[]
  currentWeekNumber: number
}

const WEEK_DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function BlockCard({ block, days, currentWeekNumber }: BlockCardProps) {
  const isCurrentBlock =
    currentWeekNumber >= block.week_start && currentWeekNumber <= block.week_end

  return (
    <Card className={isCurrentBlock ? 'border-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{block.name}</CardTitle>
          <div className="flex gap-1">
            {isCurrentBlock && (
              <Badge variant="default" className="text-xs">Current</Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              Weeks {block.week_start}–{block.week_end}
            </Badge>
          </div>
        </div>
        {block.focus && (
          <p className="text-xs text-muted-foreground">{block.focus} · {block.rep_range_compounds} reps</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {days.map((day) => (
            <div key={day.id} className="text-sm p-2 rounded bg-muted/40">
              <span className="font-medium text-xs text-muted-foreground">
                {WEEK_DAYS[day.day_of_week]}
              </span>
              <p className="text-xs mt-0.5 leading-tight">{day.name.split('—')[1]?.trim() ?? day.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
