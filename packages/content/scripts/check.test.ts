import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  duaSchema,
  quranSchema,
  sunnahSchema,
  type GroupedSunnah,
  type SourceCopy,
} from '../schema/index.ts';
import { selectContent } from './build.ts';
import { validateContent, type RepositoryContent } from './check.ts';

const entry: GroupedSunnah = {
  id: 'practice',
  group: 'weekly',
  status: 'review',
  tier: 'inapp',
  title: 'Practice',
  short: 'Sample reminder.',
  what: ['Sample effect.'],
  when: 'Monday.',
  evidence: [],
  duas: [],
  occurrences: [{ on: { weekday: ['mon'] }, window: 'daytime' }],
};
const content = (sunnahs: GroupedSunnah[] = [entry]): RepositoryContent => ({
  version: '2026.11.21',
  sunnahs,
  unshipped: [],
  duas: [],
  evidence: { hadith: [], quran: [], other: [] },
  collections: {},
});
const noCopies = async () => undefined;

describe('content schema', () => {
  it('requires notification text for Push and reviewers for publication', () => {
    const { group, ...item } = entry;
    expect(group).toBe('weekly');
    expect(sunnahSchema.safeParse({ ...item, tier: 'push' }).success).toBe(
      false,
    );
    expect(
      sunnahSchema.safeParse({ ...item, status: 'published' }).success,
    ).toBe(false);
  });

  it('rejects unknown timing fields and rules', () => {
    const { group, ...item } = entry;
    expect(group).toBe('weekly');
    expect(
      sunnahSchema.safeParse({
        ...item,
        occurrences: [
          { on: { weekday: ['mon'] }, window: 'daytime', unscheduled: true },
        ],
      }).success,
    ).toBe(false);
    expect(
      sunnahSchema.safeParse({ ...item, rules: ['new-rule'] }).success,
    ).toBe(false);
  });

  it('rejects missing Arabic or an apostrophe in a transliteration', () => {
    const fields = {
      id: 'example',
      tr: "du'a",
      en: 'Example',
      evidence: ['hadith-one'],
      source: 'hadith-one',
    };
    expect(duaSchema.safeParse(fields).success).toBe(false);
    expect(duaSchema.safeParse({ ...fields, ar: 'Example' }).success).toBe(
      false,
    );
    expect(
      duaSchema.safeParse({ ...fields, ar: arabicFixture() }).success,
    ).toBe(false);
  });
});

function arabicFixture(): string {
  const example = readFileSync(
    new URL('../../../docs/sunnah-content-format.md', import.meta.url),
    'utf8',
  );
  const text = example.match(/^ {2}ar: (.+)$/mu)?.[1];
  if (!text) throw new Error('The documentation fixture is missing');
  return text.normalize('NFC');
}

describe('content validation', () => {
  it('bundles a Qurʾan reference in review builds using its direct source link', async () => {
    const reference = quranSchema.parse({ id: 'quran-2-185', surah: 2, ayah: 185, url: 'https://quran.com/2/185' });
    const data = content([{ ...entry, evidence: [reference.id] }]);
    data.evidence.quran = [reference];
    await expect(validateContent(data, noCopies)).resolves.toEqual([]);
    expect(selectContent(data, true).evidence.quran).toEqual([reference]);
  });

  it('identifies duplicate IDs, unknown references, and transliteration errors', async () => {
    const data = content([
      entry,
      { ...entry, evidence: ['missing'], title: "Qur'an" },
    ]);
    await expect(validateContent(data, noCopies)).resolves.toEqual([
      'Duplicate Sunnah ID: practice',
      'practice: unknown evidence ID missing',
      "practice: use modifier letters for ayn and hamzah in Qur'an",
    ]);
  });

  it('compares Arabic and English with the stored copy', async () => {
    const data = content();
    const source: SourceCopy = {
      ar: arabicFixture(),
      en: 'Exact example.',
      url: 'https://sunnah.com/tirmidhi:1',
      fetched: '2026-11-21',
      translator: 'Fixture',
    };
    data.collections = {
      tirmidhi: {
        name: 'Tirmidhi',
        short: 'Tirmidhi',
        url: 'https://sunnah.com/tirmidhi:{number}',
      },
    };
    data.evidence.hadith = [
      {
        id: 'hadith-one',
        collection: 'tirmidhi',
        number: 1,
        from: 'prophet',
        grading: [],
        excerpt: { ar: source.ar, en: source.en },
        textSource: {
          site: 'sunnah.com',
          fetched: source.fetched,
          translator: source.translator,
        },
      },
    ];
    data.duas = [
      {
        id: 'example',
        ar: source.ar,
        en: 'Changed example.',
        tr: 'Example',
        evidence: ['hadith-one'],
        source: 'hadith-one',
      },
    ];
    await expect(validateContent(data, async () => source)).resolves.toEqual([
      'example: en must match the stored source',
    ]);
    await expect(validateContent(data, noCopies)).resolves.toContain(
      'hadith-one: missing stored sunnah.com source',
    );
  });

  it('includes review entries only in development and requires publication for a release', async () => {
    expect(selectContent(content(), false).sunnahs).toEqual([]);
    expect(selectContent(content(), true).sunnahs).toEqual([entry]);
    await expect(validateContent(content(), noCopies, true)).resolves.toContain(
      'practice: release content must be published',
    );
  });
});
