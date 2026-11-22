begin;
select plan(10);

insert into auth.users (id, is_anonymous)
select ('00000000-0000-0000-0000-00000000806' || number)::uuid, true from generate_series(1, 4) as number;
insert into public.areas (id, latitude, longitude, time_zone) values ('501:-13', 50.1, -1.3, 'UTC');
insert into public.installs (id, push_token, platform, app_version, content_version, country_code, time_zone,
  quiet_start, quiet_end, weather_choices, area_id, hijri_method, hijri_shift, notifications_allowed
)
select ('00000000-0000-0000-0000-00000000806' || number)::uuid, 'current-' || number, 'android', '0.1.0',
  '2026.11.21', 'GB', 'UTC', 0, 0, '{"rain-start":"push"}', '501:-13', 'umalqura', 0, true
from generate_series(1, 4) as number;
insert into public.weather_events (id, area_id, kind, starts_at, ends_at) values
  ('receipt-weather', '501:-13', 'rain-start', now(), now() + interval '1 hour'),
  ('receipt-expired', '501:-13', 'rain-start', now() - interval '25 hours', now() - interval '24 hours'),
  ('receipt-recent', '501:-13', 'rain-start', now() - interval '5 minutes', now() + interval '1 hour');
insert into public.push_outbox (
  install_id, weather_event_id, channel, scheduled_at, status, sent_at, expo_receipt_id, attempt_push_token, error_code
) values
  ('00000000-0000-0000-0000-000000008061', 'receipt-weather', 'weather', now(), 'sent', now() - interval '20 minutes', 'invalid', 'current-1', null),
  ('00000000-0000-0000-0000-000000008062', 'receipt-weather', 'weather', now(), 'sent', now() - interval '20 minutes', 'rotated', 'old-2', null),
  ('00000000-0000-0000-0000-000000008063', 'receipt-weather', 'weather', now(), 'failed', null, null, 'current-3', 'DeviceNotRegistered'),
  ('00000000-0000-0000-0000-000000008064', 'receipt-weather', 'weather', now(), 'sent', now() - interval '20 minutes', 'delivered', 'current-4', null),
  ('00000000-0000-0000-0000-000000008064', 'receipt-expired', 'weather', now(), 'sent', now() - interval '25 hours', 'expired', 'current-4', null),
  ('00000000-0000-0000-0000-000000008064', 'receipt-recent', 'weather', now(), 'sent', now() - interval '2 minutes', 'recent', 'current-4', null);

set local role service_role;
create temporary table receipt_claim as select public.server_claim_push_receipts_v1(1000) as result;
select is((select result ->> 'removed' from receipt_claim), '1', 'A definite invalid-token ticket retires its install');
select is((select count(*) from public.installs where push_token = 'current-3'), 0::bigint, 'The rejected ticket’s token is gone');
select is((select result ->> 'expired' from receipt_claim), '1', 'An unconfirmed receipt expires after a day');
select is(jsonb_array_length((select result -> 'receipts' from receipt_claim)), 3, 'Only receipts between 15 minutes and one day old are checked');
select is(jsonb_array_length(public.server_claim_push_receipts_v1(1000) -> 'receipts'), 0, 'A concurrent worker skips claims');

create temporary table receipt_result as select public.server_store_push_receipts_v1((
  select jsonb_agg(jsonb_build_object('id', item ->> 'id', 'receipt_id', item ->> 'receiptId',
    'code', case when item ->> 'receiptId' <> 'delivered' then 'DeviceNotRegistered' end))
  from receipt_claim, jsonb_array_elements(result -> 'receipts') as item
)) as result;
select is((select result ->> 'checked' from receipt_result), '3', 'Explicit success and error receipts are recorded');
select is((select result ->> 'removed' from receipt_result), '1', 'A failed receipt clears only the still-current token');
select is((select count(*) from public.installs where push_token = 'current-1'), 0::bigint, 'The invalid token install is deleted');
select is((select count(*) from public.installs where push_token = 'current-2'), 1::bigint, 'The rotated token install is retained');
select ok((select status = 'sent' and receipt_checked_at is not null from public.push_outbox where expo_receipt_id = 'delivered'),
  'A confirmed delivery is retained');

select * from finish();
rollback;
