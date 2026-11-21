import { Redirect, useLocalSearchParams } from 'expo-router';

import { Subpage } from '../../components/Subpage';
import { t } from '../../language/messages';
import { readItemParams } from '../../navigation/item-params';

export default function ItemScreen() {
  const item = readItemParams(useLocalSearchParams());
  if (!item) return <Redirect href="/today" />;
  return <Subpage title={t('navigation.reminder')} subtitle={item.date && t('navigation.itemDate', { date: item.date })} />;
}
