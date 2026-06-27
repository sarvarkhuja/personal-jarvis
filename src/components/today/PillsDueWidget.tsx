import { PillToggleButton } from './PillToggleButton';
import { WidgetCard, WidgetCount, WidgetEmpty, WidgetLink } from './WidgetCard';

type Medication = { id: string; name: string };

export function PillsDueWidget({
  medications,
  loggedTodayIds,
  today,
}: {
  medications: Medication[];
  loggedTodayIds: string[];
  today: string;
}) {
  const loggedSet = new Set(loggedTodayIds);
  const remaining = medications.filter((m) => !loggedSet.has(m.id)).length;

  return (
    <WidgetCard
      title="[ PILLS DUE ]"
      testid="pills-due-widget"
      right={
        <>
          <WidgetCount>{remaining} LEFT</WidgetCount>
          <WidgetLink href="/pills">ALL</WidgetLink>
        </>
      }
    >
      {medications.length === 0 ? (
        <WidgetEmpty>No pills yet</WidgetEmpty>
      ) : (
        <ul className="-mt-1">
          {medications.map((m) => {
            const logged = loggedSet.has(m.id);
            return (
              <li
                key={m.id}
                data-testid={`dose-${m.id}`}
                className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="truncate font-sans text-[14px] text-text-primary">
                    {m.name}
                  </span>
                  {logged && (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-success">
                      done
                    </span>
                  )}
                </div>
                <PillToggleButton medicationId={m.id} date={today} checked={logged} />
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
