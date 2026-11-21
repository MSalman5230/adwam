import type { CivilDate } from '@adwam/core';
import { z } from 'zod';

const itemRoute = z.object({
  id: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  date: z.iso.date().optional(),
});

export function readItemParams(params: { id?: string | string[]; date?: string | string[] }) {
  const result = itemRoute.safeParse(params);
  if (result.success) return { id: result.data.id, date: result.data.date as CivilDate | undefined };
}
