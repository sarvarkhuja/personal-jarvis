import 'server-only';
import { cache } from 'react';
import { createReadClient } from '@/lib/supabase/read';

export type Profile = {
  display_name: string | null;
  timezone: string;
  target_weight_kg: number | string | null;
  future_self_started_on: string | null;
};

// The same projection gives every page the same persistent fetch-cache entry.
export const loadProfile = cache(async (userId: string): Promise<Profile> => {
  const supabase = await createReadClient(userId);
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, timezone, target_weight_kg, future_self_started_on')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('[loadProfile]', { code: error.code });
    throw new Error('Could not load your profile. Please try again.');
  }
  return data as Profile;
});
