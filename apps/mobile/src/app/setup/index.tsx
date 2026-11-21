import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hero, PageTitle } from '../../components/headers';
import { t } from '../../language/messages';
import { isTestBuild } from '../../theme/isTestBuild';
import { useTheme } from '../../theme/ThemeProvider';
import { typography } from '../../theme/typography';

export default function SetupScreen() {
  const { palette } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <Hero title={t('app.name')} subtitle={t('app.tagline')} />
      <PageTitle title={t('setup.location.title')} overline={t('setup.step', { step: 1, total: 4 })} />
      <Text style={[typography.setupBody, { color: palette.ink2 }]}>{t('setup.location.body')}</Text>
      {isTestBuild && <Link href="/debug" style={[typography.button, { color: palette.green }]}>{t('developerTools.title')}</Link>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, paddingHorizontal: 20, paddingTop: 24, gap: 16 } });
