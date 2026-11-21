begin;
select plan(15);

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-000000008011', true),
  ('00000000-0000-0000-0000-000000008012', true),
  ('00000000-0000-0000-0000-000000008013', false);

set local "adwam.test_input" = '{
  "platform":"android","appVersion":"0.1.0","contentVersion":"2026.11.21",
  "countryCode":"GB","timeZone":"Europe/London","quietStart":0,"quietEnd":0,
  "pushToken":"ExpoPushToken[local-test-fixture]","notificationsAllowed":true,
  "weatherChoices":{"rain-start":"push"},"area":{"id":"515:-1","latitude":51.5,"longitude":-0.1},
  "hijriMethod":"umalqura","hijriShift":0
}';

insert into public.areas (id, latitude, longitude, time_zone) values
  ('515:-1', 51.5, -0.1, 'Europe/London'),
  ('489:23', 48.9, 2.3, 'Europe/Paris');
insert into public.weather_events (id, area_id, kind, starts_at, ends_at) values
  ('london-weather', '515:-1', 'rain-start', now() - interval '5 minutes', now() + interval '1 hour'),
  ('paris-weather', '489:23', 'wind', now() - interval '3 minutes', now() + interval '1 hour');
insert into public.hijri_corrections (country_code, hijri_year, hijri_month, starts_on, source_url, status) values
  ('GB', 1448, 9, '2027-02-07', 'https://example.com/published', 'published'),
  ('GB', 1448, 9, '2027-02-08', 'https://example.com/withdrawn', 'withdrawn'),
  ('GB', 1448, 10, '2027-03-09', 'https://example.com/draft', 'draft'),
  ('FR', 1448, 9, '2027-02-08', 'https://example.com/france', 'published');
update public.app_config set debug_tools_enabled = false;

select ok(not has_function_privilege('anon', 'public.sync_install_v1(jsonb)', 'execute'), 'Unauthenticated callers cannot sync');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000008013","is_anonymous":false,"role":"authenticated"}';
select throws_ok('select public.config_v1()', '42501', 'Anonymous install required', 'A non-install user is refused');

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000008011","is_anonymous":true,"role":"authenticated"}';
select lives_ok(
  $$select public.sync_install_v1(current_setting('adwam.test_input')::jsonb)$$,
  'An anonymous install can sync valid settings'
);
select throws_ok(
  $$select public.sync_install_v1(jsonb_set(current_setting('adwam.test_input')::jsonb, '{area,latitude}', '51.501'))$$,
  '22023', 'Weather area must use the 0.1 degree grid', 'The API refuses exact locations'
);
select throws_ok(
  $$select public.sync_install_v1(jsonb_set(current_setting('adwam.test_input')::jsonb, '{notificationsAllowed}', '"true"'))$$,
  '22023', 'Invalid install settings', 'The API refuses a string in place of a boolean'
);
select is(
  public.my_weather_v1() -> 0 ->> 'id', 'london-weather', 'Weather is scoped to the caller’s area'
);
select is(
  jsonb_array_length(public.corrections_v1()), 2, 'A caller sees published and withdrawn corrections for its own country'
);
select throws_ok(
  'select public.debug_weather_event_v1()', '42501', 'Weather simulation is disabled',
  'Weather simulation requires the stage configuration switch'
);

reset role;
update public.app_config set debug_tools_enabled = true;
set local role authenticated;
select lives_ok('select public.debug_weather_event_v1()', 'Debug weather creates an event for the caller');
select is(
  public.debug_weather_event_v1() ->> 'id', public.debug_weather_event_v1() ->> 'id',
  'Repeated debug requests reuse the active event'
);
select is(jsonb_array_length(public.my_weather_v1()), 2, 'The caller sees its simulated and ordinary weather');

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000008012","is_anonymous":true,"role":"authenticated"}';
select lives_ok(
  $$select public.sync_install_v1(jsonb_set(current_setting('adwam.test_input')::jsonb, '{countryCode}', '"FR"'))$$,
  'Another anonymous install can sync its own row'
);
select is(jsonb_array_length(public.my_weather_v1()), 1, 'Another install in the same area cannot see the simulated event');
select lives_ok('select public.forget_me_v1()', 'An anonymous install can delete its own settings');

reset role;
select is(
  (select array_agg(id::text order by id) from public.installs where id in (
    '00000000-0000-0000-0000-000000008011', '00000000-0000-0000-0000-000000008012'
  )),
  array['00000000-0000-0000-0000-000000008011'],
  'Deleting one install keeps the other install’s settings'
);

select * from finish();
rollback;
