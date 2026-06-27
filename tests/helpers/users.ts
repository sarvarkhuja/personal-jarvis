import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { E2EEnv } from './env';

export type TestUser = { id: string; email: string; password: string };

/**
 * Create a confirmed test user via the admin client, returning the credentials.
 * Caller is responsible for deleting the user when done (`deleteTestUser`).
 */
export async function createTestUser(env: E2EEnv, label: string): Promise<TestUser> {
  const admin = adminClient(env);
  const email = `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = `pw-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message ?? 'unknown'}`);
  }
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(env: E2EEnv, userId: string): Promise<void> {
  const admin = adminClient(env);
  await admin.auth.admin.deleteUser(userId);
}

export function adminClient(env: E2EEnv): SupabaseClient {
  return createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function userClient(env: E2EEnv): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
