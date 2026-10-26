// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';
import { proxy } from './proxy';

const { createServerClient, getClaims, getUser } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({ createServerClient }));

type CookieMethods = {
  getAll(): Array<{ name: string; value: string }>;
  setAll(cookies: Array<{ name: string; value: string; options: CookieOptions }>): void;
};

let cookieMethods: CookieMethods;

const verified = (sub: string) => ({ data: { claims: { sub } }, error: null });

describe('authentication proxy', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerClient.mockImplementation((_url, _key, options: { cookies: CookieMethods }) => {
      cookieMethods = options.cookies;
      return { auth: { getClaims, getUser } };
    });
    getClaims.mockResolvedValue({ data: null, error: null });
  });

  it('forwards only the verified identity without a second user lookup', async () => {
    getClaims.mockResolvedValue(verified('verified-user'));
    const request = new NextRequest('http://localhost/habits', {
      headers: { 'x-user-id': 'forged-user', 'x-request-id': 'request-1' },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-request-x-user-id')).toBe('verified-user');
    expect(response.headers.get('x-middleware-request-x-request-id')).toBe('request-1');
    expect(getClaims).toHaveBeenCalledOnce();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('redirects an unauthenticated request even with a forged identity header', async () => {
    const response = await proxy(new NextRequest('http://localhost/goals', {
      headers: { 'x-user-id': 'forged-user' },
    }));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('removes a forged identity header when passing through a public auth route', async () => {
    const response = await proxy(new NextRequest('http://localhost/login', {
      headers: { 'x-user-id': 'forged-user' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.has('x-middleware-request-x-user-id')).toBe(false);
  });

  it.each(['/login', '/signup'])('redirects a verified user away from %s', async (path) => {
    getClaims.mockResolvedValue(verified('verified-user'));

    const response = await proxy(new NextRequest(`http://localhost${path}`));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/');
  });

  it('rejects failed verification even if claims contain a subject', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'untrusted-user' } }, error: { message: 'Invalid signature' } });

    const response = await proxy(new NextRequest('http://localhost/'));

    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('rejects verified data without a usable subject', async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null });

    const response = await proxy(new NextRequest('http://localhost/'));

    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('forwards refreshed cookies to the page and preserves all browser cookie changes', async () => {
    getClaims.mockImplementation(async () => {
      expect(cookieMethods.getAll()).toContainEqual({ name: 'sb-session', value: 'expired' });
      cookieMethods.setAll([{ name: 'sb-old-chunk', value: '', options: { maxAge: 0, path: '/' } }]);
      cookieMethods.setAll([{ name: 'sb-session', value: 'refreshed', options: { httpOnly: true, sameSite: 'lax', path: '/' } }]);
      return verified('verified-user');
    });

    const response = await proxy(new NextRequest('http://localhost/workout', {
      headers: { cookie: 'sb-session=expired', 'x-user-id': 'forged-user' },
    }));

    expect(response.headers.get('x-middleware-request-cookie')).toContain('sb-session=refreshed');
    expect(response.headers.get('x-middleware-request-x-user-id')).toBe('verified-user');
    expect(response.cookies.get('sb-session')).toMatchObject({ value: 'refreshed', httpOnly: true, sameSite: 'lax', path: '/' });
    expect(response.cookies.get('sb-old-chunk')).toMatchObject({ value: '', maxAge: 0 });
  });

  it('preserves session cleanup cookies on redirects after failed verification', async () => {
    getClaims.mockImplementation(async () => {
      cookieMethods.setAll([{ name: 'sb-session', value: '', options: { maxAge: 0, path: '/' } }]);
      return { data: null, error: { message: 'Session expired' } };
    });

    const response = await proxy(new NextRequest('http://localhost/focus'));

    expect(response.headers.get('location')).toBe('http://localhost/login');
    expect(response.cookies.get('sb-session')).toMatchObject({ value: '', maxAge: 0 });
  });

  it('does not forward the request if verification throws unexpectedly', async () => {
    getClaims.mockRejectedValue(new Error('Auth service unavailable'));

    await expect(proxy(new NextRequest('http://localhost/'))).rejects.toThrow('Auth service unavailable');
  });
});
