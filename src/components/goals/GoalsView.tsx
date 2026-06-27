'use client';

import { useState } from 'react';
import { buildGoalTree, daysBetween } from '@/lib/domain/goals';
import {
  countdownFor,
  normalizeStatus,
  TONE_TEXT,
  type GoalStatusValue,
} from '@/lib/domain/goal-display';
import { GoalCard } from './GoalCard';
import { GoalsFilter } from './GoalsFilter';
import { AddGoalSheet } from './AddGoalSheet';

export type GoalRecord = {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatusValue;
  target_date: string | null;
  parent_goal_id: string | null;
  linked_habit_id: string | null;
  created_at?: string;
};

type Option = { id: string; label: string };

const fmtDay = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`)
    .toLocaleString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
    .toUpperCase();

const fmtMonth = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`)
    .toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

export function GoalsView({
  allGoals,
  habitOptions,
  goalOptions,
  filter,
  today,
}: {
  allGoals: GoalRecord[];
  habitOptions: Option[];
  goalOptions: Option[];
  filter: string;
  today: string;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const habitNameById = new Map(habitOptions.map((h) => [h.id, h.label]));

  // ── status ledger (always from the full set, never the filter) ────────────
  const counts = { active: 0, done: 0, abandoned: 0, paused: 0 };
  for (const g of allGoals) counts[normalizeStatus(g.status)]++;

  // ── active trajectory ─────────────────────────────────────────────────────
  const active = allGoals.filter((g) => normalizeStatus(g.status) === 'active');
  const dated = active
    .filter((g) => g.target_date)
    .map((g) => ({ g, days: daysBetween(today, g.target_date as string) }))
    .sort((a, b) => a.days - b.days);
  const undatedCount = active.length - dated.length;
  const overdueCount = dated.filter((d) => d.days < 0).length;
  const nearest = dated[0] ?? null;
  const furthest = dated[dated.length - 1] ?? null;
  const rangeDays = Math.max(furthest ? furthest.days : 0, 1);

  const markers = dated.map((d) => {
    const cd = countdownFor(d.g.target_date, today, 'active');
    const raw = d.days < 0 ? 0 : (d.days / rangeDays) * 100;
    return {
      id: d.g.id,
      title: d.g.title,
      pos: Math.min(100, Math.max(0, raw)),
      tone: cd.tone,
      label: cd.label,
    };
  });
  const nearestMarker = markers[0] ?? null;
  const ann =
    (hoveredId ? markers.find((m) => m.id === hoveredId) : nearestMarker) ?? null;

  // ── hero number / copy ────────────────────────────────────────────────────
  let heroNum = '0';
  let heroUnit = 'ACTIVE GOALS';
  let heroNumCls = 'text-text-display';
  let heroSentence = '';

  if (active.length === 0) {
    heroNum = String(counts.done);
    heroUnit = counts.done === 1 ? 'GOAL DONE' : 'GOALS DONE';
    heroSentence =
      allGoals.length === 0
        ? 'No goals yet. Set the first thing you’re working toward.'
        : 'Nothing active right now — every goal is settled. Add the next one.';
  } else if (nearest) {
    const days = nearest.days;
    heroNum = String(Math.abs(days));
    heroUnit =
      days < 0 ? 'DAYS OVERDUE' : days === 0 ? 'DUE TODAY' : 'DAYS TO NEAREST';
    heroNumCls = days <= 0 ? 'text-accent' : 'text-text-display';
    const plural = active.length === 1 ? 'goal' : 'goals';
    heroSentence =
      days < 0
        ? `${overdueCount} past due — “${nearest.g.title}” is ${-days} day${-days === 1 ? '' : 's'} overdue.`
        : days === 0
          ? `“${nearest.g.title}” is due today. ${active.length} active ${plural}.`
          : `${active.length} active ${plural} · next up “${nearest.g.title}” in ${days} day${days === 1 ? '' : 's'}.`;
  } else {
    // Active goals, but none carry a deadline.
    heroNum = String(active.length);
    heroUnit = active.length === 1 ? 'ACTIVE GOAL' : 'ACTIVE GOALS';
    heroSentence =
      'No deadlines set yet — add target dates to plot them on the horizon.';
  }

  // ── filtered cards ────────────────────────────────────────────────────────
  const filtered =
    filter === 'all'
      ? allGoals
      : allGoals.filter((g) => normalizeStatus(g.status) === filter);
  const tree = buildGoalTree(filtered);

  return (
    <div className="w-full space-y-4 px-4 py-8">
      {/* ── HORIZON — full-width signature instrument ───────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-6 md:p-8">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            [ HORIZON · {fmtMonth(today)} ]
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
            {counts.active} ACTIVE · {counts.done} DONE
            {overdueCount > 0 && (
              <span className="text-accent"> · {overdueCount} OVERDUE</span>
            )}
          </span>
        </div>

        {/* hero number — the only Doto on the page */}
        <div className="mb-6 flex items-baseline gap-3">
          <span
            className={`font-doto text-6xl font-bold leading-none tracking-tight md:text-[80px] ${heroNumCls}`}
          >
            {heroNum}
          </span>
          <div className="flex min-w-0 flex-col gap-1 pb-1">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-disabled">
              {heroUnit}
            </span>
            {nearest && active.length > 0 && (
              <span className="truncate font-sans text-[13px] text-text-secondary">
                {nearest.g.title}
              </span>
            )}
          </div>
        </div>

        {/* the horizon strip — dated active goals plotted against time */}
        {markers.length > 0 ? (
          <div className="mb-4">
            {/* hover/focus annotation (height reserved → no layout shift) */}
            <div
              role="status"
              aria-live="polite"
              className="mb-3 h-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary"
            >
              {ann && (
                <>
                  {ann.title} ·{' '}
                  <span className={TONE_TEXT[ann.tone]}>{ann.label}</span>
                </>
              )}
            </div>

            {/* track */}
            <div className="relative h-12">
              <div
                aria-hidden
                className="absolute bottom-4 left-0 right-0 h-px bg-border-visible"
              />
              {/* today origin tick */}
              <div
                aria-hidden
                className="absolute bottom-4 left-0 h-4 w-[2px] bg-text-secondary"
              />
              {markers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  style={{ left: `${m.pos}%` }}
                  onMouseEnter={() => setHoveredId(m.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(m.id)}
                  onBlur={() => setHoveredId(null)}
                  aria-label={`${m.title}: ${m.label}`}
                  className="absolute bottom-4 flex h-8 w-4 -translate-x-1/2 items-end justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-text-primary"
                >
                  <span
                    className={`block h-4 w-[2px] transition-colors duration-200 ease-out motion-reduce:transition-none ${
                      m.tone === 'accent' ? 'bg-accent' : 'bg-text-primary'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* axis labels */}
            <div className="relative h-4">
              <span className="absolute left-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                TODAY
              </span>
              {furthest && (
                <span className="absolute right-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                  {fmtDay(furthest.g.target_date as string)}
                </span>
              )}
            </div>

            {undatedCount > 0 && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-disabled">
                + {undatedCount} DRIFTING · NO DEADLINE
              </p>
            )}
          </div>
        ) : (
          active.length > 0 && (
            <div className="mb-4 h-px bg-border" aria-hidden />
          )
        )}

        {/* the one human sentence */}
        <p className="font-sans text-[15px] leading-snug text-text-secondary">
          {heroSentence}
        </p>
      </section>

      {/* ── controls ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GoalsFilter />
        <AddGoalSheet habitOptions={habitOptions} goalOptions={goalOptions} />
      </div>

      {/* ── masonry of goal cards ───────────────────────────────────────────── */}
      {tree.length === 0 ? (
        <div
          data-testid="goals-empty"
          className="rounded-lg border border-border bg-surface p-12 text-center"
        >
          <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">
            NO GOALS MATCH THIS FILTER
          </p>
          <p className="mt-2 font-sans text-[13px] text-text-disabled">
            {filter === 'active'
              ? 'Add a goal to start tracking your horizon.'
              : 'Switch the filter or add a new goal.'}
          </p>
        </div>
      ) : (
        <div data-testid="goals-list" className="gap-4 lg:columns-2 xl:columns-3">
          {tree.map((root) => (
            <GoalCard
              key={root.id}
              node={root}
              today={today}
              habitNameById={habitNameById}
              habitOptions={habitOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
