import catalog from '@adwam/content/catalog';
import type { GroupedSunnah } from '@adwam/content/schema';
import { prayerReminder, prayerReminderId, reminderPrayers, type PrayerReminderCopy, type ReminderPrayer } from '@adwam/core';

import { t } from '../language/messages';

function prayerCopy(prayer: ReminderPrayer) {
  const name = t(`calendar.prayer.${prayer}`);
  return { title: name, pushTitle: t('reminder.prayers.pushTitle', { prayer: name }), pushBody: t('reminder.prayers.pushBody') };
}

const copy: PrayerReminderCopy = {
  title: t('reminder.prayers.title'),
  short: t('reminder.prayers.short'),
  what: [t('reminder.prayers.what')],
  when: t('reminder.prayers.when'),
  pushNote: t('reminder.prayers.pushNote'),
  prayers: Object.fromEntries(reminderPrayers.map((prayer) => [prayer, prayerCopy(prayer)])) as PrayerReminderCopy['prayers'],
};

/** The prayer-time reminder, built from the user's prayer times rather than read from the content files. */
export const prayerEntry: GroupedSunnah = prayerReminder(copy);

/** Every reminder the app offers: the content catalogue plus the built-in prayer-time reminder. */
export const reminderCatalog: readonly GroupedSunnah[] = [...catalog.sunnahs, prayerEntry];

export { prayerReminderId };
