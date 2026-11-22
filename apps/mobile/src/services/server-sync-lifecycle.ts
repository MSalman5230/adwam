import { addPushTokenListener } from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { settingsStore } from '../state/native';
import { installSnapshot, nativePushTokenChanged, syncServer } from './server-sync';
import { supabase } from './supabase';

export function useServerSyncLifecycle() {
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(retry);
      void syncServer().then((ok) => {
        if (!mounted || AppState.currentState !== 'active') return;
        clearTimeout(retry);
        if (!ok) retry = setTimeout(refresh, 30_000);
      });
    };
    const state = AppState.addEventListener('change', (current) => {
      if (current === 'active') refresh();
      else clearTimeout(retry);
    });
    const unsub = settingsStore.subscribe(({ value }, previous) => {
      if (JSON.stringify(installSnapshot(value)) !== JSON.stringify(installSnapshot(previous.value))) refresh();
    });
    const tokens = addPushTokenListener((token) => {
      nativePushTokenChanged(token);
      refresh();
    });
    refresh();
    return () => {
      mounted = false;
      clearTimeout(retry);
      state.remove();
      tokens.remove();
      unsub();
    };
  }, []);
}
