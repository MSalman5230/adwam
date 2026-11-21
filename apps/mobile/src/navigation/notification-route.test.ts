import { expect, it } from 'vitest';

import { notificationRoute } from './notification-route';

it('opens Today or the dated detail occurrence identified in the reminder', () => {
  expect(notificationRoute('/today')).toEqual({ pathname: '/today' });
  expect(notificationRoute('/item/white-days?date=2026-12-22&occurrenceKey=white-days%3A2026-12-22')).toEqual({
    pathname: '/item/[id]', params: { id: 'white-days', date: '2026-12-22', occurrenceKey: 'white-days:2026-12-22' },
  });
});

it.each(['https://example.com/', '//item/kahf', '/settings', '/item/../settings', '/item/kahf?date=2026-02-30'])(
  'rejects links outside the reminder routes or invalid dates (%s)',
  (link) => expect(notificationRoute(link)).toBeUndefined(),
);
