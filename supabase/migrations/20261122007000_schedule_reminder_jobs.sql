create extension if not exists supabase_vault with schema vault;

create function adwam_private.call_scheduled_job(job_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  job_key text;
begin
  if job_name is null or job_name not in ('weather-tick', 'push-send', 'push-receipts', 'cleanup') then
    raise exception using errcode = '22023', message = 'Unknown scheduled job';
  end if;
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'adwam_project_url';
  select decrypted_secret into job_key from vault.decrypted_secrets where name = 'adwam_job_key';
  if project_url is null or job_key is null then return null; end if;

  return net.http_post(
    url := project_url || '/functions/v1/' || job_name,
    headers := jsonb_build_object('Authorization', 'Bearer ' || job_key, 'Content-Type', 'application/json'),
    timeout_milliseconds := 130000
  );
end;
$$;

revoke all on function adwam_private.call_scheduled_job(text) from public, anon, authenticated, service_role;

select cron.schedule('adwam-weather-tick', '*/15 * * * *', $$select adwam_private.call_scheduled_job('weather-tick')$$);
select cron.schedule('adwam-push-send', '2-57/5 * * * *', $$select adwam_private.call_scheduled_job('push-send')$$);
select cron.schedule('adwam-push-receipts', '7,37 * * * *', $$select adwam_private.call_scheduled_job('push-receipts')$$);
select cron.schedule('adwam-cleanup', '21 3 * * *', $$select adwam_private.call_scheduled_job('cleanup')$$);

create function public.server_cleanup_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  instant timestamptz := clock_timestamp();
  installs integer;
  areas integer;
  events integer;
  runs integer;
  tokens integer;
  run_id bigint;
  counts jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('adwam.cleanup', 0));

  delete from public.installs where last_seen_at < instant - interval '120 days';
  get diagnostics installs = row_count;

  delete from public.areas as area where not exists (select 1 from public.installs where area_id = area.id);
  get diagnostics areas = row_count;

  delete from public.weather_events where ends_at < instant - interval '7 days';
  get diagnostics events = row_count;

  update public.push_outbox set attempt_push_token = null
  where attempt_push_token is not null and (
    receipt_checked_at is not null or (status = 'failed' and error_code is distinct from 'DeviceNotRegistered')
  );
  get diagnostics tokens = row_count;

  delete from public.job_runs where started_at < instant - interval '30 days';
  get diagnostics runs = row_count;

  delete from cron.job_run_details as run using cron.job as job
  where run.jobid = job.jobid and starts_with(job.jobname, 'adwam-') and run.start_time < instant - interval '30 days';

  counts := jsonb_build_object('installs', installs, 'areas', areas, 'events', events, 'runs', runs, 'tokens', tokens);
  insert into public.job_runs (job, started_at, finished_at, counts)
  values ('cleanup', instant, clock_timestamp(), counts) returning id into run_id;
  return counts || jsonb_build_object('runId', run_id::text);
end;
$$;

revoke all on function public.server_cleanup_v1() from public, anon, authenticated;
grant execute on function public.server_cleanup_v1() to service_role;
