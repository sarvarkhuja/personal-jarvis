import Link from 'next/link';
import { CURRICULUM, WEEKS } from '@/lib/domain/roadmap-curriculum';
import { RoadmapTabs } from '@/components/roadmap/RoadmapTabs';
import { TRACK_LABEL, TRACK_SHORT, monoSm } from '@/components/roadmap/ui';
import { cn } from '@/lib/utils';
import { WidgetCard, WidgetCount, WidgetEmpty } from '@/components/today/WidgetCard';

type TrackKey = keyof typeof TRACK_LABEL;
const TRACKS = Object.keys(TRACK_LABEL) as TrackKey[];

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

export default async function ResourcesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim().toLowerCase().slice(0, 80);
  const trackParam = first(sp.track);
  const track = (TRACKS as string[]).includes(trackParam) ? (trackParam as TrackKey) : null;

  const usage = new Map<string, { tracks: Set<TrackKey>; weeks: Set<number> }>();
  for (const w of WEEKS) {
    for (const m of w.learningMaterials) {
      const u = usage.get(m.resourceId) ?? { tracks: new Set<TrackKey>(), weeks: new Set<number>() };
      u.tracks.add(m.track);
      u.weeks.add(w.week);
      usage.set(m.resourceId, u);
    }
  }

  const all = Object.values(CURRICULUM.resourceCatalog).map((r) => ({
    ...r,
    tracks: [...(usage.get(r.id)?.tracks ?? [])],
    weeks: [...(usage.get(r.id)?.weeks ?? [])].sort((a, b) => a - b),
  }));
  const shown = all.filter((r) =>
    (!track || r.tracks.includes(track)) &&
    (!q || `${r.title} ${r.type}`.toLowerCase().includes(q)));

  const byType = new Map<string, typeof shown>();
  for (const r of shown) byType.set(r.type, [...(byType.get(r.type) ?? []), r]);
  const groups = [...byType.entries()].sort((a, b) => b[1].length - a[1].length);

  const href = (t: TrackKey | null) => {
    const p = new URLSearchParams();
    if (t) p.set('track', t);
    if (q) p.set('q', q);
    const s = p.toString();
    return s ? `/roadmap/resources?${s}` : '/roadmap/resources';
  };

  return (
    <main className="w-full space-y-4 px-4 py-8 pb-24">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">ROADMAP</h1>
        <RoadmapTabs active="resources" />
      </header>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">{`[ RESOURCES · ${shown.length} OF ${all.length} ]`}</h2>
        <form action="/roadmap/resources" className="flex flex-wrap items-center gap-3">
          {track && <input type="hidden" name="track" value={track} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            aria-label="Search resources"
            placeholder="SEARCH"
            className="min-h-8 w-full max-w-xs rounded-full border border-border-visible bg-transparent px-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-primary placeholder:text-text-disabled"
          />
          <div className="inline-flex items-center rounded-full border border-border-visible p-0.5">
            {([null, ...TRACKS] as (TrackKey | null)[]).map((t) => (
              <Link
                key={t ?? 'all'}
                href={href(t)}
                aria-current={track === t ? 'true' : undefined}
                className={cn(
                  'rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em]',
                  track === t ? 'bg-text-display text-background' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {t ? TRACK_SHORT[t] : 'ALL'}
              </Link>
            ))}
          </div>
        </form>
      </section>

      {groups.length === 0 ? (
        <WidgetEmpty>
          Nothing matches.{' '}
          <Link href="/roadmap/resources" className="inline-flex min-h-6 items-center underline">CLEAR</Link>
        </WidgetEmpty>
      ) : (
        <div className="columns-1 md:columns-2 2xl:columns-3 gap-4">
          {groups.map(([type, items]) => (
            <WidgetCard key={type} title={`[ ${type.toUpperCase()} ]`} right={<WidgetCount>{items.length}</WidgetCount>}>
              <ul>
                {items.map((r) => (
                  <li key={r.id} className="border-b border-border py-2 first:pt-0 last:border-b-0 last:pb-0">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center text-sm text-text-primary hover:text-text-display">
                      {r.title} ↗
                    </a>
                    <div className={cn(monoSm, 'mt-1 flex flex-wrap items-center gap-x-3 text-text-disabled')}>
                      {r.tracks.map((t) => <span key={t}>{TRACK_SHORT[t]}</span>)}
                      {r.weeks.slice(0, 4).map((n) => (
                        <Link key={n} href={`/roadmap?w=${n}`} className="inline-flex min-h-6 items-center hover:text-text-primary">W{n}</Link>
                      ))}
                      {r.weeks.length > 4 && <span>+{r.weeks.length - 4}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </WidgetCard>
          ))}
        </div>
      )}
    </main>
  );
}
