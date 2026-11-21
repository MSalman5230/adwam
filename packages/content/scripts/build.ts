import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';

import {
  collectionsSchema,
  duaSchema,
  hadithSchema,
  otherSourceSchema,
  quranSchema,
  sunnahSchema,
  unshippedSunnahSchema,
  type Content,
} from '../schema/index.ts';
import {
  checkedContent,
  contentRoot,
  type RepositoryContent,
} from './check.ts';

export function selectContent(
  data: RepositoryContent,
  includeReview: boolean,
): Content {
  const sunnahs = data.sunnahs.filter(
    (item) =>
      item.status === 'published' ||
      (includeReview && item.status === 'review'),
  );
  const duaIds = new Set(sunnahs.flatMap((item) => item.duas));
  const duas = data.duas.filter((item) => duaIds.has(item.id));
  const evidenceIds = new Set(
    [...sunnahs, ...duas].flatMap((item) => item.evidence),
  );
  return {
    version: data.version,
    sunnahs,
    duas,
    evidence: {
      hadith: data.evidence.hadith.filter(({ id }) => evidenceIds.has(id)),
      quran: data.evidence.quran.filter(({ id }) => evidenceIds.has(id)),
      other: data.evidence.other.filter(({ id }) => evidenceIds.has(id)),
    },
    collections: data.collections,
  };
}

const schema = z.strictObject({
  sunnahs: z.array(sunnahSchema),
  unshipped: z.array(unshippedSunnahSchema),
  duas: z.array(duaSchema),
  hadith: z.array(hadithSchema),
  quran: z.array(quranSchema),
  other: z.array(otherSourceSchema),
  collections: collectionsSchema,
});

if (import.meta.main) {
  try {
    const includeReview = process.argv.includes('--include-review');
    const data = await checkedContent(process.argv.includes('--release'));
    const content = selectContent(data, includeReview);
    const dist = new URL('dist/', contentRoot);
    const filename = process.argv.includes('--mobile') ? 'mobile-content.json' : 'content.json';
    await mkdir(dist, { recursive: true });
    await Promise.all([
      writeFile(new URL(filename, dist), JSON.stringify(content) + '\n'),
      writeFile(
        new URL('schema.json', dist),
        JSON.stringify(z.toJSONSchema(schema), null, 2) + '\n',
      ),
    ]);
    console.log(
      `Built content ${data.version} with ${content.sunnahs.length} entries.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
