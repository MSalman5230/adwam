import catalog from '@adwam/content/catalog';
import { applyPreset, suggestedPrayerMethod, type DaySettings } from '@adwam/core';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { Button } from '../../components/controls';
import {
  SetupHijriDate, SetupLocationDetails, SetupNotificationPreview, SetupReminderChoices, SetupWelcome, type SetupPreset,
} from '../../components/SetupSteps';
import { Icon } from '../../icons';
import { t } from '../../language/messages';
import { CityPicker } from '../../location/CityPicker';
import type { NamedCity } from '../../location/cities';
import { locateCurrentCity } from '../../location/current-city';
import { requestSetupNotifications } from '../../services/setup-notifications';
import { serverCacheStore, settingsStore, trackersStore } from '../../state/native';
import type { Settings } from '../../state/schema';
import { selectReminderState } from '../../state/selectors';
import { useClock } from '../../state/useClock';
import { isTestBuild } from '../../theme/isTestBuild';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';

const steps = [1, 2, 3, 4] as const;
type Step = (typeof steps)[number];
const titles = { 1: 'setup.location.title', 2: 'setup.hijri.title', 3: 'setup.reminders.title', 4: 'setup.notifications.title' } as const;

export default function SetupScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const settings = useStore(settingsStore, ({ value }) => value);
  const { location, prayer, hijri } = settings;
  const now = useClock();
  const [step, setStep] = useState<Step>(1);
  const [preset, setPreset] = useState<SetupPreset>('recommended');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const back = useCallback(() => {
    if (step === 1) return false;
    if (!requesting) setStep(steps[step - 2]!);
    return true;
  }, [requesting, step]);
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', back);
    return () => listener.remove();
  }, [back]));

  const choose = ({ name, latitude, longitude, countryCode, timeZone }: NamedCity, source: 'city' | 'current') => {
    settingsStore.getState().update((value) => ({
      ...value,
      location: { name, latitude, longitude, countryCode, timeZone, source },
      prayer: { ...value.prayer, method: suggestedPrayerMethod(countryCode) },
    }));
    setPickerOpen(false);
    setStep(2);
  };
  const useLocation = async () => {
    setLocating(true);
    const result = await locateCurrentCity();
    setLocating(false);
    if (result.status === 'located') choose(result.city, 'current');
    else setPickerOpen(true);
  };

  const finish = (notifications: Settings['reminders']['notifications']) => {
    const state = selectReminderState(settingsStore.getState().value, trackersStore.getState().value,
      serverCacheStore.getState().value, catalog.sunnahs);
    if (!state) return;
    const reminders = applyPreset(state, preset === 'inapp' ? 'inapp' : 'recommended');
    settingsStore.getState().update((value) => ({
      ...value, reminders: { ...value.reminders, ...reminders, notifications }, setupDone: true, usagePrompt: true,
    }));
    if (preset === 'custom') router.navigate({ pathname: '/reminders', params: { fromSetup: '1' } }, { withAnchor: true });
    else router.replace({ pathname: '/today', params: { setup: '1' } });
  };
  const askNotifications = async () => {
    setRequesting(true);
    const permission = await requestSetupNotifications().catch(() => 'unset' as const);
    finish(permission);
    setRequesting(false);
  };

  const calendar: DaySettings | undefined = location ? { place: location, prayer, hijri } : undefined;
  const progress = t('setup.step', { step, total: steps.length });
  const body = () => {
    switch (step) {
      case 1: return <>
        <Text style={[typography.setupBody, { color: palette.ink2 }]}>{t('setup.location.body')}</Text>
        <SetupLocationDetails placeName={location?.name} />
        {isTestBuild && <Link href="/debug" style={[styles.debug, typography.button, { color: palette.green }]}>{t('developerTools.title')}</Link>}
      </>;
      case 2: return calendar && location && <SetupHijriDate calendar={calendar} city={location.name} now={now} shift={hijri.shift}
        onShift={(shift) => settingsStore.getState().update((value) => ({ ...value, hijri: { ...value.hijri, shift } }))} />;
      case 3: return <>
        <Text style={[typography.setupBody, { color: palette.ink2 }]}>{t('setup.reminders.body')}</Text>
        <SetupReminderChoices preset={preset} onChoose={setPreset} />
      </>;
      case 4: return location && <SetupNotificationPreview now={now} timeZone={location.timeZone} quiet={settings.reminders.quietHours} />;
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <View style={styles.top}>
        {step > 1 && <Pressable style={styles.back} accessibilityLabel={t('common.back')} accessibilityRole="button" onPress={back} disabled={requesting}>
          <Icon name="arrow_back" color={palette.ink} />
        </Pressable>}
        <View accessible accessibilityRole="progressbar" accessibilityLabel={progress} style={styles.progress}>
          {steps.map((index) => <View key={index} aria-hidden style={[styles.progressBar, { backgroundColor: index <= step ? palette.green : palette.hair2 }]} />)}
        </View>
      </View>
      <ScrollView key={step} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && <SetupWelcome />}
        <Text style={[styles.overline, typography.overline, { color: palette.gold }]}>{progress}</Text>
        <Text accessibilityRole="header" style={[styles.title, typography.setupTitle, { color: palette.ink }]}>{t(titles[step])}</Text>
        {body()}
      </ScrollView>
      <View style={styles.actions}>
        {step === 1 ? <>
          <Button label={t(locating ? 'setup.location.finding' : 'setup.location.useLocation')} icon="my_location"
            disabled={locating} onPress={() => { void useLocation(); }} />
          <Button label={t('setup.location.pickCity')} icon="search" variant="outlined" disabled={locating} onPress={() => setPickerOpen(true)} />
        </> : <>
          <Button label={t('common.continue')} disabled={requesting} onPress={() => {
            if (step === 2) setStep(3);
            else if (step === 3 && preset === 'inapp') finish('unset');
            else if (step === 3) setStep(4);
            else void askNotifications();
          }} />
          {step === 4 && <Button label={t('common.notNow')} variant="text" disabled={requesting} onPress={() => finish('unset')} />}
        </>}
      </View>
      <CityPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(city) => choose(city, 'city')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', height: 60, paddingLeft: 6, paddingRight: 20 },
  back: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  progress: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  progressBar: { width: 28, height: 4, borderRadius: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  overline: { marginTop: 22, marginBottom: 12 },
  title: { marginBottom: 8 },
  debug: { marginTop: 14 },
  actions: { gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
});
