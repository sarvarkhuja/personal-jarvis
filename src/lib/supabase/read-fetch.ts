import { USER_DATA_TABLES, userDataTag, type UserDataTable } from '@/lib/data/cache-tags';

const tables = new Set<string>(USER_DATA_TABLES);

/** Only page SELECTs opt in; mutation clients, Auth, RPCs and Storage stay live. */
export function createReadFetch(userId: string, supabaseUrl: string, fetcher: typeof fetch = fetch): typeof fetch {
  const origin = new URL(supabaseUrl).origin;
  return (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
    const ownerColumn = table === 'profiles' ? 'id' : 'user_id';
    const ownedRead = method === 'GET' && url.origin === origin && table && tables.has(table)
      && url.searchParams.get(ownerColumn) === `eq.${userId}`;

    if (!ownedRead) return fetcher(input, { ...init, cache: 'no-store', next: { revalidate: 0 } });

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    // Next's fetch key includes all headers (including Authorization). Add the
    // verified owner explicitly as well; never share results between identities.
    headers.set('x-jarvis-cache-user', userId);
    // Next derives Request-input cache keys from the Request's own headers.
    const request = input instanceof Request
      ? new Request(input, { ...init, headers, cache: 'force-cache' })
      : input;
    return fetcher(request, {
      ...init,
      headers,
      cache: 'force-cache',
      next: {
        revalidate: table === 'profiles' || table === 'salah_settings' ? 300 : 60,
        tags: [userDataTag(userId), userDataTag(userId, table as UserDataTable)],
      },
    });
  };
}
