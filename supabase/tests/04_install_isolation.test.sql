begin;
select plan(9);

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-000000008031', true), ('00000000-0000-0000-0000-000000008032', true);
insert into public.installs (
  id, platform, app_version, content_version, country_code, time_zone, quiet_start, quiet_end,
  weather_choices, hijri_method, hijri_shift, notifications_allowed
) values
  ('00000000-0000-0000-0000-000000008031', 'android', '0.1.0', '2026.11.21', 'GB', 'Europe/London',
    1320, 420, '{}', 'umalqura', 0, false),
  ('00000000-0000-0000-0000-000000008032', 'android', '0.1.0', '2026.11.21', 'FR', 'Europe/Paris',
    1320, 420, '{}', 'civil', 0, true);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000008031","is_anonymous":true,"role":"authenticated"}';
select throws_ok(
  $$select * from public.installs where id = '00000000-0000-0000-0000-000000008032'$$,
  '42501', null, 'An authenticated install cannot read other install settings directly'
);
select throws_ok(
  $$update public.installs set quiet_start = 0 where id = '00000000-0000-0000-0000-000000008032'$$,
  '42501', null, 'An authenticated install cannot update other install settings directly'
);
select throws_ok(
  $$delete from public.installs where id = '00000000-0000-0000-0000-000000008032'$$,
  '42501', null, 'An authenticated install cannot delete another install'
);
select throws_ok(
  'select * from public.push_outbox', '42501', null, 'App sessions cannot read the queue'
);
select lives_ok($$
  select public.sync_install_v1('{
    "id":"00000000-0000-0000-0000-000000008032",
    "platform":"android","appVersion":"0.1.0","contentVersion":"2026.11.21",
    "countryCode":"GB","timeZone":"Europe/London","quietStart":1380,"quietEnd":420,
    "notificationsAllowed":true,"weatherChoices":{},"hijriMethod":"umalqura","hijriShift":0
  }')
$$, 'Install sync uses the actor’s identity even if an ID is included in the payload');

reset role;
select is(
  (select quiet_start from public.installs where id = '00000000-0000-0000-0000-000000008031'),
  1380::smallint, 'The authenticated install received the update'
);
select is(
  (select quiet_start from public.installs where id = '00000000-0000-0000-0000-000000008032'),
  1320::smallint, 'The other install did not receive the update'
);
select ok(
  not exists (
    select 1 from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where nspname = 'public' and proname like '%\_v1' escape '\'
      and (not prosecdef or not coalesce('search_path=""' = any (proconfig), false))
  ),
  'Versioned RPCs run with definer rights and a fixed empty search path'
);

insert into public.hijri_corrections (id, country_code, hijri_year, hijri_month, starts_on, source_url, status)
values ('00000000-0000-0000-0000-000000008033', 'GB', 1448, 9, '2027-02-07', 'https://example.com/source', 'published');
insert into public.push_outbox (install_id, correction_id, channel, scheduled_at)
values ('00000000-0000-0000-0000-000000008031', '00000000-0000-0000-0000-000000008033', 'corrections', now());
select throws_ok($$
  insert into public.push_outbox (install_id, correction_id, channel, scheduled_at)
  values ('00000000-0000-0000-0000-000000008031', '00000000-0000-0000-0000-000000008033', 'corrections-silent', now())
$$, '23505', null, 'An install cannot receive the same correction on two channels');

select * from finish();
rollback;
