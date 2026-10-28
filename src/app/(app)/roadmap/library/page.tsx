import Link from 'next/link';
import { createReadClient } from '@/lib/supabase/read';
import { requireUserId } from '@/lib/auth/server-user';
import { loadProfile } from '@/lib/data/profile';
import { loadNotes } from '@/lib/data/roadmap';
import { knownTopics } from '@/lib/domain/roadmap';
import { filterNotes, groupNotes, parseLibraryParams, sortNotes } from '@/lib/domain/roadmap-library';
import { LibraryFilters } from '@/components/roadmap/LibraryFilters';
import { NoteCard } from '@/components/roadmap/NoteCard';
import { RoadmapTabs } from '@/components/roadmap/RoadmapTabs';
import { WidgetCard, WidgetCount, WidgetEmpty } from '@/components/today/WidgetCard';

const SEGMENT_TONES = ['bg-text-primary', 'bg-text-secondary', 'bg-text-disabled'] as const;

export default async function LibraryPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseLibraryParams(await searchParams);
  const userId = await requireUserId();
  const supabase = await createReadClient(userId);
  const [profile, notes] = await Promise.all([loadProfile(userId), loadNotes(supabase, userId)]);

  const known = knownTopics(notes);
  const groups = groupNotes(sortNotes(filterNotes(notes, params), params.sort), params.group);

  const counts = [1, 2, 3].map((c) => notes.filter((n) => n.confidence === c).length);
  const k = counts[0];
  const sentence = k === 0 ? 'Nothing rated 1.' : k === 1 ? '1 note you rated 1: start there.' : `${k} notes you rated 1: start there.`;

  return (
    <main className="w-full space-y-4 px-4 py-8 pb-24">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">ROADMAP</h1>
        <RoadmapTabs active="library" />
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">{`[ LIBRARY · ${notes.length} NOTES ]`}</h2>
        {notes.length > 0 && (
          <div
            role="img"
            aria-label={`Confidence: ${counts[0]} rated 1, ${counts[1]} rated 2, ${counts[2]} rated 3`}
            className="flex h-2 w-full max-w-md gap-0.5 overflow-hidden rounded-full"
          >
            {counts.map((c, i) => c > 0 && (
              <div key={i} className={SEGMENT_TONES[i]} style={{ flexGrow: c }} />
            ))}
          </div>
        )}
        <p className="font-mono text-[12px] text-text-secondary">{sentence}</p>
      </section>

      <LibraryFilters params={params} topics={known} />

      {notes.length === 0 ? (
        <WidgetEmpty>
          <Link href="/roadmap" className="inline-flex min-h-6 items-center underline">
            No notes yet. Capture one from the week page.
          </Link>
        </WidgetEmpty>
      ) : groups.length === 0 ? (
        <WidgetEmpty>
          Nothing matches these filters.{' '}
          <Link href="/roadmap/library" className="inline-flex min-h-6 items-center underline">CLEAR</Link>
        </WidgetEmpty>
      ) : (
        <div className="columns-1 md:columns-2 2xl:columns-3 gap-4">
          {groups.map((g) => (
            <WidgetCard key={g.key} title={`[ ${g.label} · ${g.notes.length} ]`} right={<WidgetCount>{g.notes.length}</WidgetCount>}>
              {g.notes.map((n) => <NoteCard key={n.id} note={n} tz={profile.timezone} known={known} />)}
            </WidgetCard>
          ))}
        </div>
      )}
    </main>
  );
}
