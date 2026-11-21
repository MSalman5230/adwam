import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { parse } from 'yaml';

import {
  collectionsSchema,
  duaSchema,
  groups,
  hadithSchema,
  otherSourceSchema,
  quranSchema,
  sourceCopySchema,
  sunnahSchema,
  unshippedSunnahSchema,
  type Content,
  type SourceCopy,
  type UnshippedSunnah,
} from '../schema/index.ts';

export const contentRoot = new URL('../', import.meta.url);
type Site = 'sunnah.com' | 'quran.com';
type ReadCopy = (site: Site, id: string) => Promise<SourceCopy | undefined>;
export type RepositoryContent = Content & { unshipped: UnshippedSunnah[] };

async function optionalFile(url: URL): Promise<string | undefined> {
  try {
    const input = await readFile(url, 'utf8');
    if (input.includes('\ufffd') || input !== input.normalize('NFC')) {
      throw new Error(`${url.pathname} must be valid UTF-8 in NFC`);
    }
    return input;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function yamlFile<T>(
  root: URL,
  path: string,
  schema: z.ZodType<T>,
  empty: T,
): Promise<T> {
  const contents = await optionalFile(new URL(path, root));
  if (contents === undefined) return empty;
  const result = schema.safeParse(parse(contents, { uniqueKeys: true }));
  if (!result.success)
    throw new Error(`${path}\n${z.prettifyError(result.error)}`);
  return result.data;
}

export async function loadContent(
  root = contentRoot,
): Promise<RepositoryContent> {
  const pkg = JSON.parse(
    await readFile(new URL('package.json', root), 'utf8'),
  ) as { version: string };
  const version = pkg.version
    .split('.')
    .map((part) => part.padStart(2, '0'))
    .join('.');
  if (!z.iso.date().safeParse(version.replaceAll('.', '-')).success) {
    throw new Error(
      'The content package version must describe a calendar date',
    );
  }

  const [lists, future, excluded, duas, hadith, quran, other, collections] =
    await Promise.all([
      Promise.all(
        groups.map(async (group) => {
          const rows = await yamlFile(
            root,
            `sunnah/${group}.yaml`,
            z.array(sunnahSchema),
            [],
          );
          return rows.map((row) => ({ ...row, group }));
        }),
      ),
      yamlFile(root, 'sunnah/future.yaml', z.array(unshippedSunnahSchema), []),
      yamlFile(
        root,
        'sunnah/excluded.yaml',
        z.array(unshippedSunnahSchema),
        [],
      ),
      yamlFile(root, 'duas.yaml', z.array(duaSchema), []),
      yamlFile(root, 'evidence/hadith.yaml', z.array(hadithSchema), []),
      yamlFile(root, 'evidence/quran.yaml', z.array(quranSchema), []),
      yamlFile(root, 'evidence/other.yaml', z.array(otherSourceSchema), []),
      yamlFile(root, 'collections.yaml', collectionsSchema, {}),
    ]);

  for (const [expected, rows] of [
    ['future', future],
    ['excluded', excluded],
  ] as const) {
    if (rows.some((row) => row.status !== expected)) {
      throw new Error(
        `sunnah/${expected}.yaml must contain only ${expected} entries`,
      );
    }
  }
  return {
    version,
    sunnahs: lists.flat(),
    duas,
    evidence: { hadith, quran, other },
    collections,
    unshipped: [...future, ...excluded],
  };
}

export async function readSourceCopy(
  site: Site,
  id: string,
  root = contentRoot,
): Promise<SourceCopy | undefined> {
  const file = await optionalFile(new URL(`sources/${site}/${id}.json`, root));
  return file === undefined
    ? undefined
    : sourceCopySchema.parse(JSON.parse(file));
}

function duplicateIds(rows: { id: string }[], kind: string, errors: string[]) {
  const ids = new Set<string>();
  for (const { id } of rows) {
    if (ids.has(id)) errors.push(`Duplicate ${kind} ID: ${id}`);
    ids.add(id);
  }
  return ids;
}

function checkProse(value: string, id: string, errors: string[]) {
  const apostrophes = value.match(/[\p{L}\p{M}]+['‘’][\p{L}\p{M}]+/gu) ?? [];
  for (const word of apostrophes) {
    if (/['’]s$/i.test(word)) continue;
    if (
      /[ʿʾāīūḥṣḍṭẓ]/i.test(word) ||
      /^(qur['‘’]an|du['‘’]a|sha['‘’]ban|jumu['‘’]ah)$/i.test(word)
    ) {
      errors.push(`${id}: use modifier letters for ayn and hamzah in ${word}`);
    }
  }
  if (/(?<! )\uFDFA/u.test(value))
    errors.push(`${id}: the salutation needs a preceding space`);
}

function matchCopy(
  label: string,
  quote: { ar: string; en: string },
  copy: SourceCopy,
  errors: string[],
  whole = false,
) {
  for (const field of ['ar', 'en'] as const) {
    const source = copy[field].normalize('NFC');
    const excerpt = quote[field].normalize('NFC');
    if (whole ? source !== excerpt : !source.includes(excerpt)) {
      errors.push(`${label}: ${field} must match the stored source`);
    }
  }
}

export async function validateContent(
  data: RepositoryContent,
  copy: ReadCopy,
  release = false,
): Promise<string[]> {
  const errors: string[] = [];
  const { sunnahs, unshipped, duas, evidence, collections } = data;
  const sources = [...evidence.hadith, ...evidence.quran, ...evidence.other];
  const evidenceIds = duplicateIds(sources, 'evidence', errors);
  const duaIds = duplicateIds(duas, 'duʿāʾ', errors);
  duplicateIds([...sunnahs, ...unshipped], 'Sunnah', errors);

  const hadithIds = new Set(evidence.hadith.map(({ id }) => id));
  const copyCache = new Map<string, Promise<SourceCopy | undefined>>();
  const stored = (site: Site, id: string) => {
    const key = `${site}/${id}`;
    let found = copyCache.get(key);
    if (!found) {
      found = copy(site, id);
      copyCache.set(key, found);
    }
    return found;
  };

  const requireReferences = (
    id: string,
    references: string[],
    allowed: Set<string>,
    kind: string,
  ) => {
    for (const ref of references) {
      if (!allowed.has(ref)) errors.push(`${id}: unknown ${kind} ID ${ref}`);
    }
  };

  if (release && !sunnahs.some((entry) => entry.status === 'published')) {
    errors.push('Release content needs at least one published entry');
  }
  for (const entry of sunnahs) {
    if (release && entry.status !== 'published' && entry.status !== 'retired') {
      errors.push(`${entry.id}: release content must be published`);
    }
    if (
      entry.group === 'disputed' &&
      (entry.tier !== 'inapp' || entry.default !== 'off')
    ) {
      errors.push(
        `${entry.id}: disputed entries must be in-app only and default to Off`,
      );
    }
    requireReferences(entry.id, entry.evidence, evidenceIds, 'evidence');
    requireReferences(entry.id, entry.duas, duaIds, 'duʿāʾ');
    const prose = [
      entry.title,
      entry.short,
      entry.when,
      entry.pushNote,
      ...entry.what,
      ...(entry.notes ?? []),
    ];
    const keys = new Set<string>();
    for (const occurrence of entry.occurrences) {
      const key = occurrence.key ?? '';
      if (keys.has(key))
        errors.push(
          `${entry.id}: duplicate occurrence key ${key || '(default)'}`,
        );
      keys.add(key);
      if (occurrence.inlineDua) {
        requireReferences(entry.id, [occurrence.inlineDua], duaIds, 'duʿāʾ');
        if (!entry.duas.includes(occurrence.inlineDua)) {
          errors.push(
            `${entry.id}: inline duʿāʾ must be in the entry's duʿāʾ list`,
          );
        }
      }
      prose.push(
        occurrence.title,
        occurrence.short,
        occurrence.upcomingGroup?.title,
        occurrence.banner?.title,
        occurrence.banner?.body,
        occurrence.fast?.also,
        occurrence.push?.title,
        occurrence.push?.body,
        occurrence.push?.combined?.title,
        occurrence.push?.combined?.body,
      );
    }
    for (const value of prose) if (value) checkProse(value, entry.id, errors);
  }

  for (const entry of unshipped) {
    requireReferences(entry.id, entry.evidence ?? [], evidenceIds, 'evidence');
    for (const value of [
      entry.title,
      entry.reason,
      entry.when,
      ...(entry.what ?? []),
    ]) {
      if (value) checkProse(value, entry.id, errors);
    }
  }

  for (const entry of evidence.hadith) {
    if (!Object.hasOwn(collections, entry.collection)) {
      errors.push(`${entry.id}: unknown hadith collection ${entry.collection}`);
    }
  }
  for (const entry of [...evidence.hadith, ...evidence.quran]) {
    if (!('excerpt' in entry)) continue;
    const saved = await stored(entry.textSource.site, entry.id);
    if (!saved) {
      errors.push(
        `${entry.id}: missing stored ${entry.textSource.site} source`,
      );
      continue;
    }
    matchCopy(
      entry.id,
      entry.excerpt,
      saved,
      errors,
      entry.excerpt.partial !== true,
    );
    if (
      saved.fetched !== entry.textSource.fetched ||
      saved.translator !== entry.textSource.translator
    ) {
      errors.push(
        `${entry.id}: source date and translation credit must match the stored copy`,
      );
    }
  }

  for (const dua of duas) {
    requireReferences(dua.id, dua.evidence, evidenceIds, 'evidence');
    requireReferences(dua.id, [dua.source], hadithIds, 'hadith');
    if (!dua.evidence.includes(dua.source))
      errors.push(`${dua.id}: source must be listed as evidence`);
    const saved = await stored('sunnah.com', dua.source);
    if (saved) matchCopy(dua.id, dua, saved, errors);
    else errors.push(`${dua.id}: missing stored source ${dua.source}`);
  }

  if (release) {
    const live = sunnahs.filter((entry) => entry.status === 'published');
    const usedDuas = duas.filter((dua) =>
      live.some((entry) => entry.duas.includes(dua.id)),
    );
    const usedSources = new Set(
      [...live, ...usedDuas].flatMap((entry) => entry.evidence),
    );
    for (const item of [
      ...usedDuas,
      ...sources.filter((item) => usedSources.has(item.id)),
    ]) {
      if (!item.reviewed)
        errors.push(`${item.id}: release evidence needs a reviewer and date`);
    }
  }
  return errors;
}

export async function checkedContent(
  release = false,
): Promise<RepositoryContent> {
  const content = await loadContent();
  const errors = await validateContent(content, readSourceCopy, release);
  if (errors.length) throw new Error(errors.join('\n'));
  return content;
}

if (import.meta.main) {
  try {
    const content = await checkedContent(process.argv.includes('--release'));
    console.log(
      `Content validated (${content.sunnahs.length} entries, version ${content.version}).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
