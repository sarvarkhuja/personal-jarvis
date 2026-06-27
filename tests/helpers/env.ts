/**
 * Returns the Supabase env needed for E2E tests, or null if any are missing.
 * Tests that need these should `test.skip(env === null, '...')`.
 */
export type E2EEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export function readE2EEnv(): E2EEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) return null;
  return { url, anonKey, serviceRoleKey };
}
