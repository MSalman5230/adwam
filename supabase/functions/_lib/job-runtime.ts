import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/deno';

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase service credentials are missing');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function authorized(request: Request) {
  const secret = Deno.env.get('ADWAM_JOB_KEY');
  const received = request.headers.get('Authorization');
  if (!secret || !received) return false;
  const encoder = new TextEncoder();
  const expected = encoder.encode(`Bearer ${secret}`);
  const actual = encoder.encode(received);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function serveJob(job: string, handler: (report: (operation: string) => void) => Promise<unknown>) {
  const dsn = Deno.env.get('SENTRY_DSN');
  if (dsn) Sentry.init({ dsn, defaultIntegrations: false, sendDefaultPii: false });
  Deno.serve(async (request) => {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (!authorized(request)) return new Response(null, { status: 401 });
    const errors = new Set<string>();
    try {
      return Response.json(await handler((operation) => { errors.add(operation); }));
    } catch {
      errors.add('job failed');
      return Response.json({ error: 'Job failed' }, { status: 500 });
    } finally {
      for (const operation of errors) {
        // Only static operation names reach logs or Sentry.
        console.error(`${job}: ${operation}`);
        if (dsn) Sentry.captureException(new Error(`${job}: ${operation}`));
      }
      if (dsn && errors.size) await Sentry.flush(2000);
    }
  });
}
