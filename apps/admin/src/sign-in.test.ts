import { describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

import { adminLinkAuth, requestAdminLink, restoreAdminSignIn } from './sign-in';

describe('correction admin sign-in links', () => {
  it('uses the Pages return URL, with PKCE and without creating a user', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ data: {}, error: null });
    const page = new URL('/adwam/', 'https://example.test');
    await requestAdminLink({ signInWithOtp }, '  test-admin@example.test  ', page);
    expect(adminLinkAuth).toEqual({ flowType: 'pkce', detectSessionInUrl: true });
    expect(signInWithOtp).toHaveBeenCalledExactlyOnceWith({
      email: 'test-admin@example.test',
      options: { shouldCreateUser: false, emailRedirectTo: 'https://example.test/adwam/' },
    });
  });

  it('handles the return link before trying to open a session', async () => {
    const calls: string[] = [];
    const result = await restoreAdminSignIn({
      async initialize() { calls.push('finish callback'); return { error: null }; },
      async getSession() { calls.push('restore session'); return { data: { session: {} }, error: null }; },
    });
    expect(calls).toEqual(['finish callback', 'restore session']);
    expect(result).toBe('signed-in');
  });

  it('leaves an expired link or missing session on the sign-in screen', async () => {
    const getSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
    expect(await restoreAdminSignIn({ initialize: async () => ({ error: new Error('expired') }), getSession }))
      .toBe('link-error');
    expect(getSession).not.toHaveBeenCalled();
    expect(await restoreAdminSignIn({ initialize: async () => ({ error: null }), getSession })).toBe('signed-out');
    expect(await restoreAdminSignIn({ initialize: async () => ({ error: null }), getSession }, true)).toBe('link-error');
  });

  it('exchanges a return code through the Supabase SDK and removes it from the URL', async () => {
    const url = new URL('https://example.test/adwam/?code=fixture-code');
    const replaceState = vi.fn();
    vi.stubGlobal('window', { location: url, history: { state: null, replaceState } });
    vi.stubGlobal('document', {});
    vi.stubGlobal('BroadcastChannel', undefined);
    try {
      const storageKey = 'adwam-test-auth';
      const stored = new Map([[`${storageKey}-code-verifier`, JSON.stringify('fixture-verifier')]]);
      const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe('https://fixture.supabase.co/auth/v1/token?grant_type=pkce');
        expect(JSON.parse(String(init?.body))).toEqual({ auth_code: 'fixture-code', code_verifier: 'fixture-verifier' });
        return Response.json({
          access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token', token_type: 'bearer',
          expires_in: 3600, user: { id: 'fixture-user' },
        });
      });
      const { auth } = createClient('https://fixture.supabase.co', 'sb_publishable_fixture', {
        auth: {
          ...adminLinkAuth, storageKey, autoRefreshToken: false,
          storage: {
            getItem: (key) => stored.get(key) ?? null,
            setItem: (key, value) => { stored.set(key, value); },
            removeItem: (key) => { stored.delete(key); },
          },
        },
        global: { fetch },
      });
      expect(await restoreAdminSignIn(auth, true)).toBe('signed-in');
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(replaceState).toHaveBeenCalledWith(null, '', 'https://example.test/adwam/');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
