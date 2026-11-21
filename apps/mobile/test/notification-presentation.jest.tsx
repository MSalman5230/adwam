import { expect, it, jest } from '@jest/globals';
import { setNotificationCategoryAsync, setNotificationChannelAsync } from 'expo-notifications';
import { Platform } from 'react-native';

import { notificationCategory, registerNotificationPresentation } from '../src/services/notification-presentation';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { LOW: 2, DEFAULT: 3 },
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
}));

it('registers the permanent Android channels and background notification actions once', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'android');
  try {
    await Promise.all([registerNotificationPresentation(), registerNotificationPresentation()]);
    const channels = jest.mocked(setNotificationChannelAsync).mock.calls;
    expect(channels.map(([id]) => id)).toEqual(['weekly', 'monthly', 'yearly', 'weather', 'corrections', 'corrections-silent']);
    expect(channels.find(([id]) => id === 'corrections-silent')?.[1]).toMatchObject({
      name: 'Date corrections (silent)', sound: null, enableVibrate: false,
    });
    const categories = new Map(jest.mocked(setNotificationCategoryAsync).mock.calls.map(([id, actions]) => [id, actions]));
    const later = { identifier: 'later', buttonTitle: 'Later', options: { opensAppToForeground: false } };
    expect(categories.get(notificationCategory(['later'])!)).toEqual([later]);
    expect(categories.get(notificationCategory(['done', 'later'])!)).toEqual([
      { identifier: 'done', buttonTitle: 'Done', options: { opensAppToForeground: false } }, later,
    ]);
    expect(notificationCategory([])).toBeUndefined();
  } finally {
    platform.restore();
  }
});
