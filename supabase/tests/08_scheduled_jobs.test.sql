begin;
select plan(9);

select results_eq(
  $$select jobname from cron.job where active and starts_with(jobname, 'adwam-') order by jobname$$,
  $$values ('adwam-cleanup'::text), ('adwam-push-receipts'), ('adwam-push-send'), ('adwam-weather-tick')$$,
  'The four Adwam cron jobs are active'
);
select throws_ok($$select adwam_private.call_scheduled_job('unexpected')$$,
  '22023', 'Unknown scheduled job', 'Cron cannot call arbitrary endpoints');

delete from vault.secrets where name in ('adwam_project_url', 'adwam_job_key');
select is(adwam_private.call_scheduled_job('weather-tick'), null::bigint, 'Cron waits until Vault is provisioned');
do $$
begin
  perform vault.create_secret('https://example.com', 'adwam_project_url');
  perform vault.create_secret('synthetic-job-key', 'adwam_job_key');
end;
$$;

create temporary table job_request as select adwam_private.call_scheduled_job('weather-tick') as id;
select is((select url from net.http_request_queue join job_request using (id)),
  'https://example.com/functions/v1/weather-tick', 'Cron uses the configured endpoint');
select is((select headers ->> 'Authorization' from net.http_request_queue join job_request using (id)),
  'Bearer synthetic-job-key', 'Cron sends the job key in the authorization header');

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-000000008071', true), ('00000000-0000-0000-0000-000000008072', true);
insert into public.areas (id, latitude, longitude, time_zone) values
  ('501:-14', 50.1, -1.4, 'UTC'), ('502:-14', 50.2, -1.4, 'UTC');
insert into public.installs (id, platform, app_version, content_version, country_code, time_zone,
  quiet_start, quiet_end, area_id, hijri_method, hijri_shift, notifications_allowed, last_seen_at
) values
  ('00000000-0000-0000-0000-000000008071', 'android', '0.1.0', '2026.11.21', 'GB', 'UTC',
    0, 0, '501:-14', 'umalqura', 0, true, now() - interval '121 days'),
  ('00000000-0000-0000-0000-000000008072', 'android', '0.1.0', '2026.11.21', 'GB', 'UTC',
    0, 0, '502:-14', 'umalqura', 0, true, now());

set local role authenticated;
select throws_ok('select public.server_cleanup_v1()', '42501', null, 'An app session cannot invoke cleanup');
set local role service_role;
select ok(public.server_cleanup_v1() ? 'runId', 'Cleanup logs its counts');
select is((select count(*) from public.installs where id in
  ('00000000-0000-0000-0000-000000008071', '00000000-0000-0000-0000-000000008072')), 1::bigint,
  'The active install is retained');
select results_eq(
  $$select id from public.areas where id in ('501:-14', '502:-14') order by id$$,
  $$values ('502:-14'::text)$$, 'The unused area is removed'
);

select * from finish();
rollback;
