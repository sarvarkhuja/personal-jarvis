'use server';

import { invalidateAllUserData, invalidateUserData } from '@/lib/data/invalidate';
import { createClient } from '@/lib/supabase/action';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUserId } from '@/lib/auth/server-user';
import { SetThemeSchema, type SetThemeInput } from '@/lib/schemas/account';

function failed(name: string, error: { message: string; details?: string | null }) {
  console.error(`[${name}] supabase error:`, error);
  throw new Error(
    `${name} failed: ${error.message}${error.details ? ` (${error.details})` : ''}`,
  );
}

export async function setTheme(input: SetThemeInput) {
  const parsed = SetThemeSchema.parse(input);
  const userId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ theme: parsed.theme })
    .eq('id', userId);

  if (error) failed('setTheme', error);
  invalidateUserData(userId, 'profiles');
}

/**
 * Permanently deletes the current user. Cascades through every FK to
 * auth.users (habits, goals, events, …), removing all per-user data.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set on the server.
 */
export async function deleteAccount() {
  const userId = await requireUserId();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[deleteAccount] admin.deleteUser failed:', error);
    throw new Error(`deleteAccount failed: ${error.message}`);
  }
  try {
    // An unexpired signed token can still verify after account deletion.
    // Clear its local SSR cookies before the client navigates to /login.
    const supabase = await createClient();
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) failed('deleteAccount session cleanup', signOutError);
  } finally {
    // The user was deleted even if an unexpected session-cleanup error occurs.
    invalidateAllUserData(userId);
  }
}
