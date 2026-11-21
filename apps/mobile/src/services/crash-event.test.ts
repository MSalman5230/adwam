import { describe, expect, it } from 'vitest';

import { isEuSentryDsn, previewTestCrash, scheduleBreadcrumbCategory, scrubCrashEvent } from './crash-event';

const build = { environment: 'preview', release: 'app.preview@0.1.0+3', dist: '3', updateId: 'embedded' };

describe('crash reports', () => {
  it('keeps build metadata and stack coordinates while dropping user and settings values', () => {
    const privateValue = 'Sample report text';
    const result = scrubCrashEvent({
      type: undefined,
      message: privateValue,
      breadcrumbs: [{ category: 'ui.input', message: privateValue }],
      user: { id: privateValue },
      contexts: { settings: { city: privateValue } },
      extra: { choice: privateValue },
      request: { url: `https://example.com?query=${privateValue}` },
      exception: { values: [{
        type: 'TypeError', value: privateValue,
        stacktrace: { frames: [{ filename: 'app:///index.android.bundle', lineno: 42, colno: 10, vars: { value: privateValue } }] },
      }] },
    }, build);

    expect(JSON.stringify(result)).not.toContain(privateValue);
    expect(result).toMatchObject({ environment: 'preview', release: build.release, dist: '3', tags: { 'expo-update-id': 'embedded' } });
    expect(result.exception?.values?.[0]).toMatchObject({
      type: 'TypeError', stacktrace: { frames: [{ filename: 'app:///index.android.bundle', lineno: 42, colno: 10 }] },
    });
  });

  it('keeps the static preview test exception label in preview', () => {
    expect(scrubCrashEvent({ type: undefined, exception: { values: [{ value: previewTestCrash }] } }, build)
      .exception?.values?.[0]?.value).toBe(previewTestCrash);
  });

  it('keeps only the approved numeric scheduling counts in breadcrumbs', () => {
    const counts = { planned: 5, added: 2, cancelled: 1, kept: 3, failed: 0 };
    const result = scrubCrashEvent({ type: undefined, breadcrumbs: [
      { category: 'ui.input', message: 'Typed text' },
      { category: scheduleBreadcrumbCategory, data: { ...counts, failed: 'not a count' } },
      { category: scheduleBreadcrumbCategory, message: 'Reminder title', data: { ...counts, id: 'item:date' } },
    ] }, build);
    expect(result.breadcrumbs).toEqual([{ category: scheduleBreadcrumbCategory, level: 'info', data: counts }]);
  });

  it('accepts only the EU HTTPS ingest endpoint', () => {
    expect(isEuSentryDsn('https://placeholder@o100.ingest.de.sentry.io/123')).toBe(true);
    expect(isEuSentryDsn('https://placeholder@o100.ingest.sentry.io/123')).toBe(false);
    expect(isEuSentryDsn('https://placeholder@o100.ingest.de.sentry.io.example.com/123')).toBe(false);
  });
});
