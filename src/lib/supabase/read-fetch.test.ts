import { describe, expect, it, vi } from 'vitest';
import { createReadFetch } from './read-fetch';

const base = 'https://project.supabase.co';
const user = 'owner-a';

function setup(owner = user) {
  const upstream = vi.fn<typeof fetch>().mockResolvedValue(new Response('[]'));
  return { upstream, read: createReadFetch(owner, base, upstream) };
}

describe('authenticated page fetch caching', () => {
  it('retains authorization and keys/tags a bounded SELECT to its verified owner', async () => {
    const { read, upstream } = setup();
    await read(`${base}/rest/v1/habits?user_id=eq.${user}`, {
      headers: { Authorization: 'Bearer session-a', apikey: 'anon-key' },
    });
    const options = upstream.mock.calls[0][1]!;
    expect(options.cache).toBe('force-cache');
    expect(options.next).toEqual({ revalidate: 60, tags: ['jarvis:user:owner-a', 'jarvis:user:owner-a:habits'] });
    expect(new Headers(options.headers).get('authorization')).toBe('Bearer session-a');
    expect(new Headers(options.headers).get('x-jarvis-cache-user')).toBe(user);
    expect(new Headers(options.headers).get('apikey')).toBe('anon-key');
  });

  it('uses distinct owner headers and tags for two authenticated users', async () => {
    const a = setup('owner-a');
    const b = setup('owner-b');
    await a.read(`${base}/rest/v1/profiles?id=eq.owner-a`);
    await b.read(`${base}/rest/v1/profiles?id=eq.owner-b`);
    const aa = a.upstream.mock.calls[0][1]!;
    const bb = b.upstream.mock.calls[0][1]!;
    expect(new Headers(aa.headers).get('x-jarvis-cache-user')).not.toBe(new Headers(bb.headers).get('x-jarvis-cache-user'));
    expect(aa.next?.tags).not.toEqual(bb.next?.tags);
    expect(aa.next?.revalidate).toBe(300);
  });

  it.each([
    ['/auth/v1/user', 'GET'],
    ['/auth/v1/token', 'POST'],
    ['/storage/v1/object/sign/progress-photos', 'POST'],
    ['/rest/v1/habits?user_id=eq.owner-a', 'PATCH'],
    ['/rest/v1/habits?user_id=eq.owner-a', 'DELETE'],
    ['/rest/v1/habits?user_id=eq.owner-a', 'POST'],
    ['/rest/v1/habits?user_id=eq.owner-a', 'HEAD'],
    ['/rest/v1/rpc/toggle_medication_completion', 'POST'],
    ['/rest/v1/habits?user_id=eq.owner-b', 'GET'],
    ['/rest/v1/habits', 'GET'],
    ['/rest/v1/unknown?user_id=eq.owner-a', 'GET'],
  ])('does not cache %s (%s)', async (path, method) => {
    const { read, upstream } = setup();
    await read(base + path, { method });
    expect(upstream.mock.calls[0][1]?.cache).toBe('no-store');
    expect(upstream.mock.calls[0][1]?.next?.tags).toBeUndefined();
  });

  it('does not cache requests to another origin', async () => {
    const { read, upstream } = setup();
    await read(`https://other.supabase.co/rest/v1/habits?user_id=eq.${user}`);
    expect(upstream.mock.calls[0][1]?.cache).toBe('no-store');
  });

  it('preserves Request headers when applying cache metadata', async () => {
    const { read, upstream } = setup();
    const request = new Request(`${base}/rest/v1/goals?user_id=eq.${user}`, {
      headers: { Authorization: 'Bearer session', Accept: 'application/json' },
    });
    await read(request, { headers: { 'x-client-info': 'supabase-js' } });
    const forwarded = upstream.mock.calls[0][0] as Request;
    expect(forwarded.headers.get('authorization')).toBe('Bearer session');
    expect(forwarded.headers.get('x-jarvis-cache-user')).toBe(user);
    const headers = new Headers(upstream.mock.calls[0][1]?.headers);
    expect(headers.get('authorization')).toBe('Bearer session');
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('x-client-info')).toBe('supabase-js');
  });
});
