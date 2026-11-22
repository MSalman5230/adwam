import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

import { clearSessionStorage, sessionStorage } from '../state/native';

type Connection = 'connected' | 'failed';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const variant: unknown = Constants.expoConfig?.extra?.variant;
const isLocal = url && /^http:\/\/(?:10\.0\.2\.2|127\.0\.0\.1|localhost):54321\/?$/.test(url);
const allowed = url && (isLocal ? variant === 'development' : /^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(url));

export const supabase = allowed && key ? createClient(url, key, {
  auth: { storage: sessionStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
}) : undefined;

let connection: Promise<string | undefined> | undefined;

export async function resetLocalSupabaseSession() {
  await connection;
  clearSessionStorage();
  connection = undefined;
}

export function checkLocalSupabase(): Promise<Connection> | undefined {
  if (!isLocal || !supabase) return;
  return anonymousInstall().then((id) => id ? 'connected' : 'failed', () => 'failed');
}

export function anonymousInstall() {
  connection ??= signIn().finally(() => { connection = undefined; });
  return connection;
}

async function signIn() {
  if (!supabase) return;
  const session = await supabase.auth.getSession();
  if (session.error) throw session.error;
  const user = session.data.session?.user;
  if (user) return user.is_anonymous ? user.id : undefined;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user?.is_anonymous ? data.user.id : undefined;
}
