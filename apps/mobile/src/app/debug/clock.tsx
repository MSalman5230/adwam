import { civil, localToMs, type CivilDate } from '@adwam/core';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { t } from '../../language/messages';
import { useMessageFormat } from '../../language/useMessageFormat';
import { moments } from '../../state/moments';
import { settingsStore } from '../../state/native';
import { setDebugMoment, setDebugTime, useClock, useMomentSession } from '../../state/useClock';
import { isTestBuild } from '../../theme/isTestBuild';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';

function clockInput(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function DebugClock() {
  const router = useRouter();
  const { palette } = useTheme();
  const session = useMomentSession();
  const place = useStore(settingsStore, ({ value }) => value.location);
  const actualFormat = useMessageFormat(place?.timeZone);
  const previewPlace = session?.stores.settings.getState().value.location;
  const format = { ...actualFormat, timeZone: previewPlace?.timeZone ?? actualFormat.timeZone };
  const now = useClock();
  const current = civil(now, format.timeZone);
  const [date, setDate] = useState<string>(current.iso);
  const [time, setTime] = useState(clockInput(current.min));
  const [invalid, setInvalid] = useState(false);
  const selected = session?.id;

  const apply = () => {
    const match = time.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) { setInvalid(true); return; }
    try {
      setDebugTime(localToMs(date.trim() as CivilDate, Number(match[1]) * 60 + Number(match[2]), actualFormat.timeZone));
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  };

  const pick = (moment: (typeof moments)[number]) => {
    setDate(moment.date);
    setTime(clockInput(moment.minute));
    setDebugMoment(moment);
    setInvalid(false);
  };
  const reset = () => {
    setDebugTime(null);
    const wall = civil(Date.now(), actualFormat.timeZone);
    setDate(wall.iso);
    setTime(clockInput(wall.min));
    setInvalid(false);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.control}>
          <Text style={[typography.button, { color: palette.green }]}>{t('common.back')}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[typography.pageTitle, { color: palette.ink }]}>
          {t('developerTools.dateAndTime')}
        </Text>
        <Text accessibilityLiveRegion="polite" style={[typography.caption, { color: palette.ink2 }]}>
          {t('developerTools.clock.current', { date: current.iso, time: now }, format)}
        </Text>
        <View style={styles.row}>
          <TextInput
            accessibilityLabel={t('developerTools.clock.date')}
            style={[typography.body, styles.input, { borderColor: palette.hair2, color: palette.ink }]}
            placeholder={t('developerTools.clock.dateHint')}
            placeholderTextColor={palette.ink2}
            autoCapitalize="none"
            value={date}
            onChangeText={setDate}
          />
          <TextInput
            accessibilityLabel={t('developerTools.clock.time')}
            style={[typography.body, styles.input, { borderColor: palette.hair2, color: palette.ink }]}
            placeholder={t('developerTools.clock.timeHint')}
            placeholderTextColor={palette.ink2}
            value={time}
            onChangeText={setTime}
          />
        </View>
        {invalid && (
          <Text accessibilityLiveRegion="assertive" style={[typography.caption, { color: palette.rust }]}>
            {t('developerTools.clock.invalid')}
          </Text>
        )}
        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={apply} style={[styles.control, { backgroundColor: palette.green }]}>
            <Text style={[typography.button, { color: palette.onGreen }]}>{t('developerTools.clock.apply')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={reset} style={styles.control}>
            <Text style={[typography.button, { color: palette.green }]}>{t('developerTools.clock.reset')}</Text>
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={[typography.sectionTitle, { color: palette.green }]}>{t('developerTools.moments')}</Text>
        {moments.map((moment) => (
          <Pressable
            key={moment.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === moment.id }}
            style={[styles.control, { backgroundColor: selected === moment.id ? palette.sage : palette.surface }]}
            onPress={() => pick(moment)}
          >
            <Text style={[typography.listTitle, { color: palette.ink }]}>{t(moment.label)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ClockRoute() {
  return isTestBuild ? <DebugClock /> : <Redirect href="/" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 48, minWidth: 88, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  control: { minHeight: 48, minWidth: 48, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12 },
});
