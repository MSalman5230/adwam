begin;
select plan(11);

insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-000000008051', true);
insert into public.areas (id, latitude, longitude, time_zone) values ('501:-12', 50.1, -1.2, 'UTC');
insert into public.installs (id, push_token, platform, app_version, content_version, country_code, time_zone,
  quiet_start, quiet_end, weather_choices, area_id, hijri_method, hijri_shift, notifications_allowed
) values ('00000000-0000-0000-0000-000000008051', 'synthetic-token', 'android', '0.1.0', '2026.11.21', 'GB', 'UTC',
  0, 0, '{"rain-start":"push"}', '501:-12', 'umalqura', 0, true);
insert into public.weather_events (id, area_id, kind, starts_at, ends_at, push_at) values
  ('send-rain', '501:-12', 'rain-start', now() - interval '1 minute', now() + interval '1 hour', now()),
  ('send-expired', '501:-12', 'rain-start', now() - interval '2 hours', now() - interval '1 hour', now() - interval '2 hours');
insert into public.push_outbox (install_id, weather_event_id, channel, scheduled_at) values
  ('00000000-0000-0000-0000-000000008051', 'send-rain', 'weather', '2000-01-01'),
  ('00000000-0000-0000-0000-000000008051', 'send-expired', 'weather', '2000-01-01');

set local role authenticated;
select throws_ok('select public.server_claim_push_v1(100)', '42501', null, 'An app session cannot claim messages');
reset role;

set local role service_role;
create temporary table push_claim as select public.server_claim_push_v1(100) as result;
select is(jsonb_array_length((select result -> 'messages' from push_claim)), 1, 'Only the still active weather message is claimable');
select is((select result #>> '{messages,0,token}' from push_claim), 'synthetic-token', 'The claim snapshots the token used for delivery');
select is((select error_code from public.push_outbox where weather_event_id = 'send-expired'), 'Ineligible',
  'Expired messages are retired');
select is(jsonb_array_length(public.server_claim_push_v1(100) -> 'messages'), 0, 'The next worker cannot claim an in-flight batch');
select is(public.server_store_push_tickets_v1((select (result ->> 'claimedAt')::timestamptz from push_claim),
  jsonb_build_array(jsonb_build_object('id', (select result #>> '{messages,0,id}' from push_claim),
    'code', 'ExpoBusy', 'retry_seconds', 300))), 1, 'An explicit rejection is eligible for retry');
select ok((select scheduled_at > statement_timestamp() + interval '4 minutes' from public.push_outbox where weather_event_id = 'send-rain'),
  'The requested retry delay is respected');
select is(public.server_store_push_tickets_v1((select (result ->> 'claimedAt')::timestamptz from push_claim),
  jsonb_build_array(jsonb_build_object('id', (select result #>> '{messages,0,id}' from push_claim), 'receipt_id', 'stale-receipt'))),
  0, 'A stale ticket cannot modify a row after its claim is finalized');

update public.push_outbox set scheduled_at = '2000-01-01' where weather_event_id = 'send-rain';
update push_claim set result = public.server_claim_push_v1(100);
select is((select result #>> '{messages,0,attempts}' from push_claim), '2', 'The retry has a new claim and attempt');
select is(public.server_store_push_tickets_v1((select (result ->> 'claimedAt')::timestamptz from push_claim),
  jsonb_build_array(jsonb_build_object('id', (select result #>> '{messages,0,id}' from push_claim), 'receipt_id', 'recorded-receipt'))),
  1, 'An accepted message records its Expo receipt');
select is(jsonb_array_length(public.server_claim_push_v1(100) -> 'messages'), 0, 'A successful message cannot be sent again');

select * from finish();
rollback;
