import catalog from '@adwam/content/catalog';
import { applyPreset, civil, effectiveHijri, presetOf, pushEstimate, type Preset } from '@adwam/core';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';

import { Button } from '../components/controls';
import { Snackbar } from '../components/overlays';
import { Subpage } from '../components/Subpage';
import { t } from '../language/messages';
import { FastingPauseCard, PresetCard, ReminderGroup, groupOrder } from '../reminders/controls';
import { activePauseDuration, pauseFor } from '../settings/fasting-pause';
import { UdhiyahSheet } from '../settings/preference-sheets';
import { setReminderChoice } from '../state/reminder-choices';
import type { Settings } from '../state/schema';
import { selectReminderState } from '../state/selectors';
import { useClock, useReminderStores } from '../state/useClock';

export default function RemindersScreen() {
  const router = useRouter();
  const { fromSetup } = useLocalSearchParams<{ fromSetup?: string }>();
  const { settings: settingsStore, trackers: trackersStore, serverCache: cacheStore } = useReminderStores();
  const settings = useStore(settingsStore, ({ value }) => value);
  const trackers = useStore(trackersStore, ({ value }) => value);
  const cache = useStore(cacheStore, ({ value }) => value);
  const now = useClock();
  const [udhiyahOpen, setUdhiyahOpen] = useState(false);
  const [undoPause, setUndoPause] = useState<() => void>();
  useEffect(() => {
    if (!undoPause) return;
    const timeout = setTimeout(() => setUndoPause(undefined), 5_000);
    return () => clearTimeout(timeout);
  }, [undoPause]);

  const state = selectReminderState(settings, trackers, cache, catalog.sunnahs);
  if (!state || !settings.location) return <Redirect href="/today" />;
  const today = civil(now, settings.location.timeZone).iso;
  const { year } = effectiveHijri(now, state.calendar);
  const pause = settings.reminders.pause;
  const duration = activePauseDuration(pause, today);
  const { update } = settingsStore.getState();
  const choosePreset = (preset: Preset) => update((value) => ({
    ...value, reminders: { ...value.reminders, ...applyPreset({ ...state, preferences: value.reminders }, preset) },
  }));
  const setPause = (next: Settings['reminders']['pause']) => update((value) => ({
    ...value, reminders: { ...value.reminders, pause: next },
  }));
  const togglePause = (active: boolean) => {
    if (!active) {
      setUndoPause(undefined);
      setPause(null);
      return;
    }
    const next = pauseFor(today, 7);
    setPause(next);
    setUndoPause(() => () => update((value) => value.reminders.pause === next ? {
      ...value, reminders: { ...value.reminders, pause },
    } : value));
  };

  return (
    <Subpage title={t('reminders.title')} subtitle={t('reminders.body')}
      overlay={undoPause && <View style={styles.snackbar}>
        <Snackbar message={t('snackbar.paused', { count: 7 })} onUndo={() => {
          undoPause();
          setUndoPause(undefined);
        }} />
      </View>}>
      <PresetCard estimate={pushEstimate(state, year)} preset={presetOf(state)} onChange={choosePreset} />
      <FastingPauseCard duration={duration} until={pause?.until} onToggle={togglePause} onDuration={(days) => {
        setUndoPause(undefined);
        setPause(pauseFor(today, days));
      }} />
      {groupOrder.map((group) => <ReminderGroup key={group} group={group} state={state} year={year}
        onToggle={(enabled) => update((value) => ({
          ...value, reminders: { ...value.reminders, groupOn: { ...value.reminders.groupOn, [group]: enabled } },
        }))}
        onChoice={(entry, choice) => update((value) => setReminderChoice(value, entry, choice))}
        onOpen={(entry) => router.push({ pathname: '/item/[id]', params: { id: entry.id } })}
        onUdhiyah={() => setUdhiyahOpen(true)} />)}
      {fromSetup === '1' && <Button label={t('common.done')} style={styles.actions}
        onPress={() => router.dismissTo({ pathname: '/today', params: { setup: '1' } })} />}
      {udhiyahOpen && <UdhiyahSheet settings={settings} year={year} update={update} onClose={() => setUdhiyahOpen(false)} />}
    </Subpage>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: 22 },
  snackbar: { position: 'absolute', left: 16, right: 16, bottom: 16 },
});
