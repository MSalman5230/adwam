import { Subpage } from '../components/Subpage';
import { t } from '../language/messages';

export default function RemindersScreen() {
  return <Subpage title={t('reminders.title')} subtitle={t('reminders.body')} />;
}
