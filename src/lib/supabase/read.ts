import 'server-only';
import { cache } from 'react';
import { requireUserId } from '@/lib/auth/server-user';
import { createClient } from './server';
import { createReadFetch } from './read-fetch';

/** Authenticated page reads only. Server Actions must use the uncached client. */
export const createReadClient = cache(async (userId: string) => {
  if (await requireUserId() !== userId) throw new Error('UNAUTHENTICATED');
  return createClient(createReadFetch(userId, process.env.NEXT_PUBLIC_SUPABASE_URL!));
});
