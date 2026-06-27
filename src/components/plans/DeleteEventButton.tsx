'use client';

import * as React from 'react';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteEvent } from '@/lib/actions/events';

export function DeleteEventButton({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    if (pending) return;
    if (!window.confirm(`Delete "${eventTitle}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteEvent({ id: eventId });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        aria-label={`Delete ${eventTitle}`}
        data-testid={`delete-event-${eventId}`}
        disabled={pending}
        onClick={handleClick}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}
