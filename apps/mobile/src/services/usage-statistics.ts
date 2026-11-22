import catalog from '@adwam/content/catalog';
import Constants from 'expo-constants';
import PostHog, { PostHogPersistedProperty } from 'posthog-react-native';
import { Platform } from 'react-native';

import { sessionStorage, settingsStore } from '../state/native';
import { appVersion } from './app-version';
import { usageProperties, type UsageEvent } from './usage-events';

const host = 'https://eu.i.posthog.com';
const idKey = 'usage-anonymous-id';
const projectKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const configured = Constants.expoConfig?.extra?.variant === 'production' && !!projectKey?.startsWith('phc_');
const hasConsent = () => settingsStore.getState().value.usageStats;
let client: UsageClient | undefined;

class UsageClient extends PostHog {
  fetch(...[url, options]: Parameters<PostHog['fetch']>): ReturnType<PostHog['fetch']> {
    // Limit transport to event delivery and recheck consent before flushing the SDK queue.
    if (url === `${host}/batch/` && this === client && hasConsent()) return super.fetch(url, options);
    return Promise.resolve(new Response('{}', { status: 200 }));
  }
}

function startClient(key: string) {
  const savedId = sessionStorage.getItem(idKey);
  const active = new UsageClient(key, {
    host,
    persistence: 'memory',
    bootstrap: savedId ? { distinctId: savedId } : undefined,
    personProfiles: 'never',
    disableGeoip: true,
    disableRemoteFeatureFlags: true,
    preloadFeatureFlags: false,
    disableSurveys: true,
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    setDefaultPersonProperties: false,
    customAppProperties: {},
    before_send: ({ event, properties, uuid, timestamp }) => {
      if (client !== active || !hasConsent()) return null;
      const allowed = usageProperties(event, properties);
      return allowed ? { event, properties: allowed, uuid, timestamp } : null;
    },
  });
  void active.ready().then(() => {
    if (client === active && hasConsent()) sessionStorage.setItem(idKey, active.getAnonymousId());
  }).catch(() => {});
  return active;
}

if (configured) settingsStore.subscribe(({ value }, previous) => {
  if (value.usageStats || !previous.value.usageStats) return;
  const revoked = client;
  client = undefined;
  sessionStorage.removeItem(idKey);
  if (!revoked) return;
  revoked.setPersistedProperty(PostHogPersistedProperty.Queue, null);
  void revoked.optOut().catch(() => {});
});

export function track({ event, properties }: UsageEvent) {
  if (!configured || !projectKey || !hasConsent()) return;
  const allowed = usageProperties(event, {
    ...properties,
    app_version: appVersion,
    content_version: catalog.version,
    platform: Platform.OS,
    country: settingsStore.getState().value.location?.countryCode ?? 'unknown',
  });
  if (!allowed) return;
  client ??= startClient(projectKey);
  client.capture(event, allowed);
}
