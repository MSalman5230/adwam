begin;
select plan(19);

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-000000008021', false),
  ('00000000-0000-0000-0000-000000008022', false),
  ('00000000-0000-0000-0000-000000008023', true),
  ('00000000-0000-0000-0000-000000008024', true),
  ('00000000-0000-0000-0000-000000008025', true),
  ('00000000-0000-0000-0000-000000008026', true),
  ('00000000-0000-0000-0000-000000008027', true);
insert into public.admins (id) values
  ('00000000-0000-0000-0000-000000008021'), ('00000000-0000-0000-0000-000000008023');

insert into public.installs (
  id, push_token, platform, app_version, content_version, country_code, time_zone, quiet_start, quiet_end,
  hijri_method, hijri_shift, notifications_allowed
)
select id::uuid, 'synthetic-' || id, 'android', '0.1.0', '2026.11.21', country, 'UTC', 0, 0, method, shift, true
from (values
  ('00000000-0000-0000-0000-000000008024', 'GB', 'umalqura', 0),
  ('00000000-0000-0000-0000-000000008025', 'GB', 'civil', 0),
  ('00000000-0000-0000-0000-000000008026', 'GB', 'umalqura', -1),
  ('00000000-0000-0000-0000-000000008027', 'FR', 'civil', 0)
) as fixture(id, country, method, shift);

update public.installs set
  quiet_start = (extract(hour from (now() at time zone 'UTC'))::integer * 60 + 1430) % 1440,
  quiet_end = (extract(hour from (now() at time zone 'UTC'))::integer * 60 + 70) % 1440
where id = '00000000-0000-0000-0000-000000008025';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000008022","is_anonymous":false,"role":"authenticated"}';
select throws_ok('select public.list_corrections_v1()', '42501', 'Correction admin required', 'A non-member cannot list corrections');

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000008023","is_anonymous":true,"role":"authenticated"}';
select throws_ok(
  $$select public.draft_correction_v1('GB', 1448, 9, '2027-02-07', 'https://example.com/source')$$,
  '42501', 'Correction admin required', 'An anonymous member cannot publish or create drafts'
);

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000008021","is_anonymous":false,"role":"authenticated"}';
select throws_ok(
  $$select public.draft_correction_v1('GB', 1448, 13, '2027-02-07', 'https://example.com/source')$$,
  '22023', 'Invalid correction draft', 'An admin cannot save an invalid month'
);

do $$
begin
  perform set_config('adwam.test_first', public.draft_correction_v1('GB', 1448, 9, '2027-02-06', 'https://example.com/source') ->> 'id', true);
end;
$$;

select is(jsonb_array_length(public.list_corrections_v1()), 1, 'The admin can list the saved draft');
select is(
  public.draft_correction_v1('GB', 1448, 9, '2027-02-07', 'https://example.com/source',
    current_setting('adwam.test_first')::uuid) ->> 'start',
  '2027-02-07', 'An admin can revise a draft'
);
select is(
  public.estimate_correction_v1(current_setting('adwam.test_first')::uuid, '2027-02-07', '2027-02-08'),
  2::bigint, 'The estimate uses each install’s method and shift in the selected country'
);
select throws_ok($$
  select public.server_publish_correction_v1(current_setting('adwam.test_first')::uuid,
    '00000000-0000-0000-0000-000000008021', 'GB', 1448, 9, '2027-02-07', '2027-02-07', '2027-02-08')
$$, '42501', null, 'Even an admin cannot bypass the Edge Function date checks');

set local role service_role;
select throws_ok($$
  select public.server_publish_correction_v1(current_setting('adwam.test_first')::uuid,
    '00000000-0000-0000-0000-000000008023', 'GB', 1448, 9, '2027-02-07', '2027-02-07', '2027-02-08')
$$, '42501', 'Correction admin required', 'An anonymous membership is refused by the publisher');
select is(public.server_publish_correction_v1(current_setting('adwam.test_first')::uuid,
  '00000000-0000-0000-0000-000000008021', 'GB', 1448, 9, '2027-02-07', '2027-02-07', '2027-02-08') #>> '{correction,status}',
  'published', 'The publisher uses the verified admin identity');
select is((select count(*) from public.push_outbox where correction_id = current_setting('adwam.test_first')::uuid),
  2::bigint, 'Only affected installs in the announced country are notified');
select is((select channel from public.push_outbox where install_id = '00000000-0000-0000-0000-000000008025'),
  'corrections-silent', 'A correction queued during quiet hours uses the silent channel');
select is((select channel from public.push_outbox where install_id = '00000000-0000-0000-0000-000000008026'),
  'corrections', 'A correction outside quiet hours uses the audible channel');
select is(public.server_publish_correction_v1(current_setting('adwam.test_first')::uuid,
  '00000000-0000-0000-0000-000000008021', 'GB', 1448, 9, '2027-02-07', '2027-02-07', '2027-02-08') ->> 'queued',
  '0', 'Repeating the publication does not send twice'
);

set local role authenticated;
select throws_ok(
  $$select public.draft_correction_v1('GB', 1448, 9, '2027-02-07', 'https://example.com/source',
    current_setting('adwam.test_first')::uuid)$$,
  '22023', 'Correction draft does not exist', 'A published announcement cannot be edited as a draft'
);

do $$
begin
  perform set_config('adwam.test_second', public.draft_correction_v1('GB', 1448, 9, '2027-02-08', 'https://example.com/updated') ->> 'id', true);
end;
$$;

set local role service_role;
select throws_ok($$
  select public.server_publish_correction_v1(current_setting('adwam.test_second')::uuid,
    '00000000-0000-0000-0000-000000008021', 'GB', 1448, 9, '2027-02-07', '2027-02-07', '2027-02-08')
$$, '40001', 'Correction draft changed', 'A revised draft must be inspected again before publishing');
select is(public.server_publish_correction_v1(current_setting('adwam.test_second')::uuid,
  '00000000-0000-0000-0000-000000008021', 'GB', 1448, 9, '2027-02-08', '2027-02-07', '2027-02-08') #>> '{correction,status}',
  'published', 'An admin can publish a replacement announcement'
);

set local role authenticated;
select is(
  (select correction ->> 'status' from jsonb_array_elements(public.list_corrections_v1()) as correction
   where correction ->> 'id' = current_setting('adwam.test_first')),
  'withdrawn', 'Publishing a replacement withdraws the previous announcement'
);
select is(
  public.withdraw_correction_v1(current_setting('adwam.test_second')::uuid) ->> 'status',
  'withdrawn', 'An admin can withdraw a published announcement'
);
select is(
  (select count(*) from jsonb_array_elements(public.list_corrections_v1()) as correction
   where correction ->> 'status' = 'published'),
  0::bigint, 'No published announcement remains after withdrawal'
);

select * from finish();
rollback;
