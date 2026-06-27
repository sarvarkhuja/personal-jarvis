import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  monthLabel,
  nextMonth,
  previousMonth,
} from '@/lib/domain/calendar';

export function MonthNav({ anchor, today }: { anchor: string; today: string }) {
  const prev = previousMonth(anchor);
  const next = nextMonth(anchor);
  const todayAnchor = `${today.slice(0, 7)}-01`;

  return (
    <div className="flex items-center justify-between" data-testid="month-nav">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={`?m=${prev}`} data-testid="month-prev" />}
      >
        ← {monthLabel(prev)}
      </Button>
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-lg font-medium">
          {monthLabel(anchor)}
        </h2>
        {anchor !== todayAnchor && (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`?m=${todayAnchor}`} data-testid="month-today" />}
          >
            Today
          </Button>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={`?m=${next}`} data-testid="month-next" />}
      >
        {monthLabel(next)} →
      </Button>
    </div>
  );
}
