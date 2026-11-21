import type { GroupedSunnah } from '@adwam/content/schema';

export function contentProblemUrl(entry: Pick<GroupedSunnah, 'title' | 'id' | 'group'>, contentVersion: string, appVersion: string, description: string) {
  const fields = {
    template: 'content-problem.yml',
    item: entry.title,
    'item-id': `${entry.group}.${entry.id}`,
    'content-version': contentVersion,
    'app-version': appVersion,
    description,
  };
  const query = Object.entries(fields).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `https://github.com/MSalman5230/adwam/issues/new?${query}`;
}
