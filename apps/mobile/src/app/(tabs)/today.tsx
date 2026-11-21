import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hero } from '../../components/headers';
import { t } from '../../language/messages';
import { useTheme } from '../../theme/ThemeProvider';

export default function TodayScreen() {
  const { palette } = useTheme();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: palette.paper }]}>
      <Hero title={t('navigation.today')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, paddingHorizontal: 20 } });
