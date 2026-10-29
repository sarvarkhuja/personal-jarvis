'use client';

import { useState, type ComponentProps, type ReactNode } from 'react';
import { WeekHeader } from './WeekHeader';

export type WeekTab = 'concepts' | 'practice' | 'reading' | 'notes';
const TABS: WeekTab[] = ['concepts', 'practice', 'reading', 'notes'];

/**
 * Tab bar plus all four panels stacked in one grid cell: the cell is as tall as the
 * tallest panel, so switching tabs never changes the page height or the scroll position.
 */
export function WeekWorkspace({ initialTab, panels, ...header }: {
  initialTab: WeekTab;
  panels: Record<WeekTab, ReactNode>;
} & Omit<ComponentProps<typeof WeekHeader>, 'tab' | 'onTab'>) {
  const [tab, setTab] = useState<WeekTab>(initialTab);

  const select = (next: WeekTab) => {
    setTab(next);
    window.history.replaceState(null, '', `/roadmap?w=${header.week}&t=${next}`);
  };

  return (
    <>
      <WeekHeader {...header} tab={tab} onTab={select} />
      <div className="grid">
        {TABS.map((t) => (
          <div
            key={t}
            role="tabpanel"
            id={`week-panel-${t}`}
            aria-labelledby={`week-tab-${t}`}
            aria-hidden={tab !== t}
            inert={tab !== t}
            className={`col-start-1 row-start-1 space-y-4 ${tab === t ? '' : 'invisible'}`}
          >
            {panels[t]}
          </div>
        ))}
      </div>
    </>
  );
}
