import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

type Connection = 'connected' | 'failed';
let connection: Promise<Connection> | undefined;

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
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.auth.signInAnonymously();
    return !error && data.user?.is_anonymous ? 'connected' : 'failed';
  } catch {
    return 'failed';
  }
}
