import { createClient } from '@/lib/supabase/server';
import { requireUserId } from '@/lib/auth/server-user';
import { toUserDate } from '@/lib/domain/timezone';
import { formatInTimeZone } from 'date-fns-tz';
import { addDaysISO } from '@/lib/domain/habit-consistency';
import { loadSalahConfig } from '@/lib/data/salah';
import {
  buildDayModel,
  buildSalahConsistency,
  type LoggedPrayer,
  type PrayerName,
  type SalahStatus,
  type JamaatKind,
} from '@/lib/domain/salah';
import {
  SalahTodayInstrument,
  type CellVM,
} from '@/components/salah/SalahTodayInstrument';
import { SalahStreakCard } from '@/components/salah/SalahStreakCard';
import { SalahWeekGrid } from '@/components/salah/SalahWeekGrid';
import { SalahMonthCard } from '@/components/salah/SalahMonthCard';
import { SalahTallyCard } from '@/components/salah/SalahTallyCard';

export default async function SalahPage() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const cfg = await loadSalahConfig(supabase, userId);

  const now = new Date();
  const today = toUserDate(now, cfg.timezone);
  const since = addDaysISO(today, -60);

  const { data } = await supabase
    .from('salah_logs')
    .select('prayer, log_date, status, jamaat')
    .eq('user_id', userId)
    .gte('log_date', since);

  const rows = (data ?? []) as Array<{
    prayer: PrayerName;
    log_date: string;
    status: SalahStatus;
    jamaat: JamaatKind | null;
  }>;
  const byDate = new Map<string, LoggedPrayer[]>();
  for (const r of rows) {
    if (!byDate.has(r.log_date)) byDate.set(r.log_date, []);
    const day = byDate.get(r.log_date)!;
    if (!day.some((l) => l.prayer === r.prayer)) {
      day.push({ prayer: r.prayer, status: r.status, jamaat: r.jamaat });
    }
  }

  const model = buildDayModel(now, cfg, byDate.get(today) ?? []);
  const consistency = buildSalahConsistency(byDate, today, now, cfg);

  const cells: CellVM[] = model.cells.map((c) => ({
    name: c.name,
    label: c.label,
    timeLabel: formatInTimeZone(c.start, cfg.timezone, 'HH:mm'),
    state: c.state,
    status: c.status,
  }));
  const dateLabel = formatInTimeZone(now, cfg.timezone, 'EEE d MMM').toUpperCase();
  const nextLabel = model.next
    ? (model.next.name === 'dhuhr'
        ? cells.find((c) => c.name === 'dhuhr')?.label ?? 'Dhuhr'
        : cells.find((c) => c.name === model.next!.name)?.label ??
          model.next.name)
    : null;
  const nextAt = model.next
    ? formatInTimeZone(model.next.at, cfg.timezone, 'HH:mm')
    : null;

  return (
    <main className="w-full space-y-4 px-4 py-8">
      <header className="mb-2">
        <h1 className="font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">
          SALAH
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {cfg.timezone.replace('_', ' ')}
        </p>
      </header>

      <SalahTodayInstrument
        dateLabel={dateLabel}
        cells={cells}
        nextLabel={nextLabel}
        nextAt={nextAt}
        nextIsTomorrow={model.next?.isTomorrow ?? false}
      />

      <div className="gap-4 lg:columns-2 xl:columns-3">
        <SalahStreakCard
          streakCurrent={consistency.streakCurrent}
          streakLongest={consistency.streakLongest}
          onTimeRate30d={consistency.onTimeRate30d}
        />
        <SalahWeekGrid week={consistency.week} />
        <SalahMonthCard
          onTimeRate30d={consistency.onTimeRate30d}
          jamaatRate30d={consistency.jamaatRate30d}
          totalLogged30d={consistency.totalLogged30d}
        />
        <SalahTallyCard
          qadaCount30d={consistency.qadaCount30d}
          missedCount30d={consistency.missedCount30d}
        />
      </div>
    </main>
  );
}
