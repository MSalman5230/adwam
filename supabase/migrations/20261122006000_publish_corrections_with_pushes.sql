drop function public.publish_correction_v1(uuid);

create function public.server_publish_correction_v1(
  correction_id uuid, requester_id uuid, expected_country text, expected_year integer,
  expected_month integer, expected_date date, umalqura_start date, civil_start date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.hijri_corrections%rowtype;
  instant timestamptz;
  queued integer;
begin
  perform 1 from public.admins as admin join auth.users as actor on actor.id = admin.id
  where admin.id = requester_id and actor.is_anonymous is false for key share of admin;
  if not found then
    raise exception using errcode = '42501', message = 'Correction admin required';
  end if;

  if expected_country is null or expected_year is null or expected_month is null or expected_date is null
    or umalqura_start is null or civil_start is null or not isfinite(umalqura_start) or not isfinite(civil_start)
  then
    raise exception using errcode = '22023', message = 'Correction and both calculated month starts are required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':', expected_country, expected_year, expected_month), 0));
  select * into target from public.hijri_corrections where id = correction_id for update;
  if not found or target.status = 'withdrawn' then
    raise exception using errcode = '22023', message = 'Correction must be a draft';
  end if;
  if (target.country_code, target.hijri_year, target.hijri_month, target.starts_on)
    is distinct from (expected_country, expected_year, expected_month, expected_date)
  then
    raise exception using errcode = '40001', message = 'Correction draft changed';
  end if;
  if target.status = 'published' then
    return jsonb_build_object('correction', adwam_private.admin_correction_payload(target), 'queued', 0);
  end if;

  instant := clock_timestamp();
  update public.hijri_corrections set status = 'withdrawn', withdrawn_at = instant
  where country_code = target.country_code and hijri_year = target.hijri_year and hijri_month = target.hijri_month
    and status = 'published';
  update public.hijri_corrections set status = 'published', published_at = instant
  where id = correction_id returning * into target;

  insert into public.push_outbox (install_id, correction_id, channel, scheduled_at)
  select install.id, target.id, case when adwam_private.quiet_at(instant, install.time_zone, install.quiet_start, install.quiet_end)
    then 'corrections-silent' else 'corrections' end, instant
  from public.installs as install
  where install.country_code = target.country_code and install.notifications_allowed and install.push_token is not null
    and (case install.hijri_method when 'civil' then civil_start else umalqura_start end) - install.hijri_shift <> target.starts_on
  on conflict do nothing;
  get diagnostics queued = row_count;

  return jsonb_build_object('correction', adwam_private.admin_correction_payload(target), 'queued', queued);
end;
$$;

revoke all on function public.server_publish_correction_v1(uuid, uuid, text, integer, integer, date, date, date)
  from public, anon, authenticated;
grant execute on function public.server_publish_correction_v1(uuid, uuid, text, integer, integer, date, date, date)
  to service_role;
