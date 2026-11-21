import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

import { clearSessionStorage, sessionStorage } from '../state/native';

type Connection = 'connected' | 'failed';
let connection: Promise<Connection> | undefined;

export async function resetLocalSupabaseSession() {
  await connection;
  clearSessionStorage();
  connection = undefined;
}

export function checkLocalSupabase(): Promise<Connection> | undefined {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  if (!__DEV__ || !url || !key) return;
  if (!/^http:\/\/(?:10\.0\.2\.2|127\.0\.0\.1|localhost):54321\/?$/.test(url)) return;

  connection ??= signIn(url, key);
  return connection;
}

async function signIn(url: string, key: string): Promise<Connection> {
  try {
    const supabase = createClient(url, key, {
      auth: { storage: sessionStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const session = await supabase.auth.getSession();
    if (session.error) return 'failed';
    if (session.data.session) {
      const existing = await supabase.auth.getUser();
      return !existing.error && existing.data.user?.is_anonymous ? 'connected' : 'failed';
    }
    const { data, error } = await supabase.auth.signInAnonymously();
    return !error && data.user?.is_anonymous ? 'connected' : 'failed';
  } catch {
    return 'failed';
  }
}
