import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type LocalInstall = { app: SupabaseClient; service: SupabaseClient; id: string };

export async function withLocalInstall<T>(run: (install: LocalInstall) => Promise<T>) {
  const url = Deno.env.get('SUPABASE_URL');
  const adminKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('ADWAM_LOCAL_ANON_KEY');
  if (url !== 'http://127.0.0.1:54321' || !adminKey || !anonKey) throw new Error('Local Supabase is required');
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const service = createClient(url, adminKey, options);
  const app = createClient(url, anonKey, options);
  const longitudeTenths = (crypto.getRandomValues(new Uint16Array(1))[0] % 3600) - 1800;
  const area = { id: `-899:${longitudeTenths}`, latitude: -89.9, longitude: longitudeTenths / 10 };
  const existing = await service.from('areas').select('id').eq('id', area.id).maybeSingle();
  if (existing.error || existing.data) throw new Error('Could not reserve an unused local weather area');
  const session = await app.auth.signInAnonymously();
  if (session.error || !session.data.user?.is_anonymous) throw new Error('Local anonymous sign-in failed');
  const id = session.data.user.id;
  const test = async () => {
    const synced = await app.rpc('sync_install_v1', { input: {
      platform: 'android', appVersion: '0.1.0', contentVersion: '2026.11.21', countryCode: 'AQ', timeZone: 'UTC',
      notificationsAllowed: true, quietStart: 0, quietEnd: 0, pushToken: 'ExponentPushToken[localFixture]',
      weatherChoices: { 'rain-start': 'push' }, area, hijriMethod: 'umalqura', hijriShift: 0,
    } });
    if (synced.error) throw new Error('Local install sync failed');
    return await run({ app, service, id });
  };
  return await test().finally(async () => {
    // The SDK leaves the delete response body unread. Close it explicitly in Deno tests.
    const removed = await fetch(`${url}/auth/v1/admin/users/${id}`, {
      method: 'DELETE', headers: { apikey: adminKey, Authorization: `Bearer ${adminKey}` },
    });
    await removed.body?.cancel();
    const areaRemoved = await service.from('areas').delete().eq('id', area.id);
    if ((!removed.ok && removed.status !== 404) || areaRemoved.error) {
      throw new Error('Could not clean up the local test install');
    }
  });
}

export async function simulateLocalRain() {
  return await withLocalInstall(async ({ app, service, id }) => {
    const rain = await app.rpc('debug_weather_event_v1');
    const repeat = await app.rpc('debug_weather_event_v1');
    const cards = await app.rpc('my_weather_v1');
    const outbox = await service.from('push_outbox').select('id')
      .eq('install_id', id).eq('weather_event_id', rain.data?.id);
    if (rain.error || repeat.error || cards.error || outbox.error) throw new Error('Local rain simulation failed');
    return {
      card: cards.data.some((event: { id: string; weather: string }) => event.id === rain.data.id && event.weather === 'rain-start'),
      reusedEvent: repeat.data.id === rain.data.id,
      queued: outbox.data.length,
    };
  });
}
