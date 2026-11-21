import { readItemParams } from './item-params';

export function notificationRoute(link: unknown) {
  if (link === '/today') return { pathname: '/today' } as const;
  if (typeof link !== 'string') return;

  const match = /^\/item\/([a-z0-9-]+)(?:\?([^#]*))?$/.exec(link);
  if (!match) return;
  const query = new URLSearchParams(match[2]);
  const params = readItemParams({
    id: match[1], date: query.get('date') ?? undefined, occurrenceKey: query.get('occurrenceKey') ?? undefined,
  });
  if (params) return { pathname: '/item/[id]', params } as const;
}
