alter table public.push_outbox add column attempt_push_token text;
create index push_outbox_sending_idx on public.push_outbox (claimed_at) where status = 'sending';

create function public.server_claim_push_v1(batch_size integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  instant timestamptz := clock_timestamp();
  run_id bigint;
  expired integer;
  messages jsonb;
  skipped integer;
begin
  if batch_size is null or batch_size not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Invalid push batch size';
  end if;

  -- A worker that disappeared might have sent its batch before saving the tickets.
  update public.push_outbox set status = 'failed', error_code = 'DeliveryUnknown'
  where status = 'sending' and claimed_at < instant - interval '5 minutes';
  get diagnostics expired = row_count;

  with due as materialized (
    select outbox.id, outbox.channel, install.push_token, install.hijri_method, install.hijri_shift,
      event.kind as weather_kind, event.ends_at as weather_end, correction.id as correction_id,
      correction.country_code, correction.hijri_year, correction.hijri_month, correction.starts_on,
      install.notifications_allowed and install.push_token is not null and (
        (event.id is not null and config.weather_enabled and event.forecast_current and event.ends_at > instant
          and event.area_id = install.area_id and install.weather_choices ->> event.kind = 'push'
          and (event.debug_install_id is null or event.debug_install_id = install.id)
          and not adwam_private.quiet_at(instant, install.time_zone, install.quiet_start, install.quiet_end))
        or (correction.status = 'published' and correction.country_code = install.country_code)
      ) is true as eligible,
      case when correction.id is not null and adwam_private.quiet_at(
        instant, install.time_zone, install.quiet_start, install.quiet_end
      ) then 'corrections-silent' else outbox.channel end as delivery_channel
    from public.push_outbox as outbox
    join public.installs as install on install.id = outbox.install_id
    join public.app_config as config on config.singleton
    left join public.weather_events as event on event.id = outbox.weather_event_id
    left join public.hijri_corrections as correction on correction.id = outbox.correction_id
    where outbox.status = 'queued' and outbox.scheduled_at <= instant
    order by outbox.scheduled_at, outbox.id limit batch_size
    for update of outbox skip locked
  ), claimed as (
    update public.push_outbox as outbox set
      status = case when due.eligible then 'sending' else 'failed' end,
      error_code = case when due.eligible then null else 'Ineligible' end,
      attempts = outbox.attempts + due.eligible::integer,
      attempt_push_token = case when due.eligible then due.push_token else null end,
      claimed_at = case when due.eligible then instant else null end
    from due where outbox.id = due.id
    returning due.*, outbox.attempts
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id::text, 'token', push_token, 'channel', delivery_channel, 'attempts', attempts,
    'weather', weather_kind, 'weatherEnd', weather_end, 'correctionId', correction_id,
    'country', country_code, 'year', hijri_year, 'month', hijri_month, 'announced', starts_on,
    'method', hijri_method, 'shift', hijri_shift
  ) order by id) filter (where eligible), '[]'::jsonb), count(*) filter (where not eligible)
  into messages, skipped from claimed;

  insert into public.job_runs (job, started_at) values ('push-send', instant) returning id into run_id;
  return jsonb_build_object('runId', run_id::text, 'claimedAt', instant, 'messages', messages,
    'skipped', skipped, 'expired', expired);
end;
$$;

create function public.server_store_push_tickets_v1(claim_at timestamptz, outcomes jsonb)
returns integer
language sql
security definer
set search_path = ''
as $$
  with changed as (
    update public.push_outbox as outbox set
      status = case when ticket.receipt_id is not null then 'sent'
        when ticket.retry_seconds is not null and outbox.attempts < 5 then 'queued' else 'failed' end,
      scheduled_at = case when ticket.retry_seconds is not null and outbox.attempts < 5 then
        statement_timestamp() + greatest(ticket.retry_seconds, 60 * (1 << (outbox.attempts - 1))) * interval '1 second'
        else outbox.scheduled_at end,
      sent_at = case when ticket.receipt_id is not null then statement_timestamp() end,
      expo_receipt_id = ticket.receipt_id,
      error_code = ticket.code
    from jsonb_to_recordset(outcomes) as ticket(id bigint, receipt_id text, code text, retry_seconds integer)
    where outbox.id = ticket.id and outbox.status = 'sending' and outbox.claimed_at = claim_at
    returning 1
  ) select count(*)::integer from changed;
$$;

revoke all on function public.server_claim_push_v1(integer), public.server_store_push_tickets_v1(timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.server_claim_push_v1(integer), public.server_store_push_tickets_v1(timestamptz, jsonb)
  to service_role;
