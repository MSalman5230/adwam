import { expoError, postExpo } from '../_lib/expo-push.ts';
import { serveJob, serviceClient } from '../_lib/job-runtime.ts';

type Claim = { runId: string; receipts: Array<{ id: string; receiptId: string }>; expired: number; removed: number };

serveJob('push-receipts', async (report) => {
  const token = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (!token) {
    report('Expo access token missing');
    throw new Error('Expo access token missing');
  }
  const db = serviceClient();
  const { data, error } = await db.rpc('server_claim_push_receipts_v1', { batch_size: 1000 });
  if (error) throw new Error('Push receipt claim failed');
  const claim: Claim = data;
  const counts = { checked: 0, failed: 0, removed: claim.removed, expired: claim.expired };
  if (claim.receipts.length) {
    const response = await postExpo('getReceipts', token, { ids: claim.receipts.map((row) => row.receiptId) });
    if (!response.ok) {
      report('Expo receipt lookup failed');
      throw new Error('Expo receipt lookup failed');
    }
    const payload = await response.json();
    if (!payload?.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
      report('Expo receipt lookup returned no data');
      throw new Error('Expo receipt lookup returned no data');
    }
    const results = claim.receipts.flatMap<{ id: string; receipt_id: string; code: string | null }>(({ id, receiptId }) => {
      const receipt = payload.data[receiptId];
      if (receipt?.status === 'ok') return [{ id, receipt_id: receiptId, code: null }];
      if (receipt?.status !== 'error') return [];
      const code = expoError(receipt.details?.error);
      if (code === 'InvalidCredentials' || code === 'MismatchSenderId') report(`Expo receipt ${code}`);
      return [{ id, receipt_id: receiptId, code }];
    });
    if (results.length) {
      const stored = await db.rpc('server_store_push_receipts_v1', { results });
      if (stored.error) throw new Error('Push receipts could not be recorded');
      counts.checked = stored.data.checked;
      counts.failed = stored.data.failed;
      counts.removed += stored.data.removed;
    }
  }
  const finished = await db.from('job_runs').update({ counts, finished_at: new Date().toISOString() }).eq('id', claim.runId);
  if (finished.error) throw new Error('Push receipt run could not be recorded');
  return counts;
});
