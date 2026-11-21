import { describe, expect, expectTypeOf, it } from 'vitest';

import { msg, type MessageKey } from './index';

describe('msg', () => {
  it('omits params when there are no substitutions', () => {
    expect(msg('today.activeTitle')).toEqual({ key: 'today.activeTitle' });
  });

  it('preserves values for interpolation and pluralization', () => {
    expect(msg('reminder.tracker.makeup', { count: 0 })).toEqual({
      key: 'reminder.tracker.makeup',
      params: { count: 0 },
    });
  });

  it('accepts dictionary keys and rejects misspellings in TypeScript', () => {
    expectTypeOf<'today.activeTitle'>().toExtend<MessageKey>();
    expectTypeOf<'reminder.tracker.makeup'>().toExtend<MessageKey>();
    expectTypeOf<'today.activeTitel'>().not.toExtend<MessageKey>();
  });
});
