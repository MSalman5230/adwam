import { readFile, writeFile } from 'node:fs/promises';

import { type GroupedSunnah } from '../schema/index.ts';
import { checkedContent, type RepositoryContent } from './check.ts';

const calendar = new URL('../../../docs/sunnah-reminder-calendar.md', import.meta.url);

function table(first: string, timing: string, rows: string[][]) {
  const line = (cells: string[]) => `| ${cells.map((cell) => cell.replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()).join(' | ')} |`;
  return [line([first, 'Tier', 'Sunnah', timing, 'Sources']), line(Array(5).fill('---')), ...rows.map(line)].join('\n');
}

function replaceSection(document: string, key: string, body: string) {
  const start = `<!-- calendar:${key}:start -->`;
  const end = `<!-- calendar:${key}:end -->`;
  const before = document.indexOf(start);
  const after = document.indexOf(end);
  if (before === -1 || after < before || before !== document.lastIndexOf(start) || after !== document.lastIndexOf(end)) {
    throw new Error(`Expected one pair of generated calendar markers for ${key}`);
  }
  return `${document.slice(0, before)}${start}\n${body}\n${document.slice(after)}`;
}

export function generateCalendar(document: string, content: RepositoryContent) {
  const { hadith, quran, other } = content.evidence;
  const sources = new Map([
    ...hadith.map(({ id, collection, number, url }) => {
      const book = content.collections[collection];
      if (!book) throw new Error(`Missing calendar collection: ${collection}`);
      const link = url ?? book.url.replace('{number}', String(number));
      return [id, `[${book.short} ${number}](${link})`] as const;
    }),
    ...quran.map(({ id, label, surah, ayah, url }) => {
      const reference = ayah === undefined ? `${surah}` : `${surah}:${ayah}`;
      return [id, `[${label ?? `Qurʾan ${reference}`}](${url})`] as const;
    }),
    ...other.map(({ id, title, url }) => [id, url ? `[${title}](${url})` : title] as const),
  ]);
  const citations = (ids: string[] = []) => ids.map((id) => {
    const source = sources.get(id);
    if (source === undefined) throw new Error(`Missing calendar source: ${id}`);
    return source;
  }).join(', ');
  const duas = new Map(content.duas.map((dua) => [dua.id, dua]));
  const sunnahText = (item: GroupedSunnah) => {
    const readings = item.duas.map((id) => {
      const dua = duas.get(id);
      if (!dua) throw new Error(`Missing calendar duʿāʾ: ${id}`);
      return `*${dua.tr}*${/[.!?]$/u.test(dua.tr) ? '' : '.'}`;
    });
    return [...item.what, ...readings, ...(item.notes ?? [])].join(' ');
  };
  const tierLabel = (tier: 'push' | 'inapp') => tier === 'push' ? '**Push**' : 'In-app';
  const items = content.sunnahs.filter(({ status }) => status !== 'retired');
  const lineEnding = document.includes('\r\n') ? '\r\n' : '\n';
  let output = document.replaceAll('\r\n', '\n');
  for (const group of ['weekly', 'monthly', 'yearly', 'weather'] as const) {
    const event = group === 'weather';
    const rows = items.filter((item) => item.group === group).map((item) => [
      `**${item.title}**`, tierLabel(item.tier), sunnahText(item),
      [item.when, item.pushNote].filter(Boolean).join(' '), citations(item.evidence),
    ]);
    output = replaceSection(output, group, table(event ? 'Trigger' : 'Reminder', event ? 'Detection and timing' : 'Timing', rows));
  }
  const future = content.unshipped.filter(({ status }) => status === 'future').map((item) => {
    if (!item.tier || !item.what || !item.when) throw new Error(`Missing calendar details for ${item.id}`);
    return [`**${item.title}**`, tierLabel(item.tier), item.what.join(' '), item.when, citations(item.evidence)];
  });
  output = replaceSection(output, 'future', table('Trigger', 'Detection and timing', future));
  const disputed = items.filter(({ group }) => group === 'disputed').map((item) =>
    `- **${item.title}.** ${sunnahText(item)} ${citations(item.evidence)}`);
  output = replaceSection(output, 'disputed', disputed.length
    ? ['## Disputed, so off by default', '', 'If a user turns these on, show them In-app only.', '', ...disputed].join('\n')
    : '');
  return output.replaceAll('\n', lineEnding);
}

if (import.meta.main) {
  try {
    const content = await checkedContent();
    const previous = await readFile(calendar, 'utf8');
    const output = generateCalendar(previous, content);
    if (previous !== output) {
      if (process.argv.includes('--check')) {
        throw new Error('The calendar is out of date. Run pnpm --filter @adwam/content calendar.');
      }
      await writeFile(calendar, output);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
