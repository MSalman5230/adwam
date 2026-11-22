import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../language/messages';
import { reportScreenError } from '../services/crash-reporting';
import { colors } from '../theme/tokens';
import { typography } from '../theme/typography';

export function ScreenRecovery({ error, retry }: ErrorBoundaryProps) {
  const reported = useRef<Error | null>(null);
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? colors.dark : colors.light;
  useEffect(() => {
    if (reported.current === error) return;
    reported.current = error;
    reportScreenError(error);
  }, [error]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <ScrollView contentContainerStyle={styles.contents}>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite"
          style={[typography.pageTitle, { color: palette.ink }]}>{t('recovery.title')}</Text>
        <Text style={[typography.supporting, { color: palette.ink2 }]}>{t('recovery.body')}</Text>
        <Pressable accessibilityRole="button" onPress={() => { void retry(); }}
          style={[styles.retry, { backgroundColor: palette.green }]}>
          <Text style={[typography.button, { color: palette.onGreen }]}>{t('recovery.retry')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  contents: { flexGrow: 1, justifyContent: 'center', alignItems: 'flex-start', gap: 14, padding: 24 },
  retry: { minHeight: 48, minWidth: 48, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 20, justifyContent: 'center' },
});
