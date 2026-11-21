import { describe, expect, it, vi } from 'vitest';

import { checkLink, evidenceLinks } from './check-links.ts';

describe('evidenceLinks', () => {
  it('resolves collection links, preserves overrides and deduplicates archives', () => {
    expect(
      evidenceLinks(
        [
          { collection: 'muslim', number: '1162b' },
          {
            collection: 'muslim',
            number: '1162b',
            archive: 'https://example.org/archive',
          },
          {
            collection: 'muslim',
            number: '123',
            url: 'https://example.org/special',
          },
        ],
        { muslim: { url: 'https://sunnah.com/muslim:{number}' } },
      ),
    ).toEqual([
      'https://example.org/archive',
      'https://example.org/special',
      'https://sunnah.com/muslim:1162b',
    ]);
  });
});

describe('checkLink', () => {
  it.each([
    [200, 'ok'],
    [404, 'broken'],
    [410, 'broken'],
    [403, 'unverified'],
    [429, 'unverified'],
    [503, 'unverified'],
  ])('classifies HTTP %s as %s', async (status, result) => {
    const request = vi.fn(async () => new Response('test', { status }));
    await expect(
      checkLink('https://example.org', request),
    ).resolves.toMatchObject({ status, result });
    expect(request).toHaveBeenCalledWith(
      'https://example.org',
      expect.objectContaining({
        headers: { 'User-Agent': 'Adwam link check' },
      }),
    );
  });

  it('keeps network failures separate from broken links', async () => {
    const request = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(
      checkLink('https://example.org', request),
    ).resolves.toMatchObject({
      result: 'unverified',
      reason: 'offline',
    });
  });
});
