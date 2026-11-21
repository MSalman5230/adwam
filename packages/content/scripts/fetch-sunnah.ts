import { z } from 'zod';

import { sourceCopySchema, type SourceCopy } from '../schema/index.ts';
import { writeBrowserCopies } from './import-browser-copies.ts';

const sourceDirectory = new URL('../sources/sunnah.com/', import.meta.url);
const browserCapture = z.object({
  url: z.url({ protocol: /^https$/, hostname: /^sunnah\.com$/ }),
  fetched: z.iso.date(),
  ar: z.string(),
  en: z.string(),
  translator: z.string().nullable().optional(),
  grading: z.array(z.string()).default([]),
  narrator: z.string().nullable().optional(),
  references: z.array(z.tuple([z.string(), z.string()])).default([]),
});

export function sourceCopy(capture: unknown): SourceCopy {
  const { grading, translator, narrator, ar, en, references, ...metadata } = browserCapture.parse(capture);
  return sourceCopySchema.parse({
    ...metadata,
    ar: ar.normalize('NFC'),
    en: en.normalize('NFC'),
    translator: translator?.trim() || 'English translation via Sunnah.com',
    narrator: narrator?.trim() || undefined,
    references: Object.fromEntries(references.map(([label, value]) => [label.trim(), value.replace(/^\s*:\s*/u, '').trim()])),
    grading: grading.map((value) => {
      const match = value.trim().match(/^(.+?)\s+\(([^()]+)\)$/u);
      if (!match) throw new Error(`Unrecognized source grading for ${metadata.url}`);
      return { grade: match[1], by: match[2] };
    }),
  });
}

export async function importBrowserCopies(directory: string, output = sourceDirectory): Promise<number> {
  return writeBrowserCopies(directory, output, /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.json$/, sourceCopy);
}

if (import.meta.main) {
  const directory = process.argv[2];
  if (!directory) {
    console.error('Pass the directory containing the saved Sunnah.com browser captures.');
    process.exitCode = 1;
  } else {
    try {
      console.log(`Imported ${await importBrowserCopies(directory)} Sunnah.com copies.`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
}
