import { z } from 'zod';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { defaultServerCache, defaultSettings, defaultTrackers, serverCacheSchema, settingsSchema, trackersSchema, type Settings, type Trackers } from './schema';

type Saved<Value> = { value: Value };
type Store<Value> = Saved<Value> & { update: (transform: (previous: Value) => Value) => void };

function persistedStore<Value>(
  name: string,
  version: number,
  defaults: Value,
  schema: z.ZodType<Value>,
  storage: StateStorage,
  migrate?: (saved: unknown, fromVersion: number) => Saved<Value>,
  recover?: (saved: unknown) => Value,
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
          if (parsed.success) return { ...original, ...parsed.data };
          const damaged = z.object({ value: z.unknown() }).safeParse(saved);
          return recover && damaged.success ? { ...original, value: recover(damaged.data.value) } : original;
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

function recoverMarks(value: unknown, validKey: z.ZodType<string>) {
  const record = z.record(z.string(), z.unknown()).safeParse(value);
  if (!record.success) return {};
  return Object.fromEntries(Object.entries(record.data).filter(
    (entry): entry is [string, boolean] => validKey.safeParse(entry[0]).success && typeof entry[1] === 'boolean',
  ));
}

function recoverTrackers(value: unknown): Trackers {
  const damaged = z.object({ done: z.unknown().optional(), fastLog: z.unknown().optional(), makeup: z.unknown().optional() }).safeParse(value);
  if (!damaged.success) return defaultTrackers();
  const { done, fastLog, makeup } = damaged.data;
  const count = trackersSchema.shape.makeup.safeParse(makeup);
  return {
    done: recoverMarks(done, trackersSchema.shape.done.unwrap().keyType),
    fastLog: recoverMarks(fastLog, trackersSchema.shape.fastLog.unwrap().keyType),
    makeup: count.success ? count.data : null,
  };
}

export function createSavedStores(storage: StateStorage) {
  return {
    settings: persistedStore('settings', 2, defaultSettings(), settingsSchema, storage, migrateSettings),
    trackers: persistedStore('trackers', 1, defaultTrackers(), trackersSchema, storage, undefined, recoverTrackers),
    serverCache: persistedStore('server-cache', 1, defaultServerCache(), serverCacheSchema, storage),
  };
}

export type SavedStores = ReturnType<typeof createSavedStores>;
export type MomentSession = { id: string; stores: SavedStores };

export function createClockStore(initial: number) {
  return createStore<{
    now: number;
    override: number | null;
    moment: MomentSession | null;
    setNow: (now: number) => void;
    setOverride: (override: number | null, moment?: MomentSession | null) => void;
  }>((set) => ({
    now: initial,
    override: null,
    moment: null,
    setNow: (now) => set({ now }),
    setOverride: (override, moment = null) => set({ override, moment }),
  }));
}
