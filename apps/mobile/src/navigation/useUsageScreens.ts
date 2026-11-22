import { useRootNavigationState, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';

import type { UsageScreen } from '../services/usage-events';
import { track } from '../services/usage-statistics';
import { settingsStore } from '../state/native';

function screenName(segments: readonly string[]): UsageScreen | undefined {
  const [first, second] = segments;
  if (first === '(tabs)' && (second === 'today' || second === 'upcoming' || second === 'settings')) return second;
  if (first === 'item' && second === '[id]') return 'detail';
  if (first === 'setup' || first === 'reminders' || first === 'about') return first;
}

export function useUsageScreens() {
  const routeKey = useRootNavigationState()?.key;
  const screen = screenName(useSegments());
  const consent = useStore(settingsStore, ({ value }) => value.usageStats);
  const previous = useRef<UsageScreen | undefined>(undefined);
  useEffect(() => {
    if (!consent || !routeKey) {
      previous.current = undefined;
      return;
    }
    if (screen && previous.current !== screen) track({ event: '$screen', properties: { $screen_name: screen } });
    previous.current = screen;
  }, [consent, routeKey, screen]);
}
