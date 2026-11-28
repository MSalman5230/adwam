import type { ConfigContext, ExpoConfig } from 'expo/config';
import { relative, sep } from 'node:path';

import fontFiles from './fonts.json';

const androidFonts = Object.values(fontFiles).map((file) => relative(__dirname, require.resolve(file)).split(sep).join('/'));
const packageName = 'com.msalman5230.adwam';
const projectId = 'c4990a3f-ae86-48d7-9b21-98f73762b49b';
const variants = {
  development: { name: 'Adwam Dev', id: `${packageName}.dev` },
  preview: { name: 'Adwam Preview', id: `${packageName}.preview` },
  production: { name: 'Adwam', id: packageName },
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant: string = process.env.APP_VARIANT ?? 'development';
  if (variant !== 'development' && variant !== 'preview' && variant !== 'production') {
    throw new Error(`Unknown APP_VARIANT: ${variant}`);
  }
  const { name, id } = variants[variant];

  return {
    ...config,
    name,
    slug: 'adwam',
    owner: 'msalman5230',
    version: '1.1.0', // x-release-please-version
    scheme: 'adwam',
    icon: './assets/icon.png',
    platforms: ['android'],
    userInterfaceStyle: 'automatic',
    runtimeVersion: { policy: 'fingerprint' },
    updates: {
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
      url: `https://u.expo.dev/${projectId}`,
    },
    android: {
      package: id,
      adaptiveIcon: {
        foregroundImage: './assets/icon-foreground.png',
        monochromeImage: './assets/icon-monochrome.png',
        backgroundColor: '#1E5B47',
      },
      ...(process.env.GOOGLE_SERVICES_JSON && {
        googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
      }),
      blockedPermissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.SCHEDULE_EXACT_ALARM',
        'android.permission.USE_EXACT_ALARM',
      ],
    },
    plugins: [
      'expo-router',
      ['expo-font', { android: { fonts: androidFonts } }],
      'expo-localization',
      'expo-notifications',
      ['@sentry/react-native/expo', {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        url: 'https://de.sentry.io/',
        disableAutoUpload: !process.env.SENTRY_AUTH_TOKEN,
      }],
      './plugins/with-session-backup.cjs',
      ['./plugins/with-development-http.cjs', { enabled: variant === 'development' }],
    ],
    extra: { ...config.extra, eas: { projectId }, variant },
  };
};
