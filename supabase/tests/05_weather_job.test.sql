begin;
select plan(12);

delete from public.job_runs where job = 'weather-tick';
update public.app_config set open_meteo_daily_budget = 1, weather_enabled = true, dry_days = 7;

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-000000008041', true), ('00000000-0000-0000-0000-000000008042', true);
insert into public.areas (id, latitude, longitude, time_zone, next_fetch_at) values
  ('501:-11', 50.1, -1.1, 'UTC', '2000-01-01'),
  ('502:-11', 50.2, -1.1, 'UTC', '2001-01-01'),
  ('503:-11', 50.3, -1.1, 'UTC', '2002-01-01');
insert into public.installs (id, push_token, platform, app_version, content_version, country_code, time_zone,
  quiet_start, quiet_end, weather_choices, area_id, hijri_method, hijri_shift, notifications_allowed
) values
  ('00000000-0000-0000-0000-000000008041', 'test-token', 'android', '0.1.0', '2026.11.21', 'GB', 'UTC',
    0, 0, '{"rain-start":"push","wind":"push"}', '502:-11', 'umalqura', 0, true),
  ('00000000-0000-0000-0000-000000008042', 'test-token', 'android', '0.1.0', '2026.11.21', 'GB', 'UTC',
    0, 0, '{"rain-start":"push"}', '503:-11', 'umalqura', 0, true);

set local role authenticated;
select throws_ok('select public.server_claim_weather_v1(1)', '42501', null, 'An app session cannot claim jobs');
select throws_ok('select public.server_weather_push_page_v1(now(), null)', '42501', null, 'An app session cannot list push targets');
reset role;

set local role service_role;
create temporary table weather_claim as select public.server_claim_weather_v1(100) as result;
select is((select result #>> '{areas,0,id}' from weather_claim), '502:-11', 'The oldest due area with an install is claimed');
select is((select jsonb_array_length(result -> 'areas') from weather_claim), 1, 'The remaining budget limits the batch');
select is(jsonb_array_length(public.server_claim_weather_v1(100) -> 'areas'), 0, 'The next job sees the reserved budget');

select is(public.server_store_forecast_v1('502:-11', '2001-01-01', '{}', now(), null, now() + interval '3 hours', '[]'),
  false, 'A stale claim cannot change an area');

insert into public.weather_events (id, area_id, kind, starts_at, ends_at, push_at) values
  ('previous-rain', '502:-11', 'rain-start', now(), now() + interval '2 hours', now());
select is(public.server_store_forecast_v1('502:-11',
  (select (result #>> '{areas,0,lease}')::timestamptz from weather_claim),
  '{"hourly":{"cloud_cover":[10]}}', now(), now(), now() + interval '30 minutes', jsonb_build_array(
    jsonb_build_object('id', 'next-rain', 'kind', 'rain-start', 'starts_at', now() + interval '1 hour',
      'ends_at', now() + interval '2 hours', 'first_rain', true, 'push_at', now() + interval '1 hour')
  )), true, 'A current claim updates the forecast and its events');
select is((select forecast #>> '{hourly,cloud_cover,0}' from public.areas where id = '502:-11'), '10', 'Cloud cover is stored');
select is((select forecast_current from public.weather_events where id = 'previous-rain'), false,
  'The revised forecast supersedes disappeared events');

update public.weather_events set push_at = now() where id = 'next-rain';
insert into public.weather_events (id, area_id, kind, starts_at, ends_at, push_at) values
  ('next-wind', '502:-11', 'wind', now(), now() + interval '1 hour', now());
select is(public.server_weather_push_page_v1(now(), null) #>> '{events,0,areaId}', '502:-11',
  'The weather engine receives the area for a due event');

select is(public.server_queue_weather_v1(jsonb_build_array(jsonb_build_object(
  'installId', '00000000-0000-0000-0000-000000008041', 'eventId', 'next-rain', 'localDay', (now() at time zone 'UTC')::date
))), 1, 'An eligible push is queued');
select is(public.server_queue_weather_v1(jsonb_build_array(jsonb_build_object(
  'installId', '00000000-0000-0000-0000-000000008041', 'eventId', 'next-wind', 'localDay', (now() at time zone 'UTC')::date
))), 0, 'A second event on the install’s local day is refused');

select * from finish();
rollback;
