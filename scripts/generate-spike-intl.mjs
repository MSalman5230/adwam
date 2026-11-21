import { writeFileSync } from 'node:fs';

const zones = {
  'Europe/London': [
    '2026-03-29T00:59Z',
    '2026-03-29T01:01Z',
    '2026-10-25T00:59Z',
    '2026-10-25T01:01Z',
  ],
  'America/Toronto': [
    '2026-03-08T06:59Z',
    '2026-03-08T07:01Z',
    '2026-11-01T05:59Z',
    '2026-11-01T06:01Z',
  ],
  'Australia/Sydney': [
    '2026-04-04T15:59Z',
    '2026-04-04T16:01Z',
    '2026-10-03T15:59Z',
    '2026-10-03T16:01Z',
  ],
  'Australia/Lord_Howe': ['2026-04-04T14:59Z', '2026-04-04T15:01Z'],
  'Asia/Kolkata': ['2026-12-31T18:31Z'],
  'Asia/Jakarta': ['2026-12-31T17:01Z'],
  'Africa/Johannesburg': ['2026-12-31T22:01Z'],
  'Europe/Oslo': ['2026-03-29T01:01Z'],
  'America/St_Johns': ['2026-03-08T05:31Z'],
  'Pacific/Auckland': ['2026-09-26T14:01Z'],
};
const options = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};
const dates = Object.entries(zones).flatMap(([timeZone, instants]) => {
  const dateFormat = new Intl.DateTimeFormat('en-GB', { ...options, timeZone });
  return instants.map((instant) => ({
    timeZone,
    instant,
    expected: dateFormat
      .formatToParts(new Date(instant))
      .filter((part) => part.type !== 'literal'),
  }));
});
const plurals = ['en', 'ar'].flatMap((locale) => {
  const rules = new Intl.PluralRules(locale);
  return [0, 1, 2, 5, 11, 100].map((value) => ({
    locale,
    value,
    expected: rules.select(value),
  }));
});
writeFileSync(
  new URL('../apps/mobile/src/spike/intl-reference.json', import.meta.url),
  JSON.stringify({ options, dates, plurals }, null, 2) + '\n',
);
