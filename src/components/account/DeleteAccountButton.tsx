'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteAccount } from '@/lib/actions/account';

const CONFIRM_PHRASE = 'delete my account';

export function DeleteAccountButton() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    if (pending) return;
    const phrase = window.prompt(
      `This permanently deletes your account and ALL your data.\n\nType "${CONFIRM_PHRASE}" to confirm:`,
    );
    if (phrase?.trim().toLowerCase() !== CONFIRM_PHRASE) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount();
        router.push('/login');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        variant="destructive"
        type="button"
        disabled={pending}
        onClick={handleClick}
        data-testid="delete-account"
      >
        {pending ? 'Deleting…' : 'Delete account'}
      </Button>
    </div>
  );
}
