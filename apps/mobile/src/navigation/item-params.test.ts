import { expect, it } from 'vitest';

import { readItemParams } from './item-params';

it('carries the reminder ID and optional civil date from an incoming link', () => {
  expect(readItemParams({ id: 'white-days', date: '2028-02-29' })).toEqual({ id: 'white-days', date: '2028-02-29' });
  expect(readItemParams({ id: 'shawwal6' })).toEqual({ id: 'shawwal6', date: undefined });
});

it.each([
  {}, { id: ['rain', 'white-days'] }, { id: '../today' }, { id: 'rain', date: ['2026-12-18', '2026-12-19'] },
  { id: 'rain', date: '2026-02-29' }, { id: 'rain', date: '2026-12-18T00:00:00Z' },
])('rejects invalid route parameters %j', (params) => {
  expect(readItemParams(params)).toBeUndefined();
});
