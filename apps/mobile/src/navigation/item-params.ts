import type { CivilDate } from '@adwam/core';
import { z } from 'zod';

const itemRoute = z.object({
  id: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  date: z.iso.date().optional(),
  occurrenceKey: z.string().min(1).max(240).optional(),
});

export function readItemParams(params: { id?: string | string[]; date?: string | string[]; occurrenceKey?: string | string[] }) {
  const result = itemRoute.safeParse(params);
  if (result.success) {
    const { id, date, occurrenceKey } = result.data;
    return { id, date: date as CivilDate | undefined, ...(occurrenceKey && { occurrenceKey }) };
  }
}
