import { expect, it } from 'vitest';

import { defaultSettings, type CorrectionOffer } from '../state/schema';
import { answerTodayNotice, undoTodayCorrection } from './notice-actions';

const offer: CorrectionOffer = { id: 'gb-1448-9', countryCode: 'GB', region: 'the United Kingdom', year: 1448, month: 9, start: '2027-02-07' };

it('applies an accepted month correction and undoes only that decision', () => {
  const before = defaultSettings();
  const applied = answerTodayNotice(before, 'correction', 'accept', offer.year, offer);
  expect(applied.hijri.corrections).toEqual([{ id: offer.id, year: 1448, month: 9, start: '2027-02-07' }]);
  expect(applied.correctionChoices).toEqual({ [offer.id]: 'accepted' });
  const after = undoTodayCorrection({ ...applied, usageStats: true }, before, offer, true);
  expect(after).toEqual({ ...before, usageStats: true });
});

it('records a declined correction and leaves the selected date unchanged', () => {
  const before = defaultSettings();
  const declined = answerTodayNotice(before, 'correction', 'decline', offer.year, offer);
  expect(declined.hijri).toBe(before.hijri);
  expect(declined.correctionChoices).toEqual({ [offer.id]: 'declined' });
});
