alter table public.push_outbox add column receipt_check_after timestamptz;
create index push_outbox_invalid_token_idx on public.push_outbox (id)
  where error_code = 'DeviceNotRegistered' and expo_receipt_id is null and receipt_checked_at is null;

create function public.server_claim_push_receipts_v1(batch_size integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  instant timestamptz := clock_timestamp();
  run_id bigint;
  expired integer;
  removed integer;
  receipts jsonb;
  invalid jsonb;
begin
  if batch_size is null or batch_size not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'Invalid push receipt batch size';
  end if;

  with invalid_tickets as materialized (
    select id from public.push_outbox where status = 'failed' and error_code = 'DeviceNotRegistered'
      and expo_receipt_id is null and receipt_checked_at is null
    order by id limit batch_size for update skip locked
  ), checked as (
    update public.push_outbox as outbox set receipt_checked_at = instant
    from invalid_tickets where outbox.id = invalid_tickets.id
    returning outbox.install_id, outbox.attempt_push_token
  )
  select coalesce(jsonb_agg(to_jsonb(checked)), '[]'::jsonb) into invalid from checked;

  delete from public.installs as install
  using jsonb_to_recordset(invalid) as token(install_id uuid, attempt_push_token text)
  where install.id = token.install_id and install.push_token = token.attempt_push_token;
  get diagnostics removed = row_count;

  update public.push_outbox set status = 'failed', error_code = 'ReceiptExpired', receipt_checked_at = instant
  where status = 'sent' and expo_receipt_id is not null and receipt_checked_at is null
    and sent_at <= instant - interval '24 hours';
  get diagnostics expired = row_count;

  with due as materialized (
    select id from public.push_outbox where status = 'sent' and expo_receipt_id is not null
      and receipt_checked_at is null and sent_at <= instant - interval '15 minutes'
      and (receipt_check_after is null or receipt_check_after <= instant)
    order by sent_at, id limit batch_size for update skip locked
  ), claimed as (
    update public.push_outbox as outbox set receipt_check_after = instant + interval '5 minutes'
    from due where outbox.id = due.id
    returning outbox.id, outbox.expo_receipt_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id::text, 'receiptId', expo_receipt_id)), '[]'::jsonb)
  into receipts from claimed;

  insert into public.job_runs (job, started_at) values ('push-receipts', instant) returning id into run_id;
  return jsonb_build_object('runId', run_id::text, 'receipts', receipts, 'expired', expired, 'removed', removed);
end;
$$;

create function public.server_store_push_receipts_v1(results jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  checked_count integer;
  failed_count integer;
  removed_count integer;
  invalid jsonb;
begin
  with checked as (
    update public.push_outbox as outbox set
      status = case when result.code is null then 'sent' else 'failed' end,
      error_code = result.code, receipt_checked_at = statement_timestamp()
    from jsonb_to_recordset(results) as result(id bigint, receipt_id text, code text)
    where outbox.id = result.id and outbox.expo_receipt_id = result.receipt_id and outbox.receipt_checked_at is null
      and outbox.status = 'sent'
    returning outbox.install_id, outbox.attempt_push_token, outbox.error_code
  )
  select count(*), count(error_code), coalesce(jsonb_agg(to_jsonb(checked))
    filter (where error_code = 'DeviceNotRegistered'), '[]'::jsonb)
  into checked_count, failed_count, invalid from checked;

  delete from public.installs as install
  using jsonb_to_recordset(invalid) as token(install_id uuid, attempt_push_token text)
  where install.id = token.install_id and install.push_token = token.attempt_push_token;
  get diagnostics removed_count = row_count;
  return jsonb_build_object('checked', checked_count, 'failed', failed_count, 'removed', removed_count);
end;
$$;

revoke all on function public.server_claim_push_receipts_v1(integer), public.server_store_push_receipts_v1(jsonb)
  from public, anon, authenticated;
grant execute on function public.server_claim_push_receipts_v1(integer), public.server_store_push_receipts_v1(jsonb)
  to service_role;
