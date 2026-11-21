import { describe, expect, it } from 'vitest';

import { msg } from './index';

describe('msg', () => {
  it('omits params when there are no substitutions', () => {
    expect(msg('today.title')).toEqual({ key: 'today.title' });
  });

  it('preserves values for interpolation and pluralization', () => {
    expect(msg('tracker.fastsLeft', { count: 0 })).toEqual({
      key: 'tracker.fastsLeft',
      params: { count: 0 },
    });
  });
});
