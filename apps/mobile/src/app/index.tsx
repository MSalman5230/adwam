import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { t } from '../language/messages';
import { checkLocalSupabase } from '../services/local-supabase';
import { isTestBuild } from '../theme/isTestBuild';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

export default function HomeScreen() {
  const { palette } = useTheme();
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
    <View style={[styles.screen, { backgroundColor: palette.paper }]}>
      <Text accessibilityRole="header" style={[typography.hijriTitle, styles.centered, { color: palette.ink }]}>
        {t('app.name')}
      </Text>
      <Text style={[typography.subtitle, styles.tagline, { color: palette.ink2 }]}>{t('app.tagline')}</Text>
      {connection && (
        <Text accessibilityLiveRegion="polite" style={[typography.subtitle, styles.tagline, { color: palette.ink2 }]}>
          {t(`development.supabase.${connection}`)}
        </Text>
      )}
      {isTestBuild && (
        <>
          <Link href="/debug/theme" style={[typography.button, styles.tagline, { color: palette.green }]}>
            {t('developerTools.themeGallery')}
          </Link>
          <Link href="/debug/clock" style={[typography.button, styles.tagline, { color: palette.green }]}>
            {t('developerTools.dateAndTime')}
          </Link>
          <Link href="/debug/components" style={[typography.button, styles.tagline, { color: palette.green }]}>
            {t('developerTools.componentGallery')}
          </Link>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centered: { textAlign: 'center' },
  tagline: { textAlign: 'center', marginTop: 8 },
});
