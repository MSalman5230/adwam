import { expect, it } from 'vitest';

import { defaultTrackers } from './schema';
import { editMakeup, editTick } from './tracker-edits';

it('undoes a Done tick by its permanent key and preserves other edits', () => {
  const key = 'kahf:2026-12-18';
  const { next, undo } = editTick(defaultTrackers(), { kind: 'done', key }, true);
  expect(next.done).toEqual({ [key]: true });
  expect(undo({ ...next, done: { ...next.done, 'friday-prep:2026-12-18': true } }).done).toEqual({ 'friday-prep:2026-12-18': true });
});

it('restores the logged civil date and leaves a subsequent change on that date alone', () => {
  const date = '2026-12-18';
  const original = { ...defaultTrackers(), fastLog: { [date]: true } };
  const { next, undo } = editTick(original, { kind: 'fastLog', key: date }, false);
  expect(next.fastLog).toEqual({});
  expect(undo(next)).toEqual(original);
  const later = { ...next, fastLog: { [date]: true } };
  expect(undo(later)).toBe(later);
});

it('restores the previous make-up count, including an unset count', () => {
  const original = defaultTrackers();
  const { next, undo } = editMakeup(original, 2);
  expect(next.makeup).toBe(2);
  expect(undo(next).makeup).toBeNull();
  expect(undo({ ...next, makeup: 1 }).makeup).toBe(1);
});
