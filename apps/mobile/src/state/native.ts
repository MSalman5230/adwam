import { createMMKV, type MMKV } from 'react-native-mmkv';

import { createClockStore, createSavedStores } from './stores';

function asStorage(mmkv: MMKV) {
  return {
    getItem: (key: string) => mmkv.getString(key) ?? null,
    setItem: (key: string, value: string) => { mmkv.set(key, value); },
    removeItem: (key: string) => { mmkv.remove(key); },
  };
}

const saved = asStorage(createMMKV({ id: 'adwam-saved' }));
// Android's backup plugin excludes this store and its CRC file.
export const sessionStorage = asStorage(createMMKV({ id: 'adwam-session' }));

export const { settings: settingsStore, trackers: trackersStore, serverCache: serverCacheStore } = createSavedStores(saved);
export const clockStore = createClockStore(Date.now());
