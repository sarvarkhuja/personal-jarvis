import {
  WidgetCard,
  WidgetEmpty,
  WidgetLink,
} from '@/components/today/WidgetCard';
import { formatUzsCompact } from '@/lib/utils/dashboard-utils';
import type { MonthSpendSummary } from '@/lib/domain/home-overview';

/** Read-only month-spend glance: compact total, delta vs last month, 6-mo trend. */
export function ExpensesGlance({ summary }: { summary: MonthSpendSummary }) {
  const { thisMonthTotal, prevMonthTotal, delta, monthLabel, trend } = summary;
  const max = Math.max(...trend.map((t) => t.total), 1);
  const hasAny = trend.some((t) => t.total > 0);

  return (
    <WidgetCard
      title={`[ SPEND · ${monthLabel} ]`}
      right={<WidgetLink href="/expenses">LEDGER</WidgetLink>}
      testid="home-expenses"
    >
      {!hasAny ? (
        <WidgetEmpty>No spend recorded</WidgetEmpty>
      ) : (
        <>
          <span className="font-doto text-4xl font-bold leading-none tracking-tight tabular-nums text-warning">
            {formatUzsCompact(thisMonthTotal)}
          </span>
          {prevMonthTotal > 0 && (
            <p
              className={`mt-2 font-mono text-[11px] uppercase tracking-[0.08em] ${
                delta < 0 ? 'text-success' : 'text-text-secondary'
              }`}
            >
              {delta < 0 ? '−' : '+'}
              {formatUzsCompact(Math.abs(delta))} VS LAST MONTH
            </p>
          )}
          <div className="mt-5 flex h-12 items-end gap-1">
            {trend.map((t) => (
              <div
                key={t.key}
                className={`flex-1 ${t.isCurrent ? 'bg-warning' : 'bg-border-visible'}`}
                style={{ height: `${Math.max(4, Math.round((t.total / max) * 100))}%` }}
              />
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
