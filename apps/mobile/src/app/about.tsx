import { Subpage } from '../components/Subpage';
import { t } from '../language/messages';

export default function AboutScreen() {
  return <Subpage title={t('about.title')} subtitle={t('app.tagline')} />;
}
