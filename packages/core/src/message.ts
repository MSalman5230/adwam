import type english from '@adwam/content/messages/en.json';

type WithoutPluralSuffix<Key extends string> = Key extends `${infer Base}_${'one' | 'other'}` ? Base : Key;
type MessageKeys<Dictionary> = {
  [Key in keyof Dictionary & string]: Dictionary[Key] extends string
    ? WithoutPluralSuffix<Key>
    : `${Key}.${MessageKeys<Dictionary[Key]>}`;
}[keyof Dictionary & string];

export type MessageKey = MessageKeys<typeof english>;
export type MessageParams = Readonly<Record<string, string | number | boolean | Msg>>;

export type Msg = Readonly<{
  key: MessageKey;
  params?: MessageParams;
}>;

export function msg(key: MessageKey, params?: MessageParams): Msg {
  return params ? { key, params } : { key };
}
