import type { SupabaseClient } from '@supabase/supabase-js';

export const adminLinkAuth = { flowType: 'pkce', detectSessionInUrl: true } as const;

export function requestAdminLink(auth: Pick<SupabaseClient['auth'], 'signInWithOtp'>, email: string, redirect: URL) {
  return auth.signInWithOtp({
    email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: redirect.href },
  });
}

export async function restoreAdminSignIn(auth: {
  initialize: () => Promise<{ error: unknown }>;
  getSession: () => Promise<{ data: { session: unknown }; error: unknown }>;
}, returningWithCode = false) {
  const callback = await auth.initialize();
  if (callback.error) return 'link-error';
  const current = await auth.getSession();
  if (current.error) return 'session-error';
  if (current.data.session) return 'signed-in';
  return returningWithCode ? 'link-error' : 'signed-out';
}
