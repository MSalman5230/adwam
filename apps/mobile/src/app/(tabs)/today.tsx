import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hero } from '../../components/headers';
import { Snackbar } from '../../components/overlays';
import { t } from '../../language/messages';
import { useTheme } from '../../theme/ThemeProvider';

export default function TodayScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  useEffect(() => {
    if (setup !== '1') return;
    const timer = setTimeout(() => router.setParams({ setup: undefined }), 5_000);
    return () => clearTimeout(timer);
  }, [router, setup]);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: palette.paper }]}>
      <Hero title={t('navigation.today')} />
      {setup === '1' && <View style={styles.snack}><Snackbar message={t('snackbar.setup')} /></View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  snack: { position: 'absolute', bottom: 20, left: 12, right: 12 },
});
