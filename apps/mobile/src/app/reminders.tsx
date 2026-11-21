import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '../components/controls';
import { Subpage } from '../components/Subpage';
import { t } from '../language/messages';

export default function RemindersScreen() {
  const router = useRouter();
  const { fromSetup } = useLocalSearchParams<{ fromSetup?: string }>();
  return <Subpage title={t('reminders.title')} subtitle={t('reminders.body')}>
    {fromSetup === '1' && <View style={styles.actions}>
      <Button label={t('common.done')} onPress={() => router.dismissTo({ pathname: '/today', params: { setup: '1' } })} />
    </View>}
  </Subpage>;
}

const styles = StyleSheet.create({ actions: { marginTop: 22 } });
