import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../language/messages';
import { useTheme } from '../theme/ThemeProvider';
import { AppBar, PageTitle, useAppBarScroll } from './headers';

export function Subpage({ title, subtitle, overline, titleDetails, heading, overlay, children }: {
  title: string; subtitle?: string; overline?: string; titleDetails?: ReactNode; heading?: ReactNode; overlay?: ReactNode; children?: ReactNode;
}) {
  const router = useRouter();
  const { palette } = useTheme();
  const { scrolled, onScroll } = useAppBarScroll();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <AppBar title={title} scrolled={scrolled} start={{ label: t('common.back'), icon: 'arrow_back', onPress: () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      } }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" onScroll={onScroll} scrollEventThrottle={16}>
        {heading ?? <PageTitle title={title} subtitle={subtitle} overline={overline}>{titleDetails}</PageTitle>}
        {children}
      </ScrollView>
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 }, body: { paddingHorizontal: 20, paddingBottom: 28 } });
