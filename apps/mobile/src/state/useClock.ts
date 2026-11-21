import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useStore } from 'zustand';

import { isTestBuild } from '../theme/isTestBuild';
import { runMinuteClock } from './minute-clock';
import { clockStore } from './native';

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

export function setDebugTime(instant: number | null) {
  if (isTestBuild && (instant === null || Number.isFinite(instant))) clockStore.getState().setOverride(instant);
}
