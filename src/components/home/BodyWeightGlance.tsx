import {
  WidgetCard,
  WidgetEmpty,
  WidgetLink,
} from '@/components/today/WidgetCard';
import type { BodyWeightSummary } from '@/lib/domain/home-overview';

/** Read-only body-weight glance: latest weigh-in, distance to target, 90-day sparkline. */
export function BodyWeightGlance({
  summary,
  days,
}: {
  summary: BodyWeightSummary;
  days: number;
}) {
  const { latest, target, deltaToTarget, netDelta, towardTarget, count, spark, targetY } =
    summary;

  const trendClass =
    towardTarget === 'toward'
      ? 'text-success'
      : towardTarget === 'away'
        ? 'text-accent'
        : 'text-text-secondary';
  const strokeVar =
    towardTarget === 'toward'
      ? 'var(--success)'
      : towardTarget === 'away'
        ? 'var(--accent)'
        : 'var(--text-secondary)';

  let secondary: string;
  if (target != null && deltaToTarget != null) {
    if (deltaToTarget > 0) {
      secondary = `${Math.abs(deltaToTarget).toFixed(1)} KG ABOVE TARGET · ${target.toFixed(1)}`;
    } else if (deltaToTarget < 0) {
      secondary = `${Math.abs(deltaToTarget).toFixed(1)} KG BELOW TARGET · ${target.toFixed(1)}`;
    } else {
      secondary = `AT TARGET · ${target.toFixed(1)}`;
    }
  } else if (netDelta != null) {
    const glyph = netDelta > 0 ? '▲' : netDelta < 0 ? '▼' : '=';
    secondary = `${glyph} ${Math.abs(netDelta).toFixed(1)} KG · ${days}D`;
  } else {
    secondary = 'ONE ENTRY';
  }

  const linePoints = spark.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const last = spark.length > 0 ? spark[spark.length - 1] : null;

  return (
    <WidgetCard
      title="[ BODY WEIGHT ]"
      right={<WidgetLink href="/workout">GYM</WidgetLink>}
      testid="home-bodyweight"
    >
      {count === 0 || latest == null ? (
        <WidgetEmpty>No weigh-ins</WidgetEmpty>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-doto text-4xl font-bold leading-none tracking-tight tabular-nums text-text-display">
              {latest.toFixed(1)}
            </span>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-disabled">
              KG
            </span>
          </div>
          <p
            className={`mt-2 font-mono text-[11px] uppercase tracking-[0.08em] ${trendClass}`}
          >
            {secondary}
          </p>
          <div className="relative mt-5 h-16 w-full">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              {targetY != null && (
                <line
                  x1="0"
                  y1={targetY}
                  x2="100"
                  y2={targetY}
                  stroke="var(--border-visible)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {spark.length >= 2 && (
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke={strokeVar}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {last && (
              <div
                className="absolute h-2 w-2 rounded-full"
                style={{
                  left: `${last.x}%`,
                  top: `${last.y}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: strokeVar,
                }}
              />
            )}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
