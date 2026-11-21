import { Redirect } from 'expo-router';
import { useStore } from 'zustand';

import { useReminderStores } from '../state/useClock';

export default function EntryRoute() {
  const { settings } = useReminderStores();
  const setupDone = useStore(settings, ({ value }) => value.setupDone);
  return <Redirect href={setupDone ? '/today' : '/setup'} />;
}
