import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate } from '@/lib/domain/timezone';
import { buildPillWeek, medicationGridRows } from '@/lib/domain/pill-grid';
import { AddMedicationSheet } from '@/components/pills/AddMedicationSheet';
import { MedicationRow } from '@/components/pills/MedicationRow';

type MedicationRecord = { id: string; name: string };
type LogRecord = { medication_id: string; log_date: string };

export default async function PillsPage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single();
  const tz = (profile as { timezone?: string } | null)?.timezone ?? 'UTC';

  const today = toUserDate(new Date(), tz);
  const week = buildPillWeek(today);
  const weekStart = week[0].date;

  const [{ data: medsRaw }, { data: logsRaw }] = await Promise.all([
    supabase
      .from('medications')
      .select('id, name')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('medication_logs')
      .select('medication_id, log_date')
      .eq('user_id', userId)
      .gte('log_date', weekStart),
  ]);

  const medications = (medsRaw ?? []) as MedicationRecord[];
  const logs = (logsRaw ?? []) as LogRecord[];
  const rows = medicationGridRows(medications, logs, week);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-medium">Pills</h1>
          <p className="text-sm text-muted-foreground">Check off each day.</p>
        </div>
        <AddMedicationSheet />
      </header>

      {medications.length === 0 ? (
        <div
          data-testid="medications-empty"
          className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground"
        >
          No pills yet. Add one to get started.
        </div>
      ) : (
        <div data-testid="medications-list">
          {/* weekday header — aligned over each row's 7 cells */}
          <div className="flex items-center gap-3 pb-2">
            <span className="min-w-0 flex-1" />
            <div className="flex items-center gap-1">
              {week.map((d) => (
                <span
                  key={d.date}
                  className={`w-9 text-center font-mono text-[10px] uppercase tracking-[0.06em] ${
                    d.isToday ? 'text-text-primary' : 'text-text-disabled'
                  }`}
                >
                  {d.label}
                </span>
              ))}
            </div>
            <span className="w-8" />
          </div>
          <ul>
            {rows.map((r) => (
              <MedicationRow
                key={r.id}
                medication={{ id: r.id, name: r.name }}
                cells={r.cells}
              />
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
