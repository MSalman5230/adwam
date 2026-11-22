import { corsHeaders } from '@supabase/supabase-js/cors';
import { errorReporter, serviceClient, triggerPushSender } from '../_lib/job-runtime.ts';
import { dayDiff, hijriMonthStart } from '../_shared/core.mjs';

const cors = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const report = errorReporter('publish-correction');
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: cors });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const token = /^Bearer (\S+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return json({ error: 'Sign-in required' }, 401);
  try {
    const db = serviceClient();
    const auth = await db.auth.getUser(token);
    if (auth.error || !auth.data.user) return json({ error: 'Sign-in required' }, 401);
    const caller = auth.data.user;
    if (caller.is_anonymous) return json({ error: 'Correction admin required' }, 403);
    const admin = await db.from('admins').select('id').eq('id', caller.id).maybeSingle();
    if (admin.error) throw new Error('Admin lookup failed');
    if (!admin.data) return json({ error: 'Correction admin required' }, 403);

    const input = await request.json().catch(() => null);
    if (!input || typeof input.correctionId !== 'string' || !uuid.test(input.correctionId) ||
      (input.confirmUnusualDate !== undefined && typeof input.confirmUnusualDate !== 'boolean')) {
      return json({ error: 'Invalid correction request' }, 400);
    }
    const draft = await db.from('hijri_corrections').select('country_code,hijri_year,hijri_month,starts_on,status')
      .eq('id', input.correctionId).maybeSingle();
    if (draft.error) throw new Error('Draft lookup failed');
    if (!draft.data || draft.data.status === 'withdrawn') return json({ error: 'Correction must be a draft' }, 404);
    const { country_code: country, hijri_year: year, hijri_month: month, starts_on: announced, status } = draft.data;
    const umalquraStart = hijriMonthStart(year, month, { method: 'umalqura' });
    const civilStart = hijriMonthStart(year, month, { method: 'civil' });
    if (![announced, umalquraStart, civilStart].every((value) => date.test(value))) {
      return json({ error: 'Correction date is out of range' }, 400);
    }
    const differenceDays = Math.abs(dayDiff(announced, umalquraStart));
    if (status === 'draft' && differenceDays > 2 && input.confirmUnusualDate !== true) {
      return json({ confirmationRequired: true, umalquraStart, differenceDays });
    }
    const published = await db.rpc('server_publish_correction_v1', {
      correction_id: input.correctionId, requester_id: caller.id, expected_country: country,
      expected_year: year, expected_month: month, expected_date: announced,
      umalqura_start: umalquraStart, civil_start: civilStart,
    });
    if (published.error?.code === '42501') return json({ error: 'Correction admin required' }, 403);
    if (published.error?.code === '40001' || published.error?.code === '22023') {
      return json({ error: 'The correction changed. Review it again.' }, 409);
    }
    if (published.error) throw new Error('Correction storage failed');
    if (published.data.queued && !await triggerPushSender()) await report(['push dispatch deferred']);
    return json({ ...published.data, umalquraStart, differenceDays });
  } catch {
    await report(['publication failed']);
    return json({ error: 'Correction could not be published' }, 500);
  }
});
