import { z } from 'zod';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { defaultServerCache, defaultSettings, defaultTrackers, serverCacheSchema, settingsSchema, trackersSchema, type Settings } from './schema';

type Saved<Value> = { value: Value };
type Store<Value> = Saved<Value> & { update: (transform: (previous: Value) => Value) => void };

function persistedStore<Value>(
  name: string,
  version: number,
  defaults: Value,
  schema: z.ZodType<Value>,
  storage: StateStorage,
  migrate?: (saved: unknown, fromVersion: number) => Saved<Value>,
) {
  const snapshot = z.object({ value: schema });
  return createStore<Store<Value>>()(
    persist<Store<Value>, [], [], Saved<Value>>(
      (set) => ({ value: defaults, update: (transform) => set(({ value }) => ({ value: transform(value) })) }),
      {
        name, version, migrate, storage: createJSONStorage(() => storage),
        partialize: ({ value }) => ({ value }),
        merge: (saved, original) => {
          const parsed = snapshot.safeParse(saved);
          return parsed.success ? { ...original, ...parsed.data } : original;
        },
      },
    ),
  );
}

const oldSettings = z.object({ value: z.looseObject({
  reminders: z.looseObject({ udhiyah: z.enum(['yes', 'no']).nullable().optional() }).optional(),
  udhiyahYear: z.int().min(1000).optional(),
}) });

function migrateSettings(saved: unknown, fromVersion: number): Saved<Settings> {
  if (fromVersion !== 1) throw new Error(`Unsupported settings version ${fromVersion}`);
  const parsed = oldSettings.safeParse(saved);
  if (!parsed.success) return { value: defaultSettings() };
  const { value } = parsed.data;
  const { udhiyah, ...preferences } = value.reminders ?? {};
  const answers = udhiyah && value.udhiyahYear ? { [value.udhiyahYear]: udhiyah } : {};
  const migrated = settingsSchema.safeParse({ ...value, reminders: { ...preferences, udhiyah: answers } });
  return { value: migrated.success ? migrated.data : defaultSettings() };
}

export function createSavedStores(storage: StateStorage) {
  return {
    settings: persistedStore('settings', 2, defaultSettings(), settingsSchema, storage, migrateSettings),
    trackers: persistedStore('trackers', 1, defaultTrackers(), trackersSchema, storage),
    serverCache: persistedStore('server-cache', 1, defaultServerCache(), serverCacheSchema, storage),
  };
}

export function createClockStore(initial: number) {
  return createStore<{ now: number; setNow: (now: number) => void }>((set) => ({
    now: initial, setNow: (now) => set({ now }),
  }));
}
