import { createReadClient } from '@/lib/supabase/read';
import { requireUserId } from '@/lib/auth/server-user';
import { loadProfile } from '@/lib/data/profile';
import { loadNotes, loadProgress } from '@/lib/data/roadmap';
import { toUserDate } from '@/lib/domain/timezone';
import { activityDots, currentWeek, knownTopics, paceSummary } from '@/lib/domain/roadmap';
import {
  CAPSTONES, CURRICULUM, MONTH_NAMES, WEEKS,
  STRETCH_KEYS, capKey, exKey, gateKey, buildKey, knowKey, nextUpList, weekCoreKeys, weekCoreKnowledgeKeys, weekKeyLists, weekPracticeKeys,
} from '@/lib/domain/roadmap-curriculum';
import { ProgressProvider } from '@/components/roadmap/ProgressProvider';
import { RoadmapHero } from '@/components/roadmap/RoadmapHero';
import { RoadmapTabs } from '@/components/roadmap/RoadmapTabs';
import { WeekFooter } from '@/components/roadmap/WeekHeader';
import { WeekWorkspace, type WeekTab } from '@/components/roadmap/WeekWorkspace';
import { KnowledgeCount, KnowledgeList } from '@/components/roadmap/KnowledgeCard';
import { BuildPanel, CapstoneBody, DoneCount, ExerciseList } from '@/components/roadmap/PracticeCards';
import { NoteCard } from '@/components/roadmap/NoteCard';
import { NoteComposer } from '@/components/roadmap/NoteComposer';
import { TRACK_LABEL, monoSm, stripLevel } from '@/components/roadmap/ui';
import { WidgetCard, WidgetCount, WidgetEmpty } from '@/components/today/WidgetCard';

const TRACK_ORDER = ['go', 'ai', 'ml'] as const;

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ w?: string; t?: string }> }) {
  const { w, t } = await searchParams;
  const tab: WeekTab = t === 'practice' || t === 'reading' || t === 'notes' ? t : 'concepts';
  const userId = await requireUserId();
  const supabase = await createReadClient(userId);
  const [profile, progress, notes] = await Promise.all([
    loadProfile(userId),
    loadProgress(supabase, userId),
    loadNotes(supabase, userId),
  ]);

  const today = toUserDate(new Date(), profile.timezone);
  const doneKeys = progress.map((p) => p.key);
  const weekKeys = weekKeyLists();
  const doneSet = new Set(doneKeys);
  const current = currentWeek(weekKeys, doneSet);
  const nextItems = nextUpList(doneSet);
  const parsed = w !== undefined && /^\d+$/.test(w) ? Number(w) : NaN;
  const selected = parsed >= 1 && parsed <= 28 ? parsed : (current ?? 28);

  const week = WEEKS[selected - 1];
  const cap = CAPSTONES.find((c) => c.n === week.capstoneId)!;
  const weekNotes = notes.filter((n) => n.week === selected);
  const known = knownTopics(notes);

  const coreSet = new Set(weekKeys.flat());
  const total = weekKeys.reduce((n, k) => n + k.length, 0);
  const pace = paceSummary(progress.filter((p) => coreSet.has(p.key)), total, today, profile.timezone);
  const dots = activityDots([...progress.map((p) => p.done_at), ...notes.map((n) => n.created_at)], today, profile.timezone);
  const months = [...MONTH_NAMES];

  const knowledge = TRACK_ORDER.map((track) => ({
    track,
    rows: week.knowledgeChecklist
      .filter((k) => k.track === track)
      .map((k) => ({
        key: knowKey(k.id),
        objective: stripLevel(k.objective),
        selfCheck: k.selfCheck,
        level: k.level,
        required: k.requiredForWeek,
      })),
  })).filter((g) => g.rows.length > 0);

  const exercises = week.exercises.map((e) => ({
    key: exKey(e.id), track: e.track, hours: e.estimatedHours, task: e.task, verification: e.verification, artifact: e.artifact,
  }));
  const practiceKeys = weekPracticeKeys(week);
  const capRow = {
    n: cap.n,
    title: cap.title,
    description: cap.description,
    weeks: [cap.weeks[0], cap.exitWeek] as [number, number],
    criteria: cap.definitionOfDone.map((text, i) => ({ key: capKey(cap.n, i), text })),
    deferred: cap.deferredFeatures,
  };
  const materials = TRACK_ORDER.map((track) => ({
    track,
    items: week.learningMaterials.filter((m) => m.track === track).map((m) => ({ ...m, resource: CURRICULUM.resourceCatalog[m.resourceId] })).filter((m) => m.resource),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="w-full space-y-4 px-4 py-8 pb-24">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-mono text-3xl font-bold uppercase leading-none tracking-[0.2em] text-text-primary">ROADMAP</h1>
        <RoadmapTabs active="week" />
      </header>

      <ProgressProvider initial={doneKeys}>
        <RoadmapHero weekKeys={weekKeys} stretchKeys={STRETCH_KEYS} months={months} selectedWeek={selected} nextItems={nextItems} pace={pace} dots={dots} />
        <WeekWorkspace
          key={selected}
          initialTab={tab}
          week={selected}
          monthName={MONTH_NAMES[week.month - 1]}
          goal={week.goal}
          hours={week.weeklyCoreHours}
          knowKeys={weekCoreKnowledgeKeys(week)}
          practiceKeys={practiceKeys}
          readingCount={week.learningMaterials.length}
          noteCount={weekNotes.length}
                  panels={{
            concepts: (
              <>
                <p className="max-w-[70ch] text-sm leading-relaxed text-text-secondary">
                  Open the self-check, answer it out loud without notes, then tick the concept. Tick it only if you could explain it cold.
                </p>
                <div className="columns-1 md:columns-2 2xl:columns-3 gap-4">
                  {knowledge.map((g) => (
                    <WidgetCard key={g.track} title={`[ ${TRACK_LABEL[g.track]} ]`} right={<KnowledgeCount keys={g.rows.filter((r) => r.required).map((r) => r.key)} />}>
                      <KnowledgeList rows={g.rows} />
                    </WidgetCard>
                  ))}
                </div>
              </>
            ),
            practice: (
              <>
                <p className="max-w-[70ch] text-sm leading-relaxed text-text-secondary">
                  Build it, prove it, then tick it. The weekly build ties the exercises together; the definition of done is how you know the week is finished.
                </p>
                <div className="columns-1 md:columns-2 2xl:columns-3 gap-4">
                  <WidgetCard title="[ EXERCISES ]" right={<DoneCount keys={exercises.map((e) => e.key)} />}>
                    <ExerciseList rows={exercises} />
                  </WidgetCard>
                  <WidgetCard title="[ WEEKLY BUILD & DONE ]">
                    <BuildPanel
                      buildKey={buildKey(selected)}
                      hours={week.integratedBuild.estimatedHours}
                      task={week.integratedBuild.task}
                      artifact={week.integratedBuild.artifact}
                      gates={week.definitionOfDone.map((text, i) => ({ key: gateKey(selected, i), text }))}
                      stretch={{ hours: week.optionalStretch.estimatedAdditionalHours, task: week.optionalStretch.task }}
                    />
                  </WidgetCard>
                  <WidgetCard title={`[ CAPSTONE ${cap.n} ]`} right={<DoneCount keys={capRow.criteria.map((c) => c.key)} />}>
                    <CapstoneBody c={capRow} />
                  </WidgetCard>
                  <WidgetCard title="[ WEEKLY RHYTHM ]" right={<WidgetCount>{week.weeklyCoreHours}h</WidgetCount>}>
                    <ul>
                      {CURRICULUM.workflow.weeklySessions.map((d) => (
                        <li key={d.day} className="flex items-center gap-3 py-1.5">
                          <span className={`${monoSm} w-8 shrink-0 text-text-secondary`}>{d.day.slice(0, 3)}</span>
                          <span className="h-1 flex-1 overflow-hidden rounded-full bg-border-visible">
                            <span className="block h-full bg-text-secondary" style={{ width: `${(d.hours / 6) * 100}%` }} />
                          </span>
                          <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-text-primary">{d.hours ? `${d.hours}h` : 'rest'}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">{CURRICULUM.workflow.weeklySessions.filter((d) => d.hours).map((d) => d.focus.split(':')[0]).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}</p>
                  </WidgetCard>
                </div>
              </>
            ),
            reading: (
              <>
                <p className="max-w-[70ch] text-sm leading-relaxed text-text-secondary">
                  Read less, build more. Start with what is marked required; the rest is there when you get stuck.
                </p>
                <div className="columns-1 md:columns-2 2xl:columns-3 gap-4">
                  {materials.map((g) => (
                    <WidgetCard key={g.track} title={`[ ${TRACK_LABEL[g.track]} ]`} right={<WidgetCount>{g.items.length}</WidgetCount>}>
                      <ul>
                        {g.items.map((m) => (
                          <li key={m.resourceId}>
                            <a
                              href={m.resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex min-h-10 items-baseline justify-between gap-3 border-b border-border py-2 text-sm text-text-primary hover:text-text-display"
                            >
                              <span>{m.resource.title}</span>
                              <span className={`${monoSm} shrink-0 text-text-disabled`}>{m.required ? 'required' : 'optional'} ↗</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </WidgetCard>
                  ))}
                  <WidgetCard title="[ SOURCE GUIDE SECTIONS ]">
                    <ul className="space-y-2">
                      {week.sourceGuideSections.map((sec) => <li key={sec} className="text-sm leading-relaxed text-text-secondary">{sec}</li>)}
                    </ul>
                  </WidgetCard>
                </div>
              </>
            ),
            notes: (
              <div className="columns-1 md:columns-2 2xl:columns-3 gap-4">
                <WidgetCard title="[ CAPTURE ]">
                  <NoteComposer week={selected} known={known} />
                </WidgetCard>
                <WidgetCard title={`[ WEEK ${selected} NOTES ]`} right={<WidgetCount>{weekNotes.length}</WidgetCount>}>
                  {weekNotes.length === 0
                    ? <WidgetEmpty>Nothing yet. Write down one thing that surprised you this week.</WidgetEmpty>
                    : weekNotes.map((n) => <NoteCard key={n.id} note={n} tz={profile.timezone} known={known} />)}
                </WidgetCard>
              </div>
            ),
          }}
        />





        <WeekFooter week={selected} coreKeys={weekCoreKeys(week)} />
      </ProgressProvider>
    </main>
  );
}
