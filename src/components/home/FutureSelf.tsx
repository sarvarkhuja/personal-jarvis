'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Pencil } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FocusConsole, type FocusConsoleProps } from '@/components/focus/FocusConsole';
import { cn } from '@/lib/utils';
import { saveSelfImage } from '@/lib/actions/self-images';
import { SELF_IMAGE_PILLARS, STARTER_SELF_IMAGES, type SelfImage, type SelfImageInput } from '@/lib/schemas/self-images';
import type { AttentionEvidence } from '@/lib/domain/future-self';

const label = 'font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary';
const control = 'min-h-11 rounded-full px-5 font-mono text-[11px] uppercase tracking-[0.06em]';
const pillarLinks = { ml: '/focus', physique: '/workout', work: '/goals', salah: '/salah', discipline: '/habits' };
const phases = ['Build the foundation', 'Make it your standard', 'Live the identity'];

export function FutureSelf({ images, evidence, evidenceAvailable, imagesAvailable, goal, focusOptions }: {
  images: SelfImage[];
  evidence: AttentionEvidence;
  evidenceAvailable: boolean;
  imagesAvailable: boolean;
  goal?: { id: string; title: string };
  focusOptions: Pick<FocusConsoleProps, 'goalOptions' | 'habitOptions'>;
}) {
  const [selected, setSelected] = useState<2 | 7 | 15>(2);
  const [editing, setEditing] = useState(false);
  const visions = STARTER_SELF_IMAGES.map((starter) => images.find((image) => image.months === starter.months) ?? starter);
  const vision = visions.find((item) => item.months === selected)!;
  const nextAction = goal ? `Take the next small step on: ${goal.title}` : 'Open my plan and finish one small, useful task';
  const focusUrl = (duration: number) => `/focus?${new URLSearchParams({ minutes: String(duration), intent: nextAction.slice(0, 280), ...(goal ? { goal: goal.id } : {}) })}`;

  return (
    <section aria-labelledby="future-self-title" className="flex flex-col gap-10 py-8 md:gap-12">
      <div className="grid items-end gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className={label}>[ Future self / built daily ]</p>
          <h2 id="future-self-title" className="mt-5 max-w-3xl font-doto text-[clamp(42px,5.6vw,80px)] font-medium leading-[1.05] tracking-tight text-text-display">
            Your future.{' '}<br />Built today.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-text-secondary">
            Less scrolling. More becoming. Give your attention to the person you want to be.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 lg:pb-1">
          <p className={label}>Today’s smallest promise</p>
          <p className="max-w-md text-base leading-relaxed text-text-primary">{nextAction}.</p>
          <Link href={focusUrl(25)} className={cn(buttonVariants(), control)}>
            Set up 25 min of focus <ArrowUpRight data-icon="inline-end" />
          </Link>
          <Link href={focusUrl(5)} className="inline-flex min-h-11 items-center text-sm text-text-secondary underline underline-offset-4 hover:text-text-primary">
            Hard day? Restart with 5 minutes.
          </Link>
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className={label}>01 / The person I’m becoming</h3>
          <span className={label}>Choose a horizon</span>
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-3" aria-label="Future self horizons">
          {visions.map((item, index) => (
            <Button key={item.months} variant="outline" aria-pressed={selected === item.months} aria-label={`${item.months} months: ${item.title}`}
              aria-controls="future-self-detail" onClick={() => { setSelected(item.months); setEditing(false); }}
              className={cn('h-auto min-w-0 flex-col items-stretch gap-6 whitespace-normal rounded-xl px-3 py-5 text-left font-normal transition-colors md:p-6',
                selected === item.months ? 'border-text-primary bg-surface dark:border-text-primary dark:bg-surface' : 'border-border-visible bg-transparent dark:border-border-visible dark:bg-transparent')}>
              <span className="flex items-start justify-between gap-3">
                <span className="flex flex-col gap-2 md:flex-row md:items-baseline"><span className="font-mono text-4xl tracking-tighter text-text-display md:text-5xl">{String(item.months).padStart(2, '0')}</span><span className={label}>months</span></span>
                <span aria-hidden className={cn('mt-2 hidden size-5 items-center justify-center rounded-full border md:flex', selected === item.months ? 'border-text-primary bg-text-primary text-background' : 'border-border-visible')}>{selected === item.months && <Check />}</span>
              </span>
              <span className="hidden flex-col gap-2 md:flex"><span className={label}>{phases[index]}</span><span className="text-base leading-relaxed text-text-primary">{item.title}</span></span>
            </Button>
          ))}
        </div>
        <div id="future-self-detail" className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          <div className="flex flex-col items-start gap-4">
            <p className={label}>Self-image / {selected} months from now</p>
            <p className="text-base font-medium text-text-display md:hidden">{vision.title}</p>
            <p className="max-w-lg text-base leading-relaxed text-text-primary">{vision.vision}</p>
            <Button variant="ghost" disabled={!imagesAvailable} onClick={() => setEditing(!editing)} aria-expanded={editing} aria-controls="vision-editor" className={cn(control, '-ml-5')}>
              <Pencil data-icon="inline-start" /> {editing ? 'Close editor' : 'Make it mine'}
            </Button>
            <p className={label}>{'id' in vision ? 'Your saved vision' : 'Suggested vision / make it yours'}</p>
            {!imagesAvailable && <p role="status" className="text-sm text-text-secondary">Saved visions are temporarily unavailable. Showing suggestions; try reloading.</p>}
          </div>
          <dl className="grid gap-x-6 sm:grid-cols-2">
            {SELF_IMAGE_PILLARS.map(({ key, label: title }) => (
              <div key={key} className="border-t border-border py-4">
                <dt className={label}><Link href={pillarLinks[key]} className="inline-flex min-h-7 items-center gap-1 hover:text-text-primary">{title}<ArrowUpRight className="size-3" /></Link></dt>
                <dd className="mt-2 text-sm leading-relaxed text-text-primary">{vision[key]}</dd>
              </div>
            ))}
          </dl>
        </div>
        {editing && <VisionEditor key={selected} vision={vision} />}
      </div>

      <div className="grid gap-8 border-t border-border pt-8 lg:grid-cols-2 lg:gap-12">
        <section aria-labelledby="attention-evidence">
          <h3 id="attention-evidence" className={label}>02 / How I’m actually going</h3>
          {evidenceAvailable ? <>
            <div className="mt-5 flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-5xl tracking-tighter text-text-display">{String(evidence.activeDays).padStart(2, '0')}</span>
              <span className="text-sm text-text-secondary">/ 14 days with focus logged</span>
            </div>
            <div className="mt-6 flex gap-1.5" aria-label="Focus minutes on each of the previous 14 days">
              {evidence.days.map((day) => <div key={day.date} title={`${day.date}: ${day.minutes} minutes logged`} className="flex h-10 flex-1 items-end bg-surface-raised">
                <span className="w-full bg-text-primary" style={{ height: `${Math.min(100, day.minutes / 25 * 100)}%` }} />
                <span className="sr-only">{day.date}: {day.minutes} minutes.</span>
              </div>)}
            </div>
            <div className={cn(label, 'mt-2 flex justify-between gap-3')}><span>14 completed days</span><span>Full bar = 25 min</span></div>
            <p className="mt-5 text-sm leading-relaxed text-text-secondary">
              {evidence.totalMinutes > 0 ? `${Math.round(evidence.totalMinutes)} minutes invested. ${Math.round(evidence.dailyAverage)} min/day on average.` : 'Your starting line. Complete a focus session to begin collecting evidence.'}
              {' '}An empty day means no focus was logged, not that you did nothing.
            </p>
            <p className="mt-3 text-sm text-text-primary">Today: {Math.round(evidence.todayMinutes)} minutes logged. {evidence.todayMinutes >= 25 ? 'Your daily focus promise is met.' : 'There is still room for one small step.'}</p>
          </> : <p role="status" className="mt-5 text-sm text-text-secondary">Focus history is unavailable right now. Reload to see your recent pace.</p>}
        </section>

        <section aria-labelledby="home-focus-session" className="min-w-0">
          <h3 id="home-focus-session" className={cn(label, 'mb-5')}>03 / Focus session</h3>
          <FocusConsole {...focusOptions} layout="stacked" />
        </section>
      </div>

    </section>
  );
}

function VisionEditor({ vision }: { vision: SelfImageInput | SelfImage }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState('');
  return <form id="vision-editor" aria-label={`Edit ${vision.months}-month self-image`} className="mt-6 flex flex-col gap-5 rounded-xl border border-border-visible bg-surface p-5" onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = { months: vision.months, title: String(form.get('title') ?? ''), vision: String(form.get('vision') ?? ''), ...Object.fromEntries(SELF_IMAGE_PILLARS.map(({ key }) => [key, String(form.get(key) ?? '')])) } as SelfImageInput;
    setStatus('');
    startTransition(async () => {
      try {
        const result = await saveSelfImage(input, 'id' in vision ? vision.id : undefined);
        setStatus(result.error ?? 'Saved. This is the direction you’re choosing.');
      } catch { setStatus('Could not save. Your edits are still here; please try again.'); }
    });
  }}>
    <p className={label}>Make your {vision.months}-month vision concrete</p>
    <fieldset disabled={pending} className="grid min-w-0 gap-5 sm:grid-cols-2">
      <label className="flex flex-col gap-2 sm:col-span-2"><span className={label}>Identity statement</span><Input name="title" required maxLength={100} defaultValue={vision.title} className="min-h-11" /></label>
      {[{ key: 'vision', label: 'How I see myself' }, ...SELF_IMAGE_PILLARS].map(({ key, label: title }) => <label key={key} className="flex flex-col gap-2"><span className={label}>{title}</span><textarea name={key} required maxLength={key === 'vision' ? 600 : 400} rows={4} defaultValue={vision[key as keyof SelfImageInput]} className="w-full resize-y rounded-md border border-border-visible bg-background p-3 text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-text-primary" /></label>)}
    </fieldset>
    <div className="flex flex-wrap items-center gap-4"><Button type="submit" disabled={pending} className={control}>{pending ? '[ Saving… ]' : 'Save my vision'}</Button><p role="status" className="text-sm text-text-secondary">{status}</p></div>
  </form>;
}
