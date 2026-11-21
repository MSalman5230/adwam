import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { Button } from '../../components/controls';
import { Hero, PageTitle } from '../../components/headers';
import { t } from '../../language/messages';
import { CityPicker } from '../../location/CityPicker';
import type { NamedCity } from '../../location/cities';
import { locateCurrentCity } from '../../location/current-city';
import { settingsStore } from '../../state/native';
import { isTestBuild } from '../../theme/isTestBuild';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';

export default function SetupScreen() {
  const { palette } = useTheme();
  const selected = useStore(settingsStore, ({ value }) => value.location);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const choose = ({ name, latitude, longitude, countryCode, timeZone }: NamedCity, source: 'city' | 'current') => {
    settingsStore.getState().update((value) => ({ ...value, location: { name, latitude, longitude, countryCode, timeZone, source } }));
    setPickerOpen(false);
  };
  const useLocation = async () => {
    setLocating(true);
    const result = await locateCurrentCity();
    setLocating(false);
    if (result.status === 'located') choose(result.city, 'current');
    else setPickerOpen(true);
  };
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <Hero title={t('app.name')} subtitle={t('app.tagline')} />
      <PageTitle title={t('setup.location.title')} overline={t('setup.step', { step: 1, total: 4 })} />
      <Text style={[typography.setupBody, { color: palette.ink2 }]}>{t('setup.location.body')}</Text>
      {selected && <Text accessibilityLiveRegion="polite" style={[typography.listTitle, { color: palette.ink }]}>{selected.name}</Text>}
      {isTestBuild && <Link href="/debug" style={[typography.button, { color: palette.green }]}>{t('developerTools.title')}</Link>}
      <View style={styles.actions}>
        <Button label={t(locating ? 'setup.location.finding' : 'setup.location.useLocation')} icon="my_location"
          disabled={locating} onPress={() => { void useLocation(); }} />
        <Button label={t('setup.location.pickCity')} icon="search" variant="outlined" disabled={locating} onPress={() => setPickerOpen(true)} />
      </View>
      <CityPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(city) => choose(city, 'city')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  actions: { marginTop: 'auto', gap: 10, paddingBottom: 16 },
});
