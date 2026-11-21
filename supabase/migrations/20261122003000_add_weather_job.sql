alter table public.weather_events add column forecast_current boolean not null default true;
create index weather_events_due_idx on public.weather_events (push_at, area_id)
  where forecast_current and debug_install_id is null and push_at is not null;

alter table public.push_outbox add column weather_local_day date;
create unique index push_outbox_weather_day_idx on public.push_outbox (install_id, weather_local_day)
  where weather_local_day is not null;

create or replace function public.my_weather_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := adwam_private.require_anonymous_install();
begin
  return (
    select coalesce(jsonb_agg(adwam_private.weather_payload(event) order by event.starts_at, event.id), '[]'::jsonb)
    from public.installs as install
    join public.weather_events as event on event.area_id = install.area_id
    join public.app_config as config on config.singleton and config.weather_enabled
    where install.id = caller and event.forecast_current and event.ends_at > now()
      and (event.debug_install_id is null or event.debug_install_id = caller)
  );
end;
$$;

create function public.server_claim_weather_v1(batch_size integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  config public.app_config%rowtype;
  instant timestamptz;
  utc_day timestamptz;
  forecast_units integer;
  used bigint;
  claimed jsonb;
  run_id bigint;
begin
  if batch_size is null or batch_size not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Invalid weather batch size';
  end if;

  -- Serialize reservations so overlapping invocations share the same daily allowance.
  perform pg_advisory_xact_lock(hashtextextended('adwam.weather-budget', 0));
  instant := clock_timestamp();
  utc_day := date_trunc('day', instant, 'UTC');
  select * into strict config from public.app_config where singleton;
  -- The forecast uses fewer than ten variables. Round periods longer than two weeks up.
  forecast_units := ceil((least(config.dry_days, 91) * 24 + 11) / 336.0);
  select coalesce(sum(open_meteo_calls), 0) into used from public.job_runs
  where job = 'weather-tick' and started_at >= utc_day;

  with due as (
    select area.id from public.areas as area
    where config.weather_enabled and area.next_fetch_at <= instant
      and exists (select 1 from public.installs where area_id = area.id)
    order by area.next_fetch_at, area.id
    limit least(batch_size::bigint, greatest(0, config.open_meteo_daily_budget - used) / forecast_units)
    for update of area skip locked
  ), leased as (
    update public.areas as area set next_fetch_at = instant + interval '15 minutes'
    from due where area.id = due.id
    returning area.id, area.latitude, area.longitude, area.next_fetch_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'latitude', latitude, 'longitude', longitude, 'lease', next_fetch_at
  )), '[]'::jsonb) into claimed from leased;

  insert into public.job_runs (job, started_at, open_meteo_calls)
  values ('weather-tick', instant, jsonb_array_length(claimed) * forecast_units)
  returning id into run_id;

  return jsonb_build_object('runId', run_id::text, 'enabled', config.weather_enabled, 'areas', claimed,
    'thresholds', jsonb_build_object('dryDays', config.dry_days, 'heavyRainMmPerHour', config.heavy_rain_mm_per_hour,
      'windCardKmh', config.wind_card_kmh, 'windPushKmh', config.wind_push_kmh));
end;
$$;

create function public.server_store_forecast_v1(
  area_key text, lease timestamptz, forecast_data jsonb, fetched_at timestamptz,
  rain_at timestamptz, next_fetch timestamptz, events jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.areas set forecast = forecast_data, forecast_at = fetched_at,
    last_rain_at = greatest(last_rain_at, rain_at), next_fetch_at = next_fetch
  where id = area_key and next_fetch_at = lease;
  if not found then return false; end if;

  update public.weather_events as event set forecast_current = false
  where event.area_id = area_key and event.forecast_current and event.debug_install_id is null
    and event.ends_at > fetched_at
    and not exists (select 1 from jsonb_array_elements(events) as entry where entry ->> 'id' = event.id);

  insert into public.weather_events (id, area_id, kind, starts_at, ends_at, first_rain, push_at)
  select entry.id, area_key, entry.kind, entry.starts_at, entry.ends_at, coalesce(entry.first_rain, false), entry.push_at
  from jsonb_to_recordset(events) as entry(
    id text, kind text, starts_at timestamptz, ends_at timestamptz, first_rain boolean, push_at timestamptz
  )
  on conflict (area_id, kind, starts_at) do update set ends_at = excluded.ends_at,
    first_rain = excluded.first_rain, push_at = excluded.push_at, forecast_current = true;
  return true;
end;
$$;

create function adwam_private.quiet_at(instant timestamptz, zone text, starts integer, ends integer)
returns boolean
language sql
stable
set search_path = ''
as $$
  select ((extract(hour from local_time)::integer * 60 + extract(minute from local_time)::integer - starts + 1440) % 1440)
    < ((ends - starts + 1440) % 1440)
  from (select (instant at time zone zone)::time as local_time) as local_clock;
$$;

create function public.server_weather_push_page_v1(tick_at timestamptz, after_install uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with due as materialized (
    select * from public.weather_events
    where forecast_current and debug_install_id is null and push_at <= tick_at and ends_at > tick_at
  ), page as materialized (
    select install.id, install.area_id, install.time_zone, install.quiet_start, install.quiet_end,
      install.weather_choices, (tick_at at time zone install.time_zone)::date as local_day
    from public.installs as install
    where (after_install is null or install.id > after_install)
      and install.notifications_allowed and install.push_token is not null
      and exists (select 1 from due where area_id = install.area_id and install.weather_choices ->> kind = 'push')
    order by install.id limit 200
  )
  select jsonb_build_object(
    'installs', coalesce((select jsonb_agg(jsonb_build_object(
      'id', page.id, 'areaId', page.area_id, 'timeZone', page.time_zone, 'notificationsAllowed', true,
      'quietHours', jsonb_build_object('start', page.quiet_start, 'end', page.quiet_end),
      'pushKinds', (select jsonb_agg(key) from jsonb_each_text(page.weather_choices) where value = 'push'),
      'lastWeatherPushDay', (select weather_local_day from public.push_outbox
        where install_id = page.id and weather_local_day = page.local_day),
      'sentEventIds', (select coalesce(jsonb_agg(outbox.weather_event_id), '[]'::jsonb)
        from public.push_outbox as outbox join due on due.id = outbox.weather_event_id where outbox.install_id = page.id)
    ) order by page.id) from page), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(adwam_private.weather_payload(due_event) || jsonb_build_object('areaId', due_event.area_id))
      from public.weather_events as due_event join due using (id)
      where exists (select 1 from page where page.area_id = due_event.area_id)), '[]'::jsonb)
  );
$$;

create function public.server_queue_weather_v1(decisions jsonb)
returns integer
language sql
security definer
set search_path = ''
as $$
  with instant as (select statement_timestamp() as now_at), queued as (
    insert into public.push_outbox (install_id, weather_event_id, channel, scheduled_at, weather_local_day)
    select install.id, event.id, 'weather', instant.now_at, decision."localDay"
    from jsonb_to_recordset(decisions) as decision("installId" uuid, "eventId" text, "localDay" date)
    join public.installs as install on install.id = decision."installId"
    join public.weather_events as event on event.id = decision."eventId" and event.area_id = install.area_id
    join public.app_config as config on config.singleton and config.weather_enabled
    cross join instant
    where event.forecast_current and event.debug_install_id is null
      and event.push_at <= instant.now_at and event.ends_at > instant.now_at
      and install.notifications_allowed and install.push_token is not null
      and install.weather_choices ->> event.kind = 'push'
      and decision."localDay" = (instant.now_at at time zone install.time_zone)::date
      and decision."localDay" = (event.push_at at time zone install.time_zone)::date
      and not adwam_private.quiet_at(instant.now_at, install.time_zone, install.quiet_start, install.quiet_end)
      and not adwam_private.quiet_at(event.push_at, install.time_zone, install.quiet_start, install.quiet_end)
    on conflict do nothing
    returning 1
  ) select count(*)::integer from queued;
$$;

revoke all on function public.server_claim_weather_v1(integer),
  public.server_store_forecast_v1(text, timestamptz, jsonb, timestamptz, timestamptz, timestamptz, jsonb),
  public.server_weather_push_page_v1(timestamptz, uuid), public.server_queue_weather_v1(jsonb)
  from public, anon, authenticated;
grant execute on function public.server_claim_weather_v1(integer),
  public.server_store_forecast_v1(text, timestamptz, jsonb, timestamptz, timestamptz, timestamptz, jsonb),
  public.server_weather_push_page_v1(timestamptz, uuid), public.server_queue_weather_v1(jsonb) to service_role;
