import { RoadmapTabs } from '@/components/roadmap/RoadmapTabs';

export default function Loading() {
  return (
    <main className="w-full px-4 py-8 pb-24">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">ROADMAP</h1>
        <RoadmapTabs active="week" />
      </header>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">[ LOADING… ]</p>
    </main>
  );
}
