import { z } from 'zod';

import {
  contentRule,
  hijriMonth,
  id,
  occurrenceSchema,
  wording,
} from './timing.ts';

export type {
  CalendarSelector,
  ContentRule,
  HijriMonth,
  OccurrenceDefinition,
  TimePoint,
  TimingSelector,
  WeatherKind,
} from './timing.ts';

export const groups = [
  'weekly',
  'monthly',
  'yearly',
  'weather',
  'disputed',
] as const;
export type ContentGroup = (typeof groups)[number];

const webUrl = z.url({ protocol: /^https$/ });
const reviewed = z.strictObject({ by: wording, on: z.iso.date() });
const tier = z.enum(['push', 'inapp']);
const arabic = wording.refine(
  (value) => /\p{Script=Arabic}/u.test(value),
  'Arabic text is required',
);
const transliteration = wording.refine(
  (value) => !/['‘’]/.test(value),
  'Use modifier letters for ayn and hamzah instead of apostrophes',
);
const excerpt = z.strictObject({
  ar: arabic,
  en: wording,
  partial: z.boolean().optional(),
});
const sourceCredit = { fetched: z.iso.date(), translator: wording };

export const sunnahSchema = z
  .strictObject({
    id,
    status: z.enum(['draft', 'review', 'published', 'retired']),
    month: hijriMonth.optional(),
    tier,
    default: z.enum(['push', 'inapp', 'off']).optional(),
    title: wording,
    short: wording,
    what: z.array(wording).min(1),
    when: wording,
    pushNote: wording.optional(),
    notes: z.array(wording).optional(),
    evidence: z.array(id),
    duas: z.array(id),
    quran: z.strictObject({ label: wording, url: webUrl }).optional(),
    rules: z.array(contentRule).optional(),
    hidden: z.boolean().optional(),
    occurrences: z.array(occurrenceSchema),
    reviewed: reviewed.optional(),
  })
  .superRefine((entry, context) => {
    if (entry.status === 'published' && !entry.reviewed) {
      context.addIssue({
        code: 'custom',
        path: ['reviewed'],
        message: 'Published entries need a reviewer and date',
      });
    }
    if (
      entry.tier === 'push' &&
      !entry.occurrences.some((occurrence) => occurrence.push)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['occurrences'],
        message: 'Push entries need notification timing and wording',
      });
    }
    if (
      entry.tier === 'inapp' &&
      (entry.default === 'push' ||
        entry.occurrences.some((occurrence) => occurrence.push))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['tier'],
        message: 'Only Push entries can define a notification',
      });
    }
  });

export const unshippedSunnahSchema = z.strictObject({
  id,
  status: z.enum(['future', 'excluded']),
  title: wording,
  reason: wording,
  tier: tier.optional(),
  what: z.array(wording).optional(),
  when: wording.optional(),
  evidence: z.array(id).optional(),
});

export const duaSchema = z.strictObject({
  id,
  ar: arabic,
  tr: transliteration,
  en: wording,
  evidence: z.array(id).min(1),
  source: id,
  reviewed: reviewed.optional(),
});

const grading = z.strictObject({
  by: wording,
  grade: wording,
  note: wording.optional(),
});
export const hadithSchema = z.strictObject({
  id,
  collection: id,
  number: z.union([wording, z.int().positive()]),
  url: webUrl.optional(),
  from: z.enum(['prophet', 'companion', 'successor']),
  narrator: wording.optional(),
  grading: z.array(grading),
  excerpt,
  textSource: z.strictObject({
    site: z.literal('sunnah.com'),
    ...sourceCredit,
  }),
  reviewed: reviewed.optional(),
});

const quranAyah = z.union([z.int().positive(), z.string().regex(/^\d+-\d+$/)]);
const quranReference = z.strictObject({
  id,
  surah: z.int().min(1).max(114),
  ayah: quranAyah.optional(),
  label: wording.optional(),
  url: webUrl,
  reviewed: reviewed.optional(),
});
export const quranSchema = z.union([quranReference, quranReference.extend({
  ayah: quranAyah,
  excerpt,
  textSource: z.strictObject({ site: z.literal('quran.com'), ...sourceCredit }),
})]);

const otherSourceBase = {
  id,
  title: wording,
  summary: wording,
  reviewed: reviewed.optional(),
  archive: webUrl.optional(),
  archiveCapture: z.strictObject({
    file: z.string().regex(/^[a-z][a-z0-9-]+\.json$/),
    fetched: z.iso.date(),
  }).optional(),
};
export const otherSourceSchema = z.discriminatedUnion('type', [
  z
    .strictObject({
      type: z.literal('fatwa'),
      publisher: wording,
      language: z.enum(['ar', 'en']),
      url: webUrl,
      ...otherSourceBase,
    })
    .refine(({ archive, archiveCapture }) => Boolean(archive || archiveCapture), 'A fatwa needs an archived source'),
  z
    .strictObject({
      type: z.literal('book'),
      author: wording,
      location: wording,
      url: webUrl.optional(),
      ...otherSourceBase,
    })
    .refine(
      ({ url, archive, archiveCapture }) => !url || Boolean(archive || archiveCapture),
      'A linked book needs an archived source',
    ),
]);

export const collectionsSchema = z.record(
  id,
  z.strictObject({
    name: wording,
    short: wording,
    url: wording.refine(
      (value) =>
        value.includes('{number}') && /^https:\/\/sunnah\.com\//.test(value),
      'Use a Sunnah.com URL with a {number} placeholder',
    ),
  }),
);

export const sourceCopySchema = z.strictObject({
  url: webUrl,
  ...sourceCredit,
  ar: arabic,
  en: wording,
  narrator: wording.optional(),
  grading: z.array(grading).optional(),
  references: z.record(z.string(), z.string()).optional(),
});

export type Sunnah = z.infer<typeof sunnahSchema>;
export type UnshippedSunnah = z.infer<typeof unshippedSunnahSchema>;
export type Hadith = z.infer<typeof hadithSchema>;
export type QuranEvidence = z.infer<typeof quranSchema>;
export type OtherEvidence = z.infer<typeof otherSourceSchema>;
export type Dua = z.infer<typeof duaSchema>;
export type Collections = z.infer<typeof collectionsSchema>;
export type SourceCopy = z.infer<typeof sourceCopySchema>;
export type GroupedSunnah = Sunnah & { group: ContentGroup };

export type Content = {
  version: string;
  sunnahs: GroupedSunnah[];
  duas: Dua[];
  evidence: {
    hadith: Hadith[];
    quran: QuranEvidence[];
    other: OtherEvidence[];
  };
  collections: Collections;
};
