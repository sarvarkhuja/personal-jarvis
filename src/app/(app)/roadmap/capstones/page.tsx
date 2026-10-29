import { createReadClient } from '@/lib/supabase/read';
import { requireUserId } from '@/lib/auth/server-user';
import { loadProgress } from '@/lib/data/roadmap';
import { CAPSTONES, FOUNDATIONS, capKey, capstoneKeys, foundKey } from '@/lib/domain/roadmap-curriculum';
import { ProgressProvider } from '@/components/roadmap/ProgressProvider';
import { RoadmapTabs } from '@/components/roadmap/RoadmapTabs';
import { CapstoneBody, DoneCount, FoundationList } from '@/components/roadmap/PracticeCards';
import { CapstoneSummary } from '@/components/roadmap/CapstoneSummary';
import { WidgetCard } from '@/components/today/WidgetCard';

export default async function CapstonesPage() {
  const userId = await requireUserId();
  const supabase = await createReadClient(userId);
  const progress = await loadProgress(supabase, userId);
  const doneKeys = progress.map((p) => p.key);

  const capstones = CAPSTONES.map((c) => ({
    n: c.n,
    title: c.title,
    description: c.description,
    weeks: [c.weeks[0], c.exitWeek] as [number, number],
    criteria: c.definitionOfDone.map((text, i) => ({ key: capKey(c.n, i), text })),
    deferred: c.deferredFeatures,
  }));

  const domains = [...new Set(FOUNDATIONS.map((f) => f.domain))].map((domain) => {
    const items = FOUNDATIONS.filter((f) => f.domain === domain);
    return {
      domain,
      title: items[0].areaTitle,
      rows: items.map((f) => ({
        key: foundKey(f.id), objective: f.objective, selfCheck: f.selfCheck,
        week: f.recommendedByWeek, required: f.requiredForCoreReadiness,
      })),
    };
  });

  return (
    <main className="w-full space-y-4 px-4 py-8 pb-24">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">ROADMAP</h1>
        <RoadmapTabs active="capstones" />
      </header>

      <ProgressProvider initial={doneKeys}>
        <CapstoneSummary
          capstoneKeys={CAPSTONES.map(capstoneKeys)}
          foundationKeys={FOUNDATIONS.map((f) => foundKey(f.id))}
        />
        <div className="columns-1 md:columns-2 2xl:columns-3 gap-4">
          {capstones.map((c) => (
            <WidgetCard key={c.n} title={`[ CAPSTONE ${c.n} · W${c.weeks[0]}–${c.weeks[1]} ]`} right={<DoneCount keys={c.criteria.map((x) => x.key)} />}>
              <CapstoneBody c={c} linkWeek />
            </WidgetCard>
          ))}
        </div>
        <h2 className="pt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">[ FOUNDATION AUDIT · A GAP CHECK, NOT EXTRA WORK ]</h2>
        <div className="columns-1 md:columns-2 2xl:columns-3 gap-4">
          {domains.map((d) => (
            <WidgetCard key={d.domain} title={`[ ${d.title.toUpperCase()} ]`} right={<DoneCount keys={d.rows.map((r) => r.key)} />}>
              <FoundationList rows={d.rows} />
            </WidgetCard>
          ))}
        </div>
      </ProgressProvider>
    </main>
  );
}
