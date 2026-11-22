import catalog from '@adwam/content/catalog';
import { civil, hijriMonthStart } from '@adwam/core';
import Constants from 'expo-constants';
import { getExpoPushTokenAsync, type DevicePushToken } from 'expo-notifications';
import { Platform } from 'react-native';
import { z } from 'zod';

import { countryName } from '../location/cities';
import { clearSessionStorage, serverCacheStore, sessionStorage, settingsStore } from '../state/native';
import { defaultServerCache, serverConfigSchema, serverCorrectionSchema, weatherEventSchema, type Settings } from '../state/schema';
import { appVersion } from './app-version';
import { installSyncPayload, needsServerUpdate, removeWithdrawnCorrections } from './server-sync-payload';
import { anonymousInstall, supabase } from './supabase';

const weatherEvents = z.array(weatherEventSchema);
const corrections = z.array(serverCorrectionSchema);
const lastInstall = 'last-install-sync';
const cachedToken = 'expo-push-token';
const tokenAttempt = 'expo-push-token-attempt';
const tokenRetry = 15 * 60 * 1000;
const tokenRefresh = 24 * 60 * 60 * 1000;
let newNativeToken: DevicePushToken | undefined;
let pending = false;
let running: Promise<boolean> | undefined;
let deleted = false;
let deleting: Promise<boolean> | undefined;

export function installSnapshot(settings: Settings) {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  return installSyncPayload(settings, catalog.sunnahs, { app: appVersion, content: catalog.version }, Platform.OS);
}

export function nativePushTokenChanged(token: DevicePushToken) {
  newNativeToken = token;
  sessionStorage.removeItem(tokenAttempt);
  sessionStorage.removeItem(cachedToken);
}

async function pushToken(allowed: boolean, now: number) {
  if (!allowed) return null;
  const stored = sessionStorage.getItem(cachedToken);
  const attempted = Number(sessionStorage.getItem(tokenAttempt));
  const projectId: unknown = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string' || now - attempted < (stored ? tokenRefresh : tokenRetry)) return stored;
  const nativeToken = newNativeToken;
  sessionStorage.setItem(tokenAttempt, String(now));
  try {
    const result = await getExpoPushTokenAsync({ projectId, devicePushToken: nativeToken });
    if (nativeToken !== newNativeToken) return null;
    newNativeToken = undefined;
    sessionStorage.setItem(cachedToken, result.data);
    return result.data;
  } catch {
    return nativeToken === newNativeToken ? stored : null;
  }
}

export function syncServer(): Promise<boolean> {
  if (!supabase || deleted || deleting) return Promise.resolve(true);
  pending = true;
  running ??= Promise.resolve().then(async () => {
    let succeeded = true;
    try {
      while (pending && !deleting) {
        pending = false;
        succeeded = await refresh().catch(() => false);
      }
      return succeeded;
    } finally {
      running = undefined;
    }
  });
  return running;
}

export function deleteServerData(): Promise<boolean> {
  deleting ??= forgetInstall().catch(() => false).finally(() => { deleting = undefined; });
  return deleting;
}

async function forgetInstall() {
  if (!supabase) return false;
  await running;
  const session = await supabase.auth.getSession();
  if (session.error) return false;
  if (session.data.session) {
    const removed = await supabase.rpc('forget_me_v1');
    if (removed.error) return false;
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  }
  deleted = true;
  newNativeToken = undefined;
  clearSessionStorage();
  serverCacheStore.getState().update(defaultServerCache);
  return true;
}

export async function simulateServerRain() {
  if (!supabase || deleted || deleting || !await syncServer()) return false;
  if (serverCacheStore.getState().value.config?.debugToolsEnabled !== true) return false;
  const result = await supabase.rpc('debug_weather_event_v1');
  return !result.error && await syncServer();
}

async function refresh() {
  if (!supabase) return true;
  const payload = installSnapshot(settingsStore.getState().value);
  if (!payload) return true;
  const id = await anonymousInstall();
  if (!id) return false;
  const configResult = await supabase.rpc('config_v1');
  if (configResult.error) return false;
  const config = serverConfigSchema.parse(configResult.data);
  const now = Date.now();
  if (needsServerUpdate(appVersion, config.minAppVersion)) {
    serverCacheStore.getState().update(() => ({
      lastSyncedAt: now, config, areaId: null, events: [], corrections: [], correctionOffer: null,
    }));
    return true;
  }

  const area = config.weatherEnabled ? payload.area : null;
  const token = await pushToken(payload.notificationsAllowed, now);
  const input = { ...payload, area, pushToken: token };
  const signature = JSON.stringify([id, civil(now, payload.timeZone).iso, input]);
  if (sessionStorage.getItem(lastInstall) !== signature) {
    const synced = await supabase.rpc('sync_install_v1', { input });
    if (synced.error) return false;
    sessionStorage.setItem(lastInstall, signature);
  }

  const [forecast, announced] = await Promise.all([
    area ? supabase.rpc('my_weather_v1') : Promise.resolve({ data: [], error: null }),
    supabase.rpc('corrections_v1'),
  ]);
  if (forecast.error || announced.error) return false;
  const events = weatherEvents.parse(forecast.data);
  const correctionList = corrections.parse(announced.data);
  const settings = settingsStore.getState().value;
  if (JSON.stringify(payload) !== JSON.stringify(installSnapshot(settings))) return true;
  const saved = removeWithdrawnCorrections(settings, correctionList);
  if (saved !== settings) {
    settingsStore.getState().update((current) => removeWithdrawnCorrections(current, correctionList));
  }
  const candidate = correctionList.findLast((item) => !item.withdrawn && item.countryCode === payload.countryCode &&
    !saved.correctionChoices[item.id] && hijriMonthStart(item.year, item.month, saved.hijri) !== item.start);
  const correctionOffer = candidate ? { ...candidate, region: await countryName(candidate.countryCode) } : null;
  if (JSON.stringify(payload) !== JSON.stringify(installSnapshot(settingsStore.getState().value))) return true;
  serverCacheStore.getState().update(() => ({
    lastSyncedAt: now, config, areaId: area?.id ?? null, events, corrections: correctionList, correctionOffer,
  }));
  return true;
}
