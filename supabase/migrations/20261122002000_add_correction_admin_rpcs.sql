create function adwam_private.require_admin()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or auth.jwt() ->> 'is_anonymous' = 'true'
    or not exists (select 1 from public.admins where id = caller)
  then
    raise exception using errcode = '42501', message = 'Correction admin required';
  end if;
  return caller;
end;
$$;

create function adwam_private.admin_correction_payload(correction public.hijri_corrections)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', correction.id, 'countryCode', correction.country_code, 'year', correction.hijri_year,
    'month', correction.hijri_month, 'start', correction.starts_on, 'sourceUrl', correction.source_url,
    'status', correction.status, 'authorId', correction.author_id, 'createdAt', correction.created_at,
    'publishedAt', correction.published_at, 'withdrawnAt', correction.withdrawn_at
  );
$$;

create function public.draft_correction_v1(
  country text, year integer, month integer, starts_on date, source_url text, correction_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := adwam_private.require_admin();
  draft public.hijri_corrections%rowtype;
begin
  if country is null or country !~ '^[A-Z]{2}$'
    or year is null or year not between 1 and 9999
    or month is null or month not between 1 and 12
    or starts_on is null or not isfinite(starts_on)
    or source_url is null or length(source_url) > 2048 or source_url !~ '^https?://[^[:space:]/?#]+[^[:space:]]*$'
  then
    raise exception using errcode = '22023', message = 'Invalid correction draft';
  end if;

  if correction_id is null then
    insert into public.hijri_corrections (country_code, hijri_year, hijri_month, starts_on, source_url, author_id)
    values (country, year, month, starts_on, source_url, caller)
    returning * into draft;
  else
    update public.hijri_corrections as correction set
      country_code = country, hijri_year = year, hijri_month = month,
      starts_on = draft_correction_v1.starts_on, source_url = draft_correction_v1.source_url
    where correction.id = correction_id and correction.status = 'draft'
    returning * into draft;
    if not found then
      raise exception using errcode = '22023', message = 'Correction draft does not exist';
    end if;
  end if;
  return adwam_private.admin_correction_payload(draft);
end;
$$;

create function public.list_corrections_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform adwam_private.require_admin();
  return (
    select coalesce(jsonb_agg(adwam_private.admin_correction_payload(correction) order by correction.created_at desc, correction.id), '[]'::jsonb)
    from public.hijri_corrections as correction
  );
end;
$$;

create function public.estimate_correction_v1(correction_id uuid, umalqura_start date, civil_start date)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  correction public.hijri_corrections%rowtype;
begin
  perform adwam_private.require_admin();
  if umalqura_start is null or civil_start is null or not isfinite(umalqura_start) or not isfinite(civil_start) then
    raise exception using errcode = '22023', message = 'Both calculated month starts are required';
  end if;
  select * into correction from public.hijri_corrections where id = correction_id;
  if not found then
    raise exception using errcode = '22023', message = 'Correction does not exist';
  end if;

  return (
    select count(*) from public.installs as install
    where install.country_code = correction.country_code
      and (case install.hijri_method when 'civil' then civil_start else umalqura_start end)
        - install.hijri_shift <> correction.starts_on
  );
end;
$$;

create function public.publish_correction_v1(correction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.hijri_corrections%rowtype;
begin
  perform adwam_private.require_admin();
  select * into target from public.hijri_corrections where id = correction_id for update;
  if not found or target.status = 'withdrawn' then
    raise exception using errcode = '22023', message = 'Correction must be a draft';
  end if;
  if target.status = 'published' then return adwam_private.admin_correction_payload(target); end if;

  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':', target.country_code, target.hijri_year, target.hijri_month), 0));
  update public.hijri_corrections set status = 'withdrawn', withdrawn_at = now()
  where country_code = target.country_code and hijri_year = target.hijri_year and hijri_month = target.hijri_month
    and status = 'published';
  update public.hijri_corrections set status = 'published', published_at = now()
  where id = correction_id returning * into target;
  return adwam_private.admin_correction_payload(target);
end;
$$;

create function public.withdraw_correction_v1(correction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.hijri_corrections%rowtype;
begin
  perform adwam_private.require_admin();
  select * into target from public.hijri_corrections where id = correction_id for update;
  if not found or target.status = 'draft' then
    raise exception using errcode = '22023', message = 'Correction must have been published';
  end if;
  if target.status = 'published' then
    update public.hijri_corrections set status = 'withdrawn', withdrawn_at = now()
    where id = correction_id returning * into target;
  end if;
  return adwam_private.admin_correction_payload(target);
end;
$$;

revoke all on function public.draft_correction_v1(text, integer, integer, date, text, uuid), public.list_corrections_v1(),
  public.estimate_correction_v1(uuid, date, date), public.publish_correction_v1(uuid), public.withdraw_correction_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.draft_correction_v1(text, integer, integer, date, text, uuid), public.list_corrections_v1(),
  public.estimate_correction_v1(uuid, date, date), public.publish_correction_v1(uuid), public.withdraw_correction_v1(uuid)
  to authenticated;
