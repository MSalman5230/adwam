import { expect, it } from 'vitest';

import { contentProblemUrl } from './report-url';

it('prefills the GitHub issue form with the item and preserves punctuation and line breaks', () => {
  const description = 'Source A & B\nThe time changed by +15 minutes.';
  const entry = { id: 'white-days', group: 'monthly', title: 'White Days fast' } as const;
  const url = new URL(contentProblemUrl(entry, '2026.11.21', '0.1.0', description));

  expect(url.origin + url.pathname).toBe('https://github.com/MSalman5230/adwam/issues/new');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    template: 'content-problem.yml', item: entry.title, 'item-id': 'monthly.white-days',
    'content-version': '2026.11.21', 'app-version': '0.1.0', description,
  });
});
