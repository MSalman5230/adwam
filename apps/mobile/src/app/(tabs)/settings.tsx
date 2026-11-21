import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListRow } from '../../components/cards';
import { Hero, SectionHeader } from '../../components/headers';
import { t } from '../../language/messages';
import { isTestBuild } from '../../theme/isTestBuild';
import { useTheme } from '../../theme/ThemeProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: palette.paper }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Hero title={t('settings.title')} subtitle={t('settings.subtitle')} />
        <SectionHeader title={t('settings.section.reminders')} />
        <ListRow title={t('reminders.title')} icon="notifications" onPress={() => router.push('/reminders')} />
        <SectionHeader title={t('settings.section.app')} />
        <ListRow title={t('about.title')} icon="info" onPress={() => router.push('/about')} />
        {isTestBuild && <ListRow title={t('developerTools.title')} icon="code" onPress={() => router.push('/debug')} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { paddingHorizontal: 20, paddingBottom: 20 } });
