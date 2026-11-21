import type { CorrectionOffer, Settings } from '../state/schema';

export function answerTodayNotice(settings: Settings, id: string, action: string, year: number, correction?: CorrectionOffer): Settings {
  switch (id) {
    case 'usage':
      return { ...settings, usagePrompt: false, usageStats: action === 'share' };
    case 'udhiyah':
      if (action !== 'yes' && action !== 'no') return settings;
      return { ...settings, reminders: { ...settings.reminders, udhiyah: { ...settings.reminders.udhiyah, [year]: action } } };
    case 'pause':
      return { ...settings, reminders: { ...settings.reminders, pause: null } };
    case 'correction': {
      if (!correction || (action !== 'accept' && action !== 'decline')) return settings;
      const { id, year, month, start } = correction;
      const accepted = action === 'accept';
      const correctedMonths = settings.hijri.corrections.filter((item) => item.year !== year || item.month !== month);
      return {
        ...settings,
        correctionChoices: { ...settings.correctionChoices, [id]: accepted ? 'accepted' : 'declined' },
        hijri: accepted ? { ...settings.hijri, corrections: [...correctedMonths, { year, month, start }] } : settings.hijri,
      };
    }
    default:
      return settings;
  }
}

export function undoTodayCorrection(current: Settings, previous: Settings, offer: CorrectionOffer, accepted: boolean): Settings {
  if (current.correctionChoices[offer.id] !== (accepted ? 'accepted' : 'declined')) return current;
  const { id, year, month } = offer;
  const choices = { ...current.correctionChoices };
  if (previous.correctionChoices[id]) choices[id] = previous.correctionChoices[id];
  else delete choices[id];
  const applies = (correction: Settings['hijri']['corrections'][number]) => correction.year === year && correction.month === month;
  if (!accepted || !current.hijri.corrections.some((entry) => applies(entry) && entry.start === offer.start)) {
    return { ...current, correctionChoices: choices };
  }
  return {
    ...current,
    correctionChoices: choices,
    hijri: { ...current.hijri, corrections: [...current.hijri.corrections.filter((entry) => !applies(entry)), ...previous.hijri.corrections.filter(applies)] },
  };
}
