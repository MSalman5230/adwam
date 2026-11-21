import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useStore } from 'zustand';

import { Button } from '../../components/controls';
import { Subpage } from '../../components/Subpage';
import { t } from '../../language/messages';
import { checkLocalSupabase } from '../../services/local-supabase';
import { settingsStore } from '../../state/native';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';

export default function DebugScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const setupDone = useStore(settingsStore, ({ value }) => value.setupDone);
  const [connection, setConnection] = useState<'connected' | 'failed'>();

  useEffect(() => {
    let active = true;
    void checkLocalSupabase()?.then((result) => {
      if (active) setConnection(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Subpage title={t('developerTools.title')}>
      {connection && (
        <Text accessibilityLiveRegion="polite" style={[typography.subtitle, styles.row, { color: palette.ink2 }]}>
          {t(`development.supabase.${connection}`)}
        </Text>
      )}
      <Link href="/debug/theme" style={[typography.button, styles.row, { color: palette.green }]}>{t('developerTools.themeGallery')}</Link>
      <Link href="/debug/clock" style={[typography.button, styles.row, { color: palette.green }]}>{t('developerTools.dateAndTime')}</Link>
      <Link href="/debug/components" style={[typography.button, styles.row, { color: palette.green }]}>{t('developerTools.componentGallery')}</Link>
      <Button label={t(setupDone ? 'developerTools.showSetup' : 'developerTools.skipSetup')} variant="outlined" onPress={() => {
        settingsStore.getState().update((value) => ({ ...value, setupDone: !setupDone }));
        router.dismissTo('/');
      }} />
    </Subpage>
  );
}

const styles = StyleSheet.create({ row: { marginVertical: 8 } });
