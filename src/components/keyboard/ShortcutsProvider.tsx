'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

const PREFIX_TIMEOUT_MS = 1500;

type Binding = {
  prefix?: string;
  key: string;
  href: string;
};

const BINDINGS: Binding[] = [
  { prefix: 'g', key: 'h', href: '/habits' },
  { prefix: 'g', key: 'p', href: '/pills' },
  { prefix: 'g', key: 'g', href: '/goals' },
  { prefix: 'g', key: 'l', href: '/plans' }, // 'g l' for "plans"
  { key: 'f', href: '/focus' },
  { key: 't', href: '/today' },
];

function isTextTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (t.isContentEditable) return true;
  return false;
}

export function ShortcutsProvider() {
  const router = useRouter();

  React.useEffect(() => {
    let prefix: string | null = null;
    let prefixExpiry: number = 0;

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTextTarget(e.target)) return;

      const k = e.key.toLowerCase();
      const now = Date.now();

      // Continue a chord if we're inside the prefix window.
      if (prefix && now <= prefixExpiry) {
        const match = BINDINGS.find(
          (b) => b.prefix === prefix && b.key === k,
        );
        prefix = null;
        if (match) {
          e.preventDefault();
          router.push(match.href);
        }
        return;
      }

      // Start a new chord if this key is a registered prefix.
      if (BINDINGS.some((b) => b.prefix === k)) {
        prefix = k;
        prefixExpiry = now + PREFIX_TIMEOUT_MS;
        return;
      }

      // Single-key bindings.
      const single = BINDINGS.find((b) => !b.prefix && b.key === k);
      if (single) {
        e.preventDefault();
        router.push(single.href);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  return null;
}
