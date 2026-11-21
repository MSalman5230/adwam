import * as Sentry from '@sentry/react-native';
import { applicationId, nativeApplicationVersion, nativeBuildVersion } from 'expo-application';
import Constants from 'expo-constants';
import { isEmbeddedLaunch, updateId } from 'expo-updates';

import { settingsStore } from '../state/native';
import { isEuSentryDsn, previewTestCrash, scrubCrashEvent } from './crash-event';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const environment: unknown = Constants.expoConfig?.extra?.variant;
const shouldReport = () => settingsStore.getState().value.crashReports;

export const canTestCrashReporting = environment === 'preview' && Boolean(dsn && isEuSentryDsn(dsn));

export function startCrashReporting() {
  if (!dsn || !isEuSentryDsn(dsn) || typeof environment !== 'string'
    || !applicationId || !nativeApplicationVersion || !nativeBuildVersion) return;
  const build = {
    environment, release: `${applicationId}@${nativeApplicationVersion}+${nativeBuildVersion}`,
    dist: nativeBuildVersion, updateId: updateId ?? (isEmbeddedLaunch ? 'embedded' : 'development'),
  };
  const initialize = () => {
    if (!shouldReport() || Sentry.getClient()) return;
    Sentry.init({
      dsn,
      environment: build.environment,
      release: build.release,
      dist: build.dist,
      sendDefaultPii: false,
      // The JavaScript transport sends only events that pass the data allowlist.
      enableNative: false,
      enableAutoSessionTracking: false,
      beforeBreadcrumb: () => null,
      beforeSend: (event, hint) => {
        hint.attachments = [];
        return shouldReport() ? scrubCrashEvent(event, build) : null;
      },
    });
  };
  initialize();
  settingsStore.subscribe(({ value }, previous) => {
    if (value.crashReports && !previous.value.crashReports) initialize();
  });
}

export function triggerPreviewTestCrash() {
  if (canTestCrashReporting && shouldReport()) throw new Error(previewTestCrash);
}
