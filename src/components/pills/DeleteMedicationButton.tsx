'use client';

import * as React from 'react';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteMedication } from '@/lib/actions/medications';

type Props = {
  medicationId: string;
  medicationName: string;
};

export function DeleteMedicationButton({ medicationId, medicationName }: Props) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    if (pending) return;
    if (!window.confirm(`Delete "${medicationName}"? This also removes its logs.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteMedication({ id: medicationId });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete medication');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        aria-label={`Delete ${medicationName}`}
        data-testid={`delete-medication-${medicationId}`}
        disabled={pending}
        onClick={handleClick}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}
