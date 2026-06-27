'use client';

import * as React from 'react';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteBodyMetrics } from '@/lib/actions/body-metrics';

export function DeleteBodyMetricsButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    if (pending) return;
    if (!window.confirm(`Delete body metrics for ${label}?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteBodyMetrics({ id });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button variant="ghost" size="icon-sm" type="button" disabled={pending} onClick={handleClick} aria-label="Delete">
        <Trash2Icon />
      </Button>
    </div>
  );
}
