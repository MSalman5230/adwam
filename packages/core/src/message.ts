export type MessageParams = Readonly<Record<string, string | number | boolean>>;

export type Msg = Readonly<{
  key: string;
  params?: MessageParams;
}>;

export function msg(key: string, params?: MessageParams): Msg {
  return params ? { key, params } : { key };
}
