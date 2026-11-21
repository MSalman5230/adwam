import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

import { sourceCopySchema, type SourceCopy } from '../schema/index.ts';
import { writeBrowserCopies } from './import-browser-copies.ts';

const browserCapture = z.object({
  url: z.url({ protocol: /^https$/, hostname: /^quran\.com$/ }),
  fetched: z.iso.date(),
  surah: z.int().min(1).max(114),
  ayah: z.int().positive(),
  ar: z.string(),
  en: z.string(),
  credit: z.array(z.string()).optional(),
});

export function quranSourceCopy(capture: unknown, name: string): SourceCopy {
  const { url, fetched, surah, ayah, ar, en, credit } = browserCapture.parse(capture);
  if (name !== `quran-${surah}-${ayah}.json` || new URL(url).pathname.replace(/\/$/, '') !== `/${surah}/${ayah}`) {
    throw new Error(`Verse reference does not match ${name}`);
  }
  return sourceCopySchema.parse({
    url, fetched, ar: ar.normalize('NFC'), en: en.normalize('NFC'),
    translator: credit?.map((line) => line.replace(/^\s*-\s*/u, '').trim()).filter(Boolean).join(', ')
      || 'English translation via Quran.com',
  });
}

if (import.meta.main) {
  const [directory, output] = process.argv.slice(2);
  if (!directory || !output) {
    console.error('Pass the saved Quran.com browser capture directory and a private output directory.');
    process.exitCode = 1;
  } else {
    try {
      const count = await writeBrowserCopies(directory, pathToFileURL(resolve(output) + sep), /^quran-\d+-\d+\.json$/, quranSourceCopy);
      console.log(`Imported ${count} Quran.com browser copies.`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
}
