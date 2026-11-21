import { localToMs } from '@adwam/core';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useStore } from 'zustand';

import { isTestBuild } from '../theme/isTestBuild';
import { runMinuteClock } from './minute-clock';
import { createMomentSession, momentTimeZone } from './moment-session';
import type { DebugMoment } from './moments';
import { clockStore, deviceStores } from './native';

export function useForegroundClock() {
  useEffect(() => {
    const { setNow } = clockStore.getState();
    let stop: (() => void) | undefined;
    const update = (active: boolean) => {
      stop?.();
      stop = active ? runMinuteClock(setNow) : undefined;
    };
    update(AppState.currentState === null || AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => update(state === 'active'));
    return () => {
      stop?.();
      subscription.remove();
    };
  }, []);
}

export function useClock(): number {
  return useStore(clockStore, ({ now, override }) => isTestBuild ? override ?? now : now);
}

export function setDebugTime(instant: number | null, preserveMoment = false) {
  if (!isTestBuild || (instant !== null && !Number.isFinite(instant))) return;
  const clock = clockStore.getState();
  clock.setOverride(instant, preserveMoment ? clock.moment : null);
}

export function setDebugMoment(moment: DebugMoment) {
  if (!isTestBuild) return;
  const instant = localToMs(moment.date, moment.minute, momentTimeZone);
  clockStore.getState().setOverride(instant, createMomentSession(moment.id, instant));
}

export function useMomentSession() {
  return useStore(clockStore, ({ moment }) => isTestBuild ? moment : null);
}

export function useReminderStores() {
  return useMomentSession()?.stores ?? deviceStores;
}
