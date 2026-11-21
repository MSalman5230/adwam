import { sendExpoPushes, type Ticket } from '../_lib/expo-push.ts';
import { serveJob, serviceClient } from '../_lib/job-runtime.ts';
import { pushMessage, type QueuedPush } from './message.ts';

type Claim = { runId: string; claimedAt: string; messages: QueuedPush[]; skipped: number; expired: number };

serveJob('push-send', async (report) => {
  const token = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (!token) {
    report('Expo access token missing');
    throw new Error('Expo access token missing');
  }
  const db = serviceClient();
  const { data, error } = await db.rpc('server_claim_push_v1', { batch_size: 100 });
  if (error) throw new Error('Push batch claim failed');
  const claim: Claim = data;
  const outcomes: Array<Ticket & { id: string }> = [];
  const batch = claim.messages.flatMap((row) => {
    const message = pushMessage(row);
    if (message) return [{ row, message }];
    outcomes.push({ id: row.id, code: 'Ineligible' });
    return [];
  });
  const tickets = batch.length ? await sendExpoPushes(batch.map(({ message }) => message), token) : [];
  let sent = 0;
  let retried = 0;
  for (const [index, ticket] of tickets.entries()) {
    const row = batch[index].row;
    outcomes.push({ ...ticket, id: row.id });
    if (ticket.receipt_id) sent += 1;
    if (ticket.retry_seconds !== undefined && row.attempts < 5) retried += 1;
    if (ticket.code === 'DeliveryUnknown' || ticket.code === 'ExpoUnauthorized' || ticket.code === 'InvalidCredentials' ||
      ticket.code === 'MismatchSenderId') report(`Expo push ${ticket.code}`);
  }
  if (outcomes.length) {
    const stored = await db.rpc('server_store_push_tickets_v1', { claim_at: claim.claimedAt, outcomes });
    if (stored.error) throw new Error('Push tickets could not be recorded');
  }
  if (claim.expired) report('Unconfirmed push claims expired');
  const counts = { sent, retried, failed: outcomes.length - sent - retried, skipped: claim.skipped, expired: claim.expired };
  const finished = await db.from('job_runs').update({ counts, finished_at: new Date().toISOString() }).eq('id', claim.runId);
  if (finished.error) throw new Error('Push run could not be recorded');
  return counts;
});
