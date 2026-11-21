import { Redirect } from 'expo-router';
import { useStore } from 'zustand';

import { settingsStore } from '../state/native';

export default function EntryRoute() {
  const setupDone = useStore(settingsStore, ({ value }) => value.setupDone);
  return <Redirect href={setupDone ? '/today' : '/setup'} />;
}
