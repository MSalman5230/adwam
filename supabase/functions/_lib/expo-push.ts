export type PushMessage = {
  to: string;
  title: string;
  body: string;
  channelId: 'weather' | 'corrections' | 'corrections-silent';
  priority: 'high';
  sound: 'default' | null;
  expiration?: number;
  data: { link: string };
};

export type Ticket = { receipt_id?: string; code?: string; retry_seconds?: number };

const reportedCodes = new Set([
  'DeviceNotRegistered', 'MessageTooBig', 'MessageRateExceeded', 'InvalidCredentials', 'MismatchSenderId',
]);

export function expoError(value: unknown) {
  return typeof value === 'string' && reportedCodes.has(value) ? value : 'ExpoRejected';
}

export function postExpo(path: 'send' | 'getReceipts', token: string, data: unknown, request = fetch) {
  return request(`https://exp.host/--/api/v2/push/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(12000),
  });
}

function retryAfter(response: Response, now: number) {
  const header = response.headers.get('Retry-After');
  if (!header) return 0;
  const seconds = /^\d+$/.test(header) ? Number(header) : Math.ceil((Date.parse(header) - now) / 1000);
  return Number.isSafeInteger(seconds) ? Math.min(86400, Math.max(0, seconds)) : 0;
}

function ticket(data: { status?: unknown; id?: unknown; details?: { error?: unknown } } | null): Ticket {
  if (data?.status === 'ok' && typeof data.id === 'string' && /^[a-z0-9-]{1,100}$/i.test(data.id)) {
    return { receipt_id: data.id };
  }
  if (data?.status !== 'error') return { code: 'DeliveryUnknown' };
  const code = expoError(data.details?.error);
  return code === 'MessageRateExceeded' ? { code, retry_seconds: 0 } : { code };
}

export async function sendExpoPushes(messages: readonly PushMessage[], token: string, request = fetch): Promise<Ticket[]> {
  const uniform = (value: Ticket) => messages.map(() => value);
  try {
    const response = await postExpo('send', token, messages, request);
    if (response.status === 429) return uniform({ code: 'ExpoBusy', retry_seconds: retryAfter(response, Date.now()) });
    const data = await response.json().catch(() => null);
    if (response.ok && Array.isArray(data?.data) && data.data.length === messages.length) {
      return data.data.map(ticket);
    }
    // Expo's structured request-level errors reject the entire batch. A timeout
    // or a proxy error can lose the response after Expo accepted the messages.
    if (response.status >= 500 && Array.isArray(data?.errors) && data.errors.length && !data.data) {
      return uniform({ code: 'ExpoBusy', retry_seconds: retryAfter(response, Date.now()) });
    }
    if (response.status >= 400 && response.status < 500) {
      return uniform({ code: response.status === 401 || response.status === 403 ? 'ExpoUnauthorized' : 'ExpoRejected' });
    }
  } catch {
    // Delivery is ambiguous after losing the response. Do not send again.
  }
  return uniform({ code: 'DeliveryUnknown' });
}
