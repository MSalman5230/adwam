create table public.areas (
  id text primary key,
  latitude numeric(3, 1) not null check (latitude between -90 and 90),
  longitude numeric(4, 1) not null check (longitude >= -180 and longitude < 180),
  time_zone text not null,
  forecast jsonb check (forecast is null or jsonb_typeof(forecast) = 'object'),
  forecast_at timestamptz,
  last_rain_at timestamptz,
  next_fetch_at timestamptz not null default now(),
  check (id = (latitude * 10)::integer::text || ':' || (longitude * 10)::integer::text)
);

create table public.installs (
  id uuid primary key references auth.users (id) on delete cascade,
  push_token text,
  platform text not null check (platform in ('android', 'ios')),
  app_version text not null,
  content_version text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  time_zone text not null,
  quiet_start smallint not null check (quiet_start between 0 and 1439),
  quiet_end smallint not null check (quiet_end between 0 and 1439),
  weather_choices jsonb not null default '{}' check (jsonb_typeof(weather_choices) = 'object'),
  area_id text references public.areas (id) on delete set null,
  hijri_method text not null check (hijri_method in ('umalqura', 'civil')),
  hijri_shift smallint not null check (hijri_shift between -1 and 1),
  notifications_allowed boolean not null,
  last_seen_at timestamptz not null default now()
);

create index installs_area_idx on public.installs (area_id) where area_id is not null;
create index installs_country_idx on public.installs (country_code);
create index installs_push_token_idx on public.installs (push_token) where push_token is not null;
create index installs_last_seen_idx on public.installs (last_seen_at);
create index areas_due_idx on public.areas (next_fetch_at);

create table public.weather_events (
  id text primary key,
  area_id text not null references public.areas (id) on delete cascade,
  kind text not null check (kind in ('rain-start', 'rain-stop', 'heavy-rain', 'thunder', 'wind')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  first_rain boolean not null default false,
  push_at timestamptz,
  check (ends_at > starts_at),
  unique (area_id, kind, starts_at)
);

create index weather_events_area_end_idx on public.weather_events (area_id, ends_at);

create table public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.hijri_corrections (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  hijri_year integer not null check (hijri_year between 1 and 9999),
  hijri_month smallint not null check (hijri_month between 1 and 12),
  starts_on date not null,
  source_url text not null check (source_url ~ '^https?://[^[:space:]]+$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'withdrawn')),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  withdrawn_at timestamptz
);

create unique index hijri_corrections_published_idx
  on public.hijri_corrections (country_code, hijri_year, hijri_month)
  where status = 'published';
create index hijri_corrections_country_idx on public.hijri_corrections (country_code, status, starts_on);

create table public.push_outbox (
  id bigint generated always as identity primary key,
  install_id uuid not null references public.installs (id) on delete cascade,
  weather_event_id text references public.weather_events (id) on delete cascade,
  correction_id uuid references public.hijri_corrections (id) on delete cascade,
  channel text not null check (channel in ('weather', 'corrections', 'corrections-silent')),
  scheduled_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  claimed_at timestamptz,
  sent_at timestamptz,
  expo_receipt_id text,
  receipt_checked_at timestamptz,
  error_code text,
  check (num_nonnulls(weather_event_id, correction_id) = 1),
  check ((weather_event_id is not null) = (channel = 'weather'))
);

create unique index push_outbox_weather_once_idx
  on public.push_outbox (install_id, weather_event_id) where weather_event_id is not null;
create unique index push_outbox_correction_once_idx
  on public.push_outbox (install_id, correction_id) where correction_id is not null;
create index push_outbox_due_idx on public.push_outbox (scheduled_at) where status = 'queued';
create index push_outbox_receipts_idx on public.push_outbox (sent_at)
  where expo_receipt_id is not null and receipt_checked_at is null;

create table public.app_config (
  singleton boolean primary key default true check (singleton),
  min_app_version text not null default '0.1.0',
  weather_enabled boolean not null default true,
  debug_tools_enabled boolean not null default false,
  dry_days integer not null default 7 check (dry_days > 0),
  heavy_rain_mm_per_hour numeric not null default 7.6 check (heavy_rain_mm_per_hour > 0),
  wind_card_kmh numeric not null default 60 check (wind_card_kmh > 0),
  wind_push_kmh numeric not null default 75 check (wind_push_kmh >= wind_card_kmh),
  open_meteo_daily_budget integer not null default 10000 check (open_meteo_daily_budget between 0 and 10000)
);

insert into public.app_config default values;

create table public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  counts jsonb not null default '{}' check (jsonb_typeof(counts) = 'object'),
  open_meteo_calls integer not null default 0 check (open_meteo_calls >= 0)
);

create index job_runs_job_start_idx on public.job_runs (job, started_at desc);

alter table public.areas enable row level security;
alter table public.installs enable row level security;
alter table public.weather_events enable row level security;
alter table public.admins enable row level security;
alter table public.hijri_corrections enable row level security;
alter table public.push_outbox enable row level security;
alter table public.app_config enable row level security;
alter table public.job_runs enable row level security;

revoke all on public.areas, public.installs, public.weather_events, public.admins,
  public.hijri_corrections, public.push_outbox, public.app_config, public.job_runs from public, anon, authenticated;
grant select, insert, update, delete on public.areas, public.installs, public.weather_events, public.admins,
  public.hijri_corrections, public.push_outbox, public.app_config, public.job_runs to service_role;
revoke all on sequence public.push_outbox_id_seq, public.job_runs_id_seq from public, anon, authenticated;
grant usage, select on sequence public.push_outbox_id_seq, public.job_runs_id_seq to service_role;
