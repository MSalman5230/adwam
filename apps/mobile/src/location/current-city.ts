import type { Coordinates } from '@adwam/core';
import {
  Accuracy, getLastKnownPositionAsync, requestForegroundPermissionsAsync, watchPositionAsync, type LocationSubscription,
} from 'expo-location';

import { nearestCity, type NamedCity } from './cities';

type LocationResult = { status: 'located'; city: NamedCity } | { status: 'denied' | 'unavailable' };

function waitForApproximatePosition(): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    let settled = false;
    let subscription: LocationSubscription | undefined;
    const timeout = setTimeout(() => finish(null), 12_000);

    function finish(coordinates: Coordinates | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      subscription?.remove();
      resolve(coordinates);
    }

    // Android grants this app coarse location. Balanced lets the provider choose a source for the fix.
    void watchPositionAsync({ accuracy: Accuracy.Balanced, mayShowUserSettingsDialog: false },
      ({ coords }) => finish(coords), () => finish(null)).then((watch) => {
      if (settled) watch.remove();
      else subscription = watch;
    }, () => finish(null));
  });
}

export async function locateCurrentCity(): Promise<LocationResult> {
  try {
    const permission = await requestForegroundPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    const previous = await getLastKnownPositionAsync({ maxAge: 120_000, requiredAccuracy: 10_000 });
    const coordinates = previous?.coords ?? await waitForApproximatePosition();
    const city = coordinates && await nearestCity(coordinates);
    return city ? { status: 'located', city } : { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}
