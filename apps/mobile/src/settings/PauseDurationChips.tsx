import { StyleSheet, View } from 'react-native';

import { Chip } from '../components/controls';
import { t } from '../language/messages';
import { pauseDurations, type PauseDays } from './fasting-pause';

export function PauseDurationChips({ selected, onChange }: {
  selected?: number; onChange: (days: PauseDays) => void;
}) {
  return <View style={styles.chips}>
    {pauseDurations.map((days) => <Chip key={days}
      label={days ? t('reminders.pauseDays', { count: days }) : t('reminders.pauseUntilOff')}
      selected={selected === days} onPress={() => onChange(days)} />)}
  </View>;
}

const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
