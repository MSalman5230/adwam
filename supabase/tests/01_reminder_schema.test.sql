begin;
select plan(6);

create temporary table tested_tables (name text primary key);
insert into tested_tables values ('areas'), ('installs'), ('weather_events'), ('admins'),
  ('hijri_corrections'), ('push_outbox'), ('app_config'), ('job_runs');

select is(
  (select count(*) from tested_tables
   join pg_class on oid = to_regclass('public.' || name)
   where relrowsecurity),
  8::bigint,
  'All reminder tables enable row-level security'
);

select ok(
  not exists (
    select 1 from tested_tables, unnest(array['anon', 'authenticated']) as role_name
    where has_table_privilege(role_name, 'public.' || name, 'select, insert, update, delete, truncate, references, trigger')
  ),
  'App roles have no direct reminder table privileges'
);

select ok(
  (select bool_and(has_table_privilege('service_role', 'public.' || name, 'select')) from tested_tables),
  'The service role can read the tables used by background jobs'
);

insert into public.areas (id, latitude, longitude, time_zone) values ('515:-1', 51.5, -0.1, 'Europe/London');
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-000000008001', true);
insert into public.installs (
  id, platform, app_version, content_version, country_code, time_zone, quiet_start, quiet_end, area_id,
  hijri_method, hijri_shift, notifications_allowed
) values (
  '00000000-0000-0000-0000-000000008001', 'android', '0.1.0', '2026.11.21', 'GB', 'Europe/London', 1320, 420, '515:-1',
  'umalqura', 0, true
);
insert into public.weather_events (id, area_id, kind, starts_at, ends_at) values (
  'fixture-rain', '515:-1', 'rain-start', '2026-11-22 07:30+00', '2026-11-22 09:30+00'
);
insert into public.push_outbox (install_id, weather_event_id, channel, scheduled_at) values (
  '00000000-0000-0000-0000-000000008001', 'fixture-rain', 'weather', '2026-11-22 07:30+00'
);

select throws_ok($$
  insert into public.areas (id, latitude, longitude, time_zone) values ('other', 51.5, -0.1, 'Europe/London')
$$, '23514', null, 'An area ID must refer to its stored 0.1 degree grid centre');

select throws_ok($$
  insert into public.weather_events (id, area_id, kind, starts_at, ends_at) values (
    'another-id', '515:-1', 'rain-start', '2026-11-22 07:30+00', '2026-11-22 10:30+00'
  )
$$, '23505', null, 'A weather event can only be queued once for its area, kind and start');

select throws_ok($$
  insert into public.push_outbox (install_id, weather_event_id, channel, scheduled_at) values (
    '00000000-0000-0000-0000-000000008001', 'fixture-rain', 'weather', '2026-11-22 08:30+00'
  )
$$, '23505', null, 'An install can receive a weather event only once');

select * from finish();
rollback;
