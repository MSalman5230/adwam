create schema adwam_private;
revoke all on schema adwam_private from public, anon, authenticated;

-- Simulated weather belongs to the test install that asked for it.
alter table public.weather_events
  add column debug_install_id uuid references public.installs (id) on delete cascade;
create index weather_events_debug_install_idx on public.weather_events (debug_install_id) where debug_install_id is not null;

create function adwam_private.require_anonymous_install()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  install_id uuid := auth.uid();
begin
  if install_id is null or (auth.jwt() ->> 'is_anonymous') is distinct from 'true' then
    raise exception using errcode = '42501', message = 'Anonymous install required';
  end if;
  return install_id;
end;
$$;

create function adwam_private.weather_payload(event public.weather_events)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', event.id, 'weather', event.kind,
    'start', (extract(epoch from event.starts_at) * 1000)::bigint,
    'end', (extract(epoch from event.ends_at) * 1000)::bigint,
    'pushAt', (extract(epoch from event.push_at) * 1000)::bigint
  ));
$$;

create function public.sync_install_v1(input jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  install_id uuid := adwam_private.require_anonymous_install();
  platform_name text := input ->> 'platform';
  app_version_text text := input ->> 'appVersion';
  content_version_text text := input ->> 'contentVersion';
  country text := input ->> 'countryCode';
  zone text := input ->> 'timeZone';
  token text := input ->> 'pushToken';
  quiet_start_number numeric;
  quiet_end_number numeric;
  shift_number numeric;
  method text := input ->> 'hijriMethod';
  choices jsonb := input -> 'weatherChoices';
  area jsonb := input -> 'area';
  area_key text;
  latitude_number numeric;
  longitude_number numeric;
begin
  if jsonb_typeof(input) is distinct from 'object' or octet_length(input::text) > 8192
    or platform_name is null or platform_name not in ('android', 'ios')
    or app_version_text is null or app_version_text !~ '^[0-9]{1,6}\.[0-9]{1,6}\.[0-9]{1,6}([-+][[:alnum:].+-]{1,40})?$'
    or content_version_text is null or content_version_text !~ '^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$'
    or country is null or country !~ '^[A-Z]{2}$'
    or zone is null or length(zone) > 80 or not exists (select 1 from pg_timezone_names where name = zone)
    or (token is not null and (length(token) > 256 or token !~ '^(ExpoPushToken|ExponentPushToken)\[[^][[:space:]]+\]$'))
    or method is null or method not in ('umalqura', 'civil')
    or jsonb_typeof(input -> 'quietStart') is distinct from 'number'
    or jsonb_typeof(input -> 'quietEnd') is distinct from 'number'
    or jsonb_typeof(input -> 'hijriShift') is distinct from 'number'
    or jsonb_typeof(input -> 'notificationsAllowed') is distinct from 'boolean'
    or jsonb_typeof(choices) is distinct from 'object'
  then
    raise exception using errcode = '22023', message = 'Invalid install settings';
  end if;

  quiet_start_number := (input ->> 'quietStart')::numeric;
  quiet_end_number := (input ->> 'quietEnd')::numeric;
  shift_number := (input ->> 'hijriShift')::numeric;
  if quiet_start_number not between 0 and 1439 or quiet_start_number <> trunc(quiet_start_number)
    or quiet_end_number not between 0 and 1439 or quiet_end_number <> trunc(quiet_end_number)
    or shift_number not in (-1, 0, 1)
    or exists (
      select 1 from jsonb_each_text(choices) as choice(kind, level)
      where kind not in ('rain-start', 'rain-stop', 'heavy-rain', 'thunder', 'wind')
        or level is null or level not in ('off', 'inapp', 'push')
    )
  then
    raise exception using errcode = '22023', message = 'Invalid reminder settings';
  end if;

  if area is not null and area <> 'null'::jsonb then
    if jsonb_typeof(area) is distinct from 'object'
      or jsonb_typeof(area -> 'latitude') is distinct from 'number'
      or jsonb_typeof(area -> 'longitude') is distinct from 'number'
      or (area - array['id', 'latitude', 'longitude']) <> '{}'::jsonb
    then
      raise exception using errcode = '22023', message = 'Invalid weather area';
    end if;
    latitude_number := (area ->> 'latitude')::numeric;
    longitude_number := (area ->> 'longitude')::numeric;
    if latitude_number not between -90 and 90 or latitude_number <> round(latitude_number, 1)
      or longitude_number < -180 or longitude_number >= 180 or longitude_number <> round(longitude_number, 1)
    then
      raise exception using errcode = '22023', message = 'Weather area must use the 0.1 degree grid';
    end if;
    area_key := (latitude_number * 10)::integer::text || ':' || (longitude_number * 10)::integer::text;
    if area_key is distinct from area ->> 'id' then
      raise exception using errcode = '22023', message = 'Invalid weather area ID';
    end if;
    insert into public.areas (id, latitude, longitude, time_zone)
    values (area_key, latitude_number, longitude_number, zone)
    on conflict (id) do nothing;
  end if;

  insert into public.installs (
    id, push_token, platform, app_version, content_version, country_code, time_zone,
    quiet_start, quiet_end, weather_choices, area_id, hijri_method, hijri_shift,
    notifications_allowed, last_seen_at
  ) values (
    install_id, token, platform_name, app_version_text, content_version_text, country, zone,
    quiet_start_number::smallint, quiet_end_number::smallint, choices, area_key, method, shift_number::smallint,
    (input ->> 'notificationsAllowed')::boolean, now()
  )
  on conflict (id) do update set
    push_token = excluded.push_token, platform = excluded.platform, app_version = excluded.app_version,
    content_version = excluded.content_version, country_code = excluded.country_code, time_zone = excluded.time_zone,
    quiet_start = excluded.quiet_start, quiet_end = excluded.quiet_end, weather_choices = excluded.weather_choices,
    area_id = excluded.area_id, hijri_method = excluded.hijri_method, hijri_shift = excluded.hijri_shift,
    notifications_allowed = excluded.notifications_allowed, last_seen_at = excluded.last_seen_at;
end;
$$;

create function public.my_weather_v1()
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
    where install.id = caller and event.ends_at > now()
      and (event.debug_install_id is null or event.debug_install_id = caller)
  );
end;
$$;

create function public.corrections_v1()
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
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', correction.id, 'countryCode', correction.country_code, 'year', correction.hijri_year,
      'month', correction.hijri_month, 'start', correction.starts_on, 'sourceUrl', correction.source_url,
      'withdrawn', correction.status = 'withdrawn'
    ) order by correction.starts_on, correction.id), '[]'::jsonb)
    from public.installs as install
    join public.hijri_corrections as correction on correction.country_code = install.country_code
    where install.id = caller and correction.status in ('published', 'withdrawn')
  );
end;
$$;

create function public.config_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  config public.app_config%rowtype;
begin
  perform adwam_private.require_anonymous_install();
  select * into strict config from public.app_config where singleton;
  return jsonb_build_object(
    'minAppVersion', config.min_app_version, 'weatherEnabled', config.weather_enabled,
    'debugToolsEnabled', config.debug_tools_enabled
  );
end;
$$;

create function public.forget_me_v1()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  install_id uuid := adwam_private.require_anonymous_install();
begin
  delete from public.installs where id = install_id;
end;
$$;

create function public.debug_weather_event_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := adwam_private.require_anonymous_install();
  install public.installs%rowtype;
  simulated public.weather_events%rowtype;
  instant timestamptz := clock_timestamp();
  local_time time;
  local_minute integer;
  in_quiet_hours boolean;
begin
  if not exists (select 1 from public.app_config where singleton and debug_tools_enabled and weather_enabled) then
    raise exception using errcode = '42501', message = 'Weather simulation is disabled';
  end if;
  select * into install from public.installs where id = caller for update;
  if not found or install.area_id is null then
    raise exception using errcode = '22023', message = 'The install needs a weather area';
  end if;
  select * into simulated from public.weather_events
  where debug_install_id = install.id and area_id = install.area_id and ends_at > instant
  order by starts_at desc limit 1;
  if not found then
    insert into public.weather_events (id, area_id, kind, starts_at, ends_at, first_rain, push_at, debug_install_id)
    values (
      'debug-' || gen_random_uuid(), install.area_id, 'rain-start',
      instant, instant + interval '3 hours', true, instant, install.id
    ) returning * into simulated;
  end if;

  local_time := (instant at time zone install.time_zone)::time;
  local_minute := extract(hour from local_time)::integer * 60 + extract(minute from local_time)::integer;
  in_quiet_hours := case
    when install.quiet_start = install.quiet_end then false
    when install.quiet_start < install.quiet_end then local_minute >= install.quiet_start and local_minute < install.quiet_end
    else local_minute >= install.quiet_start or local_minute < install.quiet_end
  end;
  if install.notifications_allowed and install.push_token is not null
    and install.weather_choices ->> 'rain-start' = 'push' and not in_quiet_hours
  then
    insert into public.push_outbox (install_id, weather_event_id, channel, scheduled_at)
    values (install.id, simulated.id, 'weather', instant)
    on conflict do nothing;
  end if;
  return adwam_private.weather_payload(simulated);
end;
$$;

revoke all on function public.sync_install_v1(jsonb), public.my_weather_v1(), public.corrections_v1(),
  public.config_v1(), public.forget_me_v1(), public.debug_weather_event_v1() from public, anon, authenticated;
grant execute on function public.sync_install_v1(jsonb), public.my_weather_v1(), public.corrections_v1(),
  public.config_v1(), public.forget_me_v1(), public.debug_weather_event_v1() to authenticated;
