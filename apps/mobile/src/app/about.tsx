import { Linking } from 'react-native';

import { ListRow } from '../components/cards';
import { SectionHeader } from '../components/headers';
import { Subpage } from '../components/Subpage';
import { t } from '../language/messages';

export default function AboutScreen() {
  return <Subpage title={t('about.title')} subtitle={t('app.tagline')}>
    <SectionHeader title={t('about.credits')} />
    <ListRow title={t('about.cities')} icon="open_in_new" onPress={() => { void Linking.openURL('https://www.geonames.org/'); }} />
    <ListRow title={t('about.weatherLicense')} icon="open_in_new"
      onPress={() => { void Linking.openURL('https://creativecommons.org/licenses/by/4.0/'); }} />
  </Subpage>;
}
