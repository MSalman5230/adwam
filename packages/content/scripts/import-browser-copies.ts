import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { SourceCopy } from '../schema/index.ts';

export async function writeBrowserCopies(
  directory: string,
  output: URL,
  names: RegExp,
  normalize: (capture: unknown, name: string) => SourceCopy,
): Promise<number> {
  const files = (await readdir(directory)).filter((name) => names.test(name)).sort();
  if (!files.length) throw new Error('The browser capture directory contains no matching JSON records');
  const entries = await Promise.all(files.map(async (name) => ({
    name, value: normalize(JSON.parse(await readFile(join(directory, name), 'utf8')), name),
  })));
  await mkdir(output, { recursive: true });
  for (const { name, value } of entries) {
    await writeFile(new URL(name, output), `${JSON.stringify(value, null, 2)}\n`);
  }
  return entries.length;
}
