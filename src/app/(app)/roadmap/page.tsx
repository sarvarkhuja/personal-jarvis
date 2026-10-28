import { createReadClient } from '@/lib/supabase/read';
import { requireUserId } from '@/lib/auth/server-user';
import { loadProfile } from '@/lib/data/profile';
import { loadNotes, loadStatuses } from '@/lib/data/roadmap';
import { toUserDate } from '@/lib/domain/timezone';
import { activityDots, currentWeek, paceSummary, weekTally } from '@/lib/domain/roadmap';
import { CAPSTONES, ROADMAP_WEEKS } from '@/lib/domain/roadmap-data';
import { RoadmapHero } from '@/components/roadmap/RoadmapHero';
import { RoadmapTabs } from '@/components/roadmap/RoadmapTabs';
import { WeekItems } from '@/components/roadmap/WeekItems';
import { WidgetCard, WidgetCount, WidgetEmpty } from '@/components/today/WidgetCard';

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const userId = await requireUserId();
  const supabase = await createReadClient(userId);
  const [profile, statuses, notes] = await Promise.all([
    loadProfile(userId),
    loadStatuses(supabase, userId),
    loadNotes(supabase, userId),
  ]);

  const today = toUserDate(new Date(), profile.timezone);
  const current = currentWeek(statuses);
  const parsed = w !== undefined && /^\d+$/.test(w) ? Number(w) : NaN;
  const selected = parsed >= 1 && parsed <= 28 ? parsed : (current ?? 28);

  const week = ROADMAP_WEEKS.find((r) => r.week === selected)!;
  const capstone = week.capstone === null ? null : (CAPSTONES.find((c) => c.n === week.capstone) ?? null);
  const weekNotes = notes.filter((n) => n.week === selected);

  const pace = paceSummary(statuses, today, profile.timezone);
  const dots = activityDots(
    [...statuses.map((s) => s.updated_at), ...notes.map((n) => n.created_at)],
    today,
    profile.timezone,
  );
  const sentence = current === null
    ? 'Every week is resolved.'
    : `Next up: week ${current}, ${weekTally(statuses, current).open} of 5 open.`;

  return (
    <main className="w-full space-y-4 px-4 py-8 pb-24">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">ROADMAP</h1>
        <RoadmapTabs active="week" />
      </header>

      <RoadmapHero statuses={statuses} selectedWeek={selected} current={current} pace={pace} dots={dots} sentence={sentence} />

      <div className="columns-1 md:columns-2 2xl:columns-3 gap-4">
        <WidgetCard title={`[ WEEK ${selected} · ITEMS ]`}>
          <WeekItems week={week} statuses={statuses} capstone={capstone} />
        </WidgetCard>
        <WidgetCard title="[ CAPTURE ]">
          <WidgetEmpty>Capture arrives soon.</WidgetEmpty>
        </WidgetCard>
        <WidgetCard title={`[ NOTES · WEEK ${selected} · ${weekNotes.length} ]`} right={<WidgetCount>{weekNotes.length}</WidgetCount>}>
          <WidgetEmpty>{weekNotes.length === 0 ? 'No notes this week.' : `${weekNotes.length} notes.`}</WidgetEmpty>
        </WidgetCard>
      </div>
    </main>
  );
}
