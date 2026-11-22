import type { PostHogOptions } from 'posthog-react-native';
import { expect, it, vi } from 'vitest';

const device = vi.hoisted(() => {
  const memory = new Map<string, string>();
  let consent = false;
  const listeners: Array<(
    current: { value: { usageStats: boolean } }, previous: { value: { usageStats: boolean } },
  ) => void> = [];
  return {
    storage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    },
    state: {
      getState: () => ({ value: { usageStats: consent, location: { countryCode: 'GB' } } }),
      subscribe: (listener: (typeof listeners)[number]) => listeners.push(listener),
    },
    setConsent: (next: boolean) => {
      const previous = consent;
      consent = next;
      for (const listener of listeners) listener({ value: { usageStats: next } }, { value: { usageStats: previous } });
    },
  };
});
const sdk = vi.hoisted(() => ({
  clients: [] as Array<{
    options: PostHogOptions;
    capture: ReturnType<typeof vi.fn>;
    fetch: (url: string, options: { method: string }) => Promise<{ status: number }>;
    setPersistedProperty: ReturnType<typeof vi.fn>;
  }>,
  network: vi.fn(async () => ({ status: 202 })),
}));

vi.mock('@adwam/content/catalog', () => ({
  default: { version: '2026.11.21', sunnahs: [{ id: 'kahf' }] },
}));
vi.mock('expo-constants', () => ({ default: { expoConfig: { extra: { variant: 'production' } } } }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('../state/native', () => ({ sessionStorage: device.storage, settingsStore: device.state }));
vi.mock('./app-version', () => ({ appVersion: '0.1.0' }));
vi.mock('posthog-react-native', () => ({
  PostHogPersistedProperty: { Queue: 'queue' },
  default: class {
    constructor(readonly key: string, readonly options: PostHogOptions) {
      sdk.clients.push(this);
    }
    capture = vi.fn();
    setPersistedProperty = vi.fn();
    ready = async () => {};
    optOut = async () => {};
    getAnonymousId = () => 'anonymous-test-id';
    fetch() { return sdk.network(); }
  },
}));

it('creates the client only after consent and blocks delivery from a revoked client', async () => {
  vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', 'phc_example_only');
  try {
    const { track } = await import('./usage-statistics');
    const event = { event: 'report_opened', properties: { item: 'kahf' } } as const;
    track(event);
    expect(sdk.clients).toHaveLength(0);

    device.setConsent(true);
    track(event);
    const [active] = sdk.clients;
    expect(active?.capture).toHaveBeenCalledWith('report_opened', {
      item: 'kahf', app_version: '0.1.0', content_version: '2026.11.21', platform: 'android', country: 'GB',
      $geoip_disable: true, $process_person_profile: false,
    });
    expect(active?.options).toMatchObject({
      host: 'https://eu.i.posthog.com', personProfiles: 'never', enableSessionReplay: false,
    });
    const options = { method: 'POST' };
    await active?.fetch('https://eu.i.posthog.com/flags/', options);
    expect(sdk.network).not.toHaveBeenCalled();
    await active?.fetch('https://eu.i.posthog.com/batch/', options);
    expect(sdk.network).toHaveBeenCalledTimes(1);

    device.setConsent(false);
    track(event);
    expect(active?.capture).toHaveBeenCalledTimes(1);
    expect(active?.setPersistedProperty).toHaveBeenCalledWith('queue', null);
    expect(device.storage.getItem('usage-anonymous-id')).toBeNull();
    await active?.fetch('https://eu.i.posthog.com/batch/', options);
    expect(sdk.network).toHaveBeenCalledTimes(1);
  } finally {
    device.setConsent(false);
    vi.unstubAllEnvs();
  }
});
