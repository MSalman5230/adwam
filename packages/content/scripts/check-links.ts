import { readdir, readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { parse } from 'yaml';

type SourceRow = {
  url?: string;
  archive?: string;
  collection?: string;
  number?: string | number;
};

type Collections = Record<string, { url: string }>;

export type LinkResult =
  | { url: string; result: 'ok' | 'broken' | 'unverified'; status: number }
  | { url: string; result: 'unverified'; reason: string };

export function evidenceLinks(
  rows: SourceRow[],
  collections: Collections,
): string[] {
  const urls = new Set<string>();
  for (const row of rows) {
    const template = row.collection && collections[row.collection]?.url;
    const location =
      row.url ?? (template && template.replace('{number}', String(row.number)));
    for (const link of [location, row.archive]) {
      if (link) urls.add(link);
    }
  }
  return [...urls].sort();
}

export async function checkLink(
  url: string,
  request: typeof fetch = fetch,
): Promise<LinkResult> {
  try {
    const response = await request(url, {
      headers: { 'User-Agent': 'Adwam link check' },
      signal: AbortSignal.timeout(20_000),
    });
    await response.body?.cancel();
    const result = response.ok
      ? 'ok'
      : response.status === 404 || response.status === 410
        ? 'broken'
        : 'unverified';
    return { url, result, status: response.status };
  } catch (error) {
    return {
      url,
      result: 'unverified',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function loadLinks(): Promise<string[]> {
  const directory = new URL('../evidence/', import.meta.url);
  let files: string[];
  try {
    files = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const documents = await Promise.all(
    files
      .filter((file) => file.endsWith('.yaml'))
      .map(async (file) => {
        const rows: unknown = parse(
          await readFile(new URL(file, directory), 'utf8'),
        );
        if (!Array.isArray(rows))
          throw new Error(`${file} must contain a list of evidence entries`);
        return rows as SourceRow[];
      }),
  );

  let collections: Collections = {};
  if (documents.flat().some((row) => row.collection && !row.url)) {
    collections = parse(
      await readFile(new URL('../collections.yaml', import.meta.url), 'utf8'),
    ) as Collections;
  }
  return evidenceLinks(documents.flat(), collections);
}

async function main() {
  const urls = await loadLinks();
  const results: LinkResult[] = [];
  for (const url of urls) {
    if (results.length) await setTimeout(1_500);
    results.push(await checkLink(url));
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(results));
    return;
  }

  for (const item of results) {
    if (item.result !== 'ok') {
      console.log(
        `${item.result}: ${item.url} (${'status' in item ? item.status : item.reason})`,
      );
    }
  }
  console.log(`Checked ${results.length} source links.`);
  if (results.some((item) => item.result === 'broken')) process.exitCode = 1;
}

if (import.meta.main) await main();
