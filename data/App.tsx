import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen,
  Check, ChevronDown, Clock3, Code2,
  FileCode2, Flag, Layers3, ListChecks,
  MessageSquareText, NotebookPen, Plus, RotateCcw, Search, ShieldCheck,
  Sparkles, Target, Trash2, Upload, X,
} from 'lucide-react';
import rawData from './data/roadmap.json';
import type { Capstone, Note, NoteKind, ProgressData, Resource, RoadmapData, Track, View, Week } from './types';
import { TRACKS } from './types';

const DATA = rawData as unknown as RoadmapData;
const STORAGE_KEY = 'ai-systems-roadmap-v2-progress';
const MONTHS = ['FOUNDATIONS', 'DISTRIBUTED SYSTEMS', 'PLATFORM ENGINEERING', 'RETRIEVAL & EVALS', 'INFERENCE SYSTEMS', 'AGENT WORKFLOWS', 'PRODUCTION HARDENING'];
const NOTE_KINDS: NoteKind[] = ['LEARNING', 'QUESTION', 'GOTCHA', 'DECISION', 'RESOURCE', 'STORY'];
const blank: ProgressData = { completed: {}, notes: [], currentWeek: 9, startedAt: null };

function load(): ProgressData {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return blank;
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return blank;
    const p = parsed as Partial<ProgressData>;
    return {
      completed: p.completed && typeof p.completed === 'object' ? p.completed : {},
      notes: Array.isArray(p.notes) ? p.notes.filter((n): n is Note => !!n && typeof n.body === 'string' && typeof n.week === 'number') : [],
      currentWeek: Number.isInteger(p.currentWeek) && p.currentWeek! >= 1 && p.currentWeek! <= 28 ? p.currentWeek! : 9,
      startedAt: typeof p.startedAt === 'string' ? p.startedAt : null,
    };
  } catch { return blank; }
}
function knowledgeKeys(w: Week): string[] {
  return w.knowledgeChecklist.map(item => `know:${item.id}`);
}
function practiceKeys(w: Week): string[] {
  return [...w.exercises.map(e => `ex:${e.id}`), `build:${w.week}`, ...w.definitionOfDone.map((_, i) => `gate:${w.week}:${i}`)];
}
function workKeys(w: Week): string[] {
  return [...knowledgeKeys(w), ...practiceKeys(w)];
}
function doneCount(keys: string[], state: Record<string, boolean>) { return keys.filter(k => state[k]).length; }
function allKeys() { return DATA.weeks.flatMap(workKeys); }
function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}
function stripMd(s: string) { return s.replace(/\*\*/g, '').replace(/`/g, ''); }
function shortText(s: string, n = 58) { const plain = stripMd(s); return plain.length > n ? `${plain.slice(0, n - 1).trimEnd()}…` : plain; }
function trackName(track: Track) { return TRACKS[track].label; }
function stateWord(value: number, total: number) { return value === total ? 'COMPLETE' : value === 0 ? 'NOT STARTED' : 'IN PROGRESS'; }

function CheckToggle({ checked, onChange, label, small = false }: { checked: boolean; onChange: () => void; label: string; small?: boolean }) {
  return <button className={`check-toggle ${checked ? 'is-checked' : ''} ${small ? 'check-small' : ''}`} type="button" aria-label={`${checked ? 'Mark not done' : 'Mark done'}: ${label}`} aria-pressed={checked} onClick={onChange}>
    {checked ? <Check size={small ? 13 : 16} strokeWidth={2.6} /> : null}
  </button>;
}
function TrackMark({ track }: { track: Track }) { return <span className={`track-mark track-${track}`}>{trackName(track)}</span>; }
function Eyebrow({ children }: { children: ReactNode }) { return <span className="eyebrow">{children}</span> }
function SectionTitle({ kicker, title, extra }: { kicker: string; title: string; extra?: React.ReactNode }) {
  return <div className="section-heading"><div><Eyebrow>{kicker}</Eyebrow><h2>{title}</h2></div>{extra}</div>;
}

function App() {
  const [progress, setProgress] = useState<ProgressData>(load);
  const [view, setView] = useState<View>('week');
  const [weekTab, setWeekTab] = useState<'knowledge' | 'work' | 'resources' | 'journal'>('knowledge');
  const [resourceQuery, setResourceQuery] = useState('');
  const [resourceFilter, setResourceFilter] = useState<'all' | Track>('all');
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteKind, setNoteKind] = useState<NoteKind>('LEARNING');
  const [showStretch, setShowStretch] = useState(false);
  const [notice, setNotice] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const week = DATA.weeks.find(w => w.week === progress.currentWeek)!;
  const milestone = DATA.capstones.find(c => c.n === week.capstoneId)!;
  const keys = useMemo(() => allKeys(), []);
  const completed = doneCount(keys, progress.completed);
  const percent = Math.round(completed / keys.length * 100);
  const weekKeys = workKeys(week);
  const weekDone = doneCount(weekKeys, progress.completed);
  const weekPct = Math.round(weekDone / weekKeys.length * 100);
  const knownKeys = knowledgeKeys(week);
  const knownDone = doneCount(knownKeys, progress.completed);
  const practicalKeys = practiceKeys(week);
  const practicalDone = doneCount(practicalKeys, progress.completed);
  const weekNotes = progress.notes.filter(n => n.week === week.week).slice().reverse();
  const capKeys = milestone.definitionOfDone.map((_, i) => `cap:${milestone.n}:${i}`);
  const capDone = doneCount(capKeys, progress.completed);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {/* localStorage may be disabled */ } }, [progress]);
  useEffect(() => { document.title = `W${String(week.week).padStart(2, '0')} / ROADMAP — AI Systems Engineering`; }, [week.week]);
  function toggle(key: string) { setProgress(p => ({ ...p, startedAt: p.startedAt || new Date().toISOString(), completed: { ...p.completed, [key]: !p.completed[key] } })); }
  function selectWeek(n: number) { setProgress(p => ({ ...p, currentWeek: Math.max(1, Math.min(28, n)) })); setExpandedExercise(null); setShowStretch(false); setNoteDraft(''); setWeekTab('knowledge'); setView('week'); }
  function saveNote() { const body = noteDraft.trim(); if (!body) return; setProgress(p => ({ ...p, notes: [...p.notes, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, week: week.week, kind: noteKind, body, createdAt: new Date().toISOString() }] })); setNoteDraft(''); setNotice('Note saved to this week.'); }
  function removeNote(id: string) { setProgress(p => ({ ...p, notes: p.notes.filter(n => n.id !== id) })); }
  function onImport(file: File | undefined) { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)) as Partial<ProgressData>; if (!parsed || !parsed.completed || typeof parsed.completed !== 'object' || !Array.isArray(parsed.notes)) throw new Error('Invalid progress file'); const allowed = new Set([...keys, ...DATA.capstones.flatMap(c => c.definitionOfDone.map((_, i) => `cap:${c.n}:${i}`))]); const safe: ProgressData = { completed: Object.fromEntries(Object.entries(parsed.completed).filter(([k, v]) => allowed.has(k) && typeof v === 'boolean')), notes: parsed.notes.filter(n => n && typeof n.body === 'string' && typeof n.week === 'number' && n.week >= 1 && n.week <= 28).slice(0, 3000), currentWeek: typeof parsed.currentWeek === 'number' && parsed.currentWeek >= 1 && parsed.currentWeek <= 28 ? parsed.currentWeek : 1, startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : null }; setProgress(safe); setNotice('Progress imported successfully.'); } catch { setNotice('Could not import: select a valid roadmap progress JSON file.'); } }; reader.readAsText(file); }
  function reset() { if (window.confirm('Reset all knowledge, exercise progress, capstone checklists, and notes? This cannot be undone.')) { setProgress(blank); setNotice('Progress reset.'); } }
  const resources = useMemo(() => {
    const tracks = new Map<string, Set<Track>>(); const weeks = new Map<string, Set<number>>();
    for (const w of DATA.weeks) for (const l of w.learningMaterials) { const t = tracks.get(l.resourceId) || new Set<Track>(); t.add(l.track); tracks.set(l.resourceId, t); const a = weeks.get(l.resourceId) || new Set<number>(); a.add(w.week); weeks.set(l.resourceId, a); }
    return Object.values(DATA.resourceCatalog).map(r => ({ ...r, tracks: [...(tracks.get(r.id) || [])], weeks: [...(weeks.get(r.id) || [])] }));
  }, []);
  const visibleResources = resources.filter(r => {
    if (resourceFilter !== 'all' && !r.tracks.includes(resourceFilter)) return false;
    if (!resourceQuery.trim()) return true;
    return `${r.title} ${r.type} ${r.weeks.join(' ')} ${r.tracks.map(trackName).join(' ')}`.toLowerCase().includes(resourceQuery.toLowerCase().trim());
  });
  const nextUndone = DATA.weeks.find(w => workKeys(w).some(k => !progress.completed[k]))?.week || 28;
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="topbar">
      <div className="brand"><span className="brand-symbol" aria-hidden="true"><span /><span /><span /><span /></span><span className="brand-name">ROADMAP<span className="brand-period">.</span></span><span className="brand-subtitle">AI SYSTEMS / GO-FIRST</span></div>
      <nav className="top-nav" aria-label="Main navigation">
        {([{ id: 'week', name: 'WEEK', icon: Layers3 }, { id: 'library', name: 'LIBRARY', icon: BookOpen }, { id: 'capstones', name: 'CAPSTONES', icon: Flag }] as const).map(t => <button key={t.id} type="button" aria-current={view === t.id ? 'page' : undefined} className={`nav-button ${view === t.id ? 'active' : ''}`} onClick={() => setView(t.id)}><t.icon size={14} />{t.name}</button>)}
      </nav>
      <div className="top-actions"><button type="button" className="icon-button" onClick={() => download('roadmap-progress.json', progress)} aria-label="Export progress JSON" title="Export progress JSON"><ArrowDownToLine size={17} /></button><button type="button" className="icon-button" onClick={() => importRef.current?.click()} aria-label="Import progress JSON" title="Import progress JSON"><Upload size={17} /></button><input ref={importRef} className="sr-only" type="file" accept="application/json,.json" onChange={e => { onImport(e.target.files?.[0]); e.target.value = ''; }} /><button type="button" className="icon-button muted-action" onClick={reset} aria-label="Reset all progress" title="Reset all progress"><RotateCcw size={16} /></button></div>
    </header>
    {notice && <div className="notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
    <main id="main-content">
      <div className="hero">
        <div className="hero-heading"><div><Eyebrow>ENGINEERING FIELD GUIDE <span className="separator">/</span> 2026 EDITION</Eyebrow><h1>Build systems.<br /><span>Not just models.</span></h1><p>A 28-week, evidence-driven path to AI Platform Engineering.</p></div><div className="hero-stat"><Eyebrow>OVERALL COMPLETION</Eyebrow><strong>{String(percent).padStart(2, '0')}<span>%</span></strong><div className="hero-stat-foot">{completed} of {keys.length} checkpoints cleared</div><div className="progress-track"><div style={{ width: `${percent}%` }} /></div></div></div>
        <div className="timeline-head"><div><Eyebrow>YOUR PROGRESSION</Eyebrow><span className="timeline-meta">MONTH {String(week.month).padStart(2, '0')} <span className="separator">·</span> WEEK {String(week.week).padStart(2, '0')} / 28</span></div><button type="button" onClick={() => selectWeek(nextUndone)} className="small-link">RESUME NEXT OPEN <ArrowRight size={14} /></button></div>
        <div className="timeline-months" role="navigation" aria-label="Jump to week">
          {DATA.weeks.map(w => { const count = doneCount(workKeys(w), progress.completed); return <button key={w.week} type="button" aria-label={`Week ${w.week}, ${count} of ${workKeys(w).length} complete`} aria-current={view === 'week' && week.week === w.week ? 'step' : undefined} onClick={() => selectWeek(w.week)} className={`week-slot ${count === workKeys(w).length ? 'is-done' : ''} ${week.week === w.week ? 'is-current' : ''}`} title={`Week ${w.week}: ${shortText(w.goal, 95)}`}><span className="week-slot-number">{w.week}</span><span className="week-slot-bar" /></button> })}
        </div>
        <div className="month-legend">{MONTHS.map((m, i) => <button key={m} type="button" onClick={() => selectWeek(i * 4 + 1)} className={week.month === i + 1 ? 'month-active' : ''}>M{i + 1}<span className="month-full"> {m}</span></button>)}</div>
      </div>

      {view === 'week' && <div className="content-grid"><section className="primary-column">
        <div className="week-overview"><div className="overview-top"><div><Eyebrow>MONTH {String(week.month).padStart(2, '0')} <span className="separator">/</span> {MONTHS[week.month - 1]}</Eyebrow><h2>Week {String(week.week).padStart(2, '0')} <span className="title-arrow">/</span> <span className="overview-title">{week.goal.replace(/\.$/, '')}</span></h2></div><div className="week-hour"><Clock3 size={16} /><b>{week.weeklyCoreHours}H</b><span>CORE</span></div></div>
          <div className="week-progress-line"><div className="thin-track"><span style={{ width: `${weekPct}%` }} /></div><span>{weekDone} / {weekKeys.length} TOTAL CHECKPOINTS</span></div>
          <div className="weekly-meters" aria-label="Week mastery and practice progress">
            <button type="button" className="weekly-meter" onClick={() => setWeekTab('knowledge')} aria-label={`Open knowledge checklist: ${knownDone} of ${knownKeys.length} known`}>
              <span><BrainIcon /> KNOWLEDGE</span><strong>{knownDone}<i>/</i>{knownKeys.length}</strong>
              <div className="thin-track"><span style={{ width: `${knownDone / knownKeys.length * 100}%` }} /></div>
            </button>
            <button type="button" className="weekly-meter" onClick={() => setWeekTab('work')} aria-label={`Open practical work: ${practicalDone} of ${practicalKeys.length} checkpoints done`}>
              <span><ListChecks size={14} /> PRACTICE & EVIDENCE</span><strong>{practicalDone}<i>/</i>{practicalKeys.length}</strong>
              <div className="thin-track"><span style={{ width: `${practicalDone / practicalKeys.length * 100}%` }} /></div>
            </button>
          </div>
          <div className="week-tabs" role="group" aria-label="Week sections">{([{ id: 'knowledge', label: `TO KNOW · ${knownDone}/${knownKeys.length}`, icon: BrainIcon }, { id: 'work', label: 'EXERCISES', icon: ListChecks }, { id: 'resources', label: `RESOURCES · ${week.learningMaterials.length}`, icon: BookOpen }, { id: 'journal', label: `NOTES · ${weekNotes.length}`, icon: NotebookPen }] as const).map(t => <button type="button" aria-pressed={weekTab === t.id} key={t.id} onClick={() => setWeekTab(t.id)} className={weekTab === t.id ? 'selected' : ''}><t.icon size={14} />{t.label}</button>)}</div>
        </div>
        {weekTab === 'knowledge' && <KnowledgeChecklist week={week} completed={progress.completed} toggle={toggle} onPractice={() => setWeekTab('work')} />}
        {weekTab === 'work' && <>
          <div className="section-block"><SectionTitle kicker="01 / LEARN → IMPLEMENT" title="Core exercises" extra={<span className="small-count">{week.exercises.filter(e => progress.completed[`ex:${e.id}`]).length} OF {week.exercises.length} DONE</span>} /><div className="exercise-list">{week.exercises.map((exercise, i) => <div className={`exercise-card ${progress.completed[`ex:${exercise.id}`] ? 'exercise-done' : ''}`} key={exercise.id}>
            <div className="exercise-top"><span className="exercise-index">0{i + 1}</span><TrackMark track={exercise.track} /><span className="exercise-hours"><Clock3 size={12} />{exercise.estimatedHours}H</span><CheckToggle checked={!!progress.completed[`ex:${exercise.id}`]} onChange={() => toggle(`ex:${exercise.id}`)} label={`${trackName(exercise.track)} exercise: ${shortText(exercise.task, 90)}`} /></div>
            <div className="exercise-copy"><p>{stripMd(exercise.task)}</p><button type="button" className="detail-toggle" aria-expanded={expandedExercise === exercise.id} onClick={() => setExpandedExercise(expandedExercise === exercise.id ? null : exercise.id)}>VERIFICATION & OUTPUT <ChevronDown size={14} className={expandedExercise === exercise.id ? 'turned' : ''} /></button>{expandedExercise === exercise.id && <div className="exercise-details"><div><Eyebrow>HOW TO VERIFY</Eyebrow><p>{exercise.verification}</p></div><div><Eyebrow>COMMIT ARTIFACT</Eyebrow><code>{exercise.artifact}</code></div></div>}</div>
          </div>)}</div></div>
          <div className="build-card"><div className="build-top"><span className="build-flag"><Code2 size={15} /> 02 / INTEGRATE & SHIP</span><div className="build-control"><span>{week.integratedBuild.estimatedHours}H</span><CheckToggle checked={!!progress.completed[`build:${week.week}`]} onChange={() => toggle(`build:${week.week}`)} label="Integrated build" /></div></div><h3>This week’s deliverable</h3><p>{week.integratedBuild.task}</p><div className="build-artifact"><FileCode2 size={15} /><code>{week.integratedBuild.artifact}</code></div></div>
          <section className="section-block gates-section"><SectionTitle kicker="03 / QUALITY GATE" title="Definition of done" extra={<ShieldCheck size={18} className="muted-icon" />} /><p className="section-subtitle">Verify each condition before considering the week complete.</p><div className="gate-list">{week.definitionOfDone.map((g, i) => <label className="gate-row" key={i}><input type="checkbox" checked={!!progress.completed[`gate:${week.week}:${i}`]} onChange={() => toggle(`gate:${week.week}:${i}`)} /><span className="gate-check"><Check size={13} /></span><span>{g}</span></label>)}</div>
            <button type="button" className="stretch-toggle" aria-expanded={showStretch} onClick={() => setShowStretch(v => !v)}><Sparkles size={15} /> OPTIONAL STRETCH <span>{week.optionalStretch.estimatedAdditionalHours} EXTRA</span><ChevronDown size={14} className={showStretch ? 'turned' : ''} /></button>{showStretch && <p className="stretch-description">{week.optionalStretch.task} <span>Not counted toward the 20-hour core budget.</span></p>}
          </section>
        </>}
        {weekTab === 'resources' && <WeekResources week={week} />}
        {weekTab === 'journal' && <Journal notes={weekNotes} draft={noteDraft} onDraft={setNoteDraft} kind={noteKind} onKind={setNoteKind} onSave={saveNote} onDelete={removeNote} />}
        <div className="week-bottom-nav"><button type="button" disabled={week.week === 1} onClick={() => selectWeek(week.week - 1)}><ArrowLeft size={16} /> PREVIOUS WEEK</button><span>W{String(week.week).padStart(2, '0')} / 28</span><button type="button" disabled={week.week === 28} onClick={() => selectWeek(week.week + 1)}>NEXT WEEK <ArrowRight size={16} /></button></div>
      </section><aside className="aside-column">
          <div className="aside-card milestone-card"><div className="aside-header"><Eyebrow>ACTIVE MILESTONE</Eyebrow><span className="milestone-number">0{milestone.n} / 07</span></div><div className="milestone-mark"><Flag size={19} /></div><h3>{milestone.title}</h3><p>{milestone.description}</p><div className="milestone-progress"><span>{capDone} / {capKeys.length} ACCEPTANCE CRITERIA</span><span>{Math.round(capDone / capKeys.length * 100)}%</span></div><div className="thin-track"><span style={{ width: `${capDone / capKeys.length * 100}%` }} /></div><div className="cap-requirements">{milestone.definitionOfDone.map((requirement, i) => <label key={i}><input type="checkbox" checked={!!progress.completed[`cap:${milestone.n}:${i}`]} onChange={() => toggle(`cap:${milestone.n}:${i}`)} /><span className="mini-check"><Check size={11} /></span><span>{requirement}</span></label>)}</div>{milestone.deferredFeatures.length > 0 && <details className="deferred"><summary>Deferred to later weeks <ChevronDown size={14} /></summary>{milestone.deferredFeatures.map(d => <p key={d.feature}><span>W{d.week}</span> {d.feature}</p>)}</details>}<div className="milestone-footer"><span>WEEKS {milestone.weeks[0]}–{milestone.exitWeek}</span><button type="button" onClick={() => setView('capstones')}>ALL CAPSTONES <ArrowUpRight size={14} /></button></div></div>
          <div className="aside-card"><div className="aside-header"><Eyebrow>WEEKLY CADENCE</Eyebrow><span>20H / WEEK</span></div><div className="cadence-list">{DATA.workflow.weeklySessions.map(session => <div key={session.day} className="cadence-row"><span>{session.day.slice(0, 3).toUpperCase()}</span><div className="cadence-bar"><i style={{ width: `${session.hours / 6 * 100}%` }} /></div><b>{session.hours ? `${session.hours}H` : 'REST'}</b></div>)}</div><p className="aside-footnote">12h Go & systems · 5h AI platform · 3h ML runtime, including integration.</p></div>
          <div className="aside-card quick-note"><div className="aside-header"><Eyebrow>QUICK CAPTURE / WEEK {week.week}</Eyebrow><MessageSquareText size={16} /></div><textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={4} placeholder="An insight, failure, open question, or design tradeoff..." aria-label="Write a learning note" /><div className="quick-note-actions"><select value={noteKind} onChange={e => setNoteKind(e.target.value as NoteKind)} aria-label="Note category">{NOTE_KINDS.map(k => <option key={k}>{k}</option>)}</select><button disabled={!noteDraft.trim()} type="button" onClick={saveNote}><Plus size={14} /> SAVE NOTE</button></div><button type="button" onClick={() => setWeekTab('journal')} className="see-notes">VIEW {weekNotes.length} SAVED NOTES <ArrowRight size={13} /></button></div>
        </aside></div>}
      {view === 'library' && <section className="wide-view"><div className="wide-view-heading"><div><Eyebrow>REFERENCE SYSTEM / 57 SOURCES</Eyebrow><h2>Learning library<span className="dot">.</span></h2><p>Focused sources from the resource guide, mapped directly to the weeks where you need them.</p></div><div className="library-summary"><BookOpen size={26} /><strong>{resources.length}</strong><span>CURATED REFERENCES</span></div></div><div className="library-controls"><div className="search-box"><Search size={18} /><input aria-label="Search learning resources" placeholder="Search topics, source names, week numbers..." value={resourceQuery} onChange={e => setResourceQuery(e.target.value)} /></div><div className="filter-chips" role="group" aria-label="Filter by track">{(['all', 'go', 'ai', 'ml'] as const).map(t => <button key={t} type="button" className={resourceFilter === t ? 'active' : ''} aria-pressed={resourceFilter === t} onClick={() => setResourceFilter(t)}>{t === 'all' ? 'ALL' : TRACKS[t].label}</button>)}</div></div><div className="library-count">SHOWING {visibleResources.length} / {resources.length} RESOURCES</div>{visibleResources.length === 0 ? <div className="empty-view">No resources match your search. Try a broader term or another track.</div> : <div className="resource-grid">{visibleResources.map(r => <ResourceCard key={r.id} resource={r} onWeek={selectWeek} />)}</div>}</section>}
      {view === 'capstones' && <section className="wide-view"><div className="wide-view-heading"><div><Eyebrow>THE WORK THAT PROVES IT</Eyebrow><h2>Seven capstones<span className="dot">.</span></h2><p>One growing platform. Each milestone has an acceptance checklist, evidence and explicit deferred work.</p></div><div className="library-summary"><Target size={26} /><strong>{DATA.capstones.filter(c => c.definitionOfDone.every((_, i) => progress.completed[`cap:${c.n}:${i}`])).length}<span className="out-of">/7</span></strong><span>MILESTONES VERIFIED</span></div></div><div className="capstone-grid">{DATA.capstones.map(cap => <CapstonePanel key={cap.n} c={cap} completed={progress.completed} toggle={toggle} onWeek={selectWeek} />)}</div></section>}
    </main><footer className="site-footer"><div><span className="footer-dot" /> ROADMAP / AI SYSTEMS ENGINEERING</div><span>28 WEEKS <span className="separator">·</span> 560 PLANNED HOURS <span className="separator">·</span> ONE PLATFORM</span><span>DATA SAVED LOCALLY IN THIS BROWSER</span></footer>
  </div>;
}

function BrainIcon() { return <BookOpen size={14} aria-hidden="true" />; }
function KnowledgeChecklist({ week, completed, toggle, onPractice }: { week: Week; completed: Record<string, boolean>; toggle: (id: string) => void; onPractice: () => void }) {
  const all = week.knowledgeChecklist;
  const mastered = all.filter(item => completed[`know:${item.id}`]).length;
  return <section className="section-block knowledge-section" aria-label={`Week ${week.week} knowledge checklist`}>
    <SectionTitle kicker="01 / CONCEPT MASTERY" title="Things to know" extra={<span className="small-count">{mastered} OF {all.length} KNOWN</span>} />
    <p className="section-subtitle">Read the self-check question, answer it <strong>without notes</strong>, then mark the concept as known. These are independent from the coding exercises.</p>
    <div className="knowledge-progress" role="status" aria-live="polite"><span>{mastered === all.length ? 'All concepts reviewed. Now verify them through the exercises.' : `${all.length - mastered} concepts left to review`}</span><span>{Math.round(mastered / all.length * 100)}%</span></div>
    <div className="thin-track knowledge-main-track"><span style={{ width: `${mastered / all.length * 100}%` }} /></div>
    <div className="knowledge-groups">
      {(['go', 'ai', 'ml'] as Track[]).map(track => {
        const items = all.filter(item => item.track === track);
        const count = items.filter(item => completed[`know:${item.id}`]).length;
        return <div key={track} className="knowledge-group">
          <div className="knowledge-group-header"><TrackMark track={track} /><span>{count} / {items.length} KNOWN</span></div>
          <div className="knowledge-items">
            {items.map((item, index) => {
              const isDone = !!completed[`know:${item.id}`];
              return <div className={`knowledge-item ${isDone ? 'known' : ''}`} key={item.id}>
                <div className="knowledge-main">
                  <CheckToggle checked={isDone} onChange={() => toggle(`know:${item.id}`)} label={item.objective} />
                  <div className="knowledge-main-content"><span className="knowledge-count">{String(index + 1).padStart(2, '0')}</span><p>{item.objective}</p></div>
                  <span className="knowledge-state">{isDone ? 'KNOWN' : 'TO LEARN'}</span>
                </div>
                <details className="knowledge-selftest"><summary>SELF-CHECK QUESTION <ChevronDown size={14} /></summary><p>{item.selfCheck}</p></details>
              </div>;
            })}
          </div>
        </div>;
      })}
    </div>
    <div className="knowledge-next-step"><div><strong>Ready to practice?</strong><p>Knowing the terms isn't the finish line. Complete the exercises and weekly definition of done to verify your understanding.</p></div><button type="button" onClick={onPractice}>OPEN EXERCISES <ArrowRight size={15} /></button></div>
  </section>;
}

function WeekResources({ week }: { week: Week }) {
  return <section className="section-block week-resources"><SectionTitle kicker="READ LESS / BUILD MORE" title="Learning materials" extra={<span className="small-count">{week.learningMaterials.length} SOURCES</span>} /><p className="section-subtitle">Required references first. Optional reading is there when you need to go deeper.</p>{(['go', 'ai', 'ml'] as Track[]).map(track => { const items = week.learningMaterials.filter(r => r.track === track); return <div className="resource-track" key={track}><div className="resource-track-head"><TrackMark track={track} /><span>{items.length} RESOURCES</span></div>{items.map(l => { const r = DATA.resourceCatalog[l.resourceId]; return r ? <a className="resource-link-row" href={r.url} target="_blank" rel="noopener noreferrer" key={l.resourceId}><div><strong>{r.title}</strong><span>{l.required ? 'REQUIRED' : 'OPTIONAL'} · {r.type.toUpperCase()}</span></div><ArrowUpRight size={17} /></a> : null; })}</div> })}<div className="source-guide"><Eyebrow>FROM THE ATTACHED RESOURCE GUIDE</Eyebrow>{week.sourceGuideSections.map(s => <p key={s}>{s}</p>)}</div></section>
}
function Journal({ notes, draft, onDraft, kind, onKind, onSave, onDelete }: { notes: Note[]; draft: string; onDraft: (v: string) => void; kind: NoteKind; onKind: (v: NoteKind) => void; onSave: () => void; onDelete: (id: string) => void }) {
  return <section className="section-block journal-panel"><SectionTitle kicker="WORKING MEMORY / CAPTURE YOUR REASONING" title="Engineering journal" /><p className="section-subtitle">Record the mistakes, tradeoffs and discoveries that will become your interview stories.</p><div className="journal-compose"><div className="kind-chips" role="group" aria-label="Note category">{NOTE_KINDS.map(k => <button className={k === kind ? 'active' : ''} key={k} onClick={() => onKind(k)} type="button" aria-pressed={k === kind}>{k}</button>)}</div><textarea value={draft} onChange={e => onDraft(e.target.value)} placeholder="What changed your understanding today? What evidence do you have?" aria-label="Note content" rows={5} /><div className="compose-footer"><span>{draft.length} CHARACTERS</span><button type="button" disabled={!draft.trim()} onClick={onSave}><Plus size={15} /> SAVE ENTRY</button></div></div><div className="journal-list"><Eyebrow>ENTRIES / {notes.length}</Eyebrow>{notes.length === 0 ? <div className="empty-view"><NotebookPen size={25} /><p>No notes for this week yet. Start with one surprising behavior you discovered while debugging.</p></div> : notes.map(n => <article className="note-entry" key={n.id}><div><span className="note-kind">{n.kind}</span><time>{new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time><button type="button" onClick={() => onDelete(n.id)} aria-label="Delete note"><Trash2 size={14} /></button></div><p>{n.body}</p></article>)}</div></section>;
}
function ResourceCard({ resource: r, onWeek }: { resource: Resource & { tracks: Track[], weeks: number[] }; onWeek: (n: number) => void }) {
  return <article className="library-card"><div className="library-card-top"><BookOpen size={19} /><span>{r.type.toUpperCase()}</span></div><h3><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}<ArrowUpRight size={15} /></a></h3><div className="library-card-footer"><div>{r.tracks.map(t => <span className={`tiny-track track-${t}`} key={t}>{TRACKS[t].short}</span>)}</div><div>{r.weeks.slice(0, 3).map(n => <button type="button" key={n} onClick={() => onWeek(n)} aria-label={`Open week ${n}`}>W{n}</button>)}{r.weeks.length > 3 && <span>+{r.weeks.length - 3}</span>}</div></div></article>;
}
function CapstonePanel({ c, completed, toggle, onWeek }: { c: Capstone; completed: Record<string, boolean>; toggle: (k: string) => void; onWeek: (n: number) => void }) {
  const count = c.definitionOfDone.filter((_, i) => completed[`cap:${c.n}:${i}`]).length;
  return <article className={`capstone-panel ${count === c.definitionOfDone.length ? 'capstone-verified' : ''}`}><div className="capstone-panel-head"><span>CAPSTONE / {String(c.n).padStart(2, '0')}</span><span>W{c.weeks[0]}—W{c.exitWeek}</span></div><div className="capstone-panel-title"><span className="capstone-icon"><Flag size={20} /></span><h3>{c.title}</h3></div><p className="capstone-panel-desc">{c.description}</p><div className="capstone-status"><span>{stateWord(count, c.definitionOfDone.length)}</span><span>{count}/{c.definitionOfDone.length} VERIFIED</span></div><div className="thin-track"><span style={{ width: `${count / c.definitionOfDone.length * 100}%` }} /></div><div className="capstone-panel-list">{c.definitionOfDone.map((g, i) => <label key={i}><input type="checkbox" checked={!!completed[`cap:${c.n}:${i}`]} onChange={() => toggle(`cap:${c.n}:${i}`)} /><span className="mini-check"><Check size={12} /></span><span>{g}</span></label>)}</div>{c.deferredFeatures.length > 0 && <details className="capstone-deferred"><summary>DEFERRED FEATURES <ChevronDown size={14} /></summary>{c.deferredFeatures.map(f => <div key={f.feature}><span>W{f.week}</span>{f.feature}</div>)}</details>}<button className="capstone-open" type="button" onClick={() => onWeek(c.weeks[0])}>OPEN WEEKS {c.weeks[0]}–{c.exitWeek} <ArrowRight size={15} /></button></article>;
}
export default App;
