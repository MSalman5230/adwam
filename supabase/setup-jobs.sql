-- Run once in each project's SQL Editor after its first deploy of the job functions.
-- Set the project reference, and turn on debug tools only for staging. The generated key stays in Vault.
do $$
declare
  project_url text := 'https://REPLACE-WITH-PROJECT-REF.supabase.co';
  existing_url text;
begin
  if project_url !~ '^https://[a-z0-9]{20}\.supabase\.co$' then
    raise exception 'Set the Supabase project URL first';
  end if;
  select decrypted_secret into existing_url from vault.decrypted_secrets where name = 'adwam_project_url';
  if existing_url is not null and existing_url <> project_url then
    raise exception 'Vault already points to a different project';
  end if;
  if existing_url is null then
    perform vault.create_secret(project_url, 'adwam_project_url', 'URL for Adwam scheduled Edge Functions');
  end if;
  if not exists (select 1 from vault.secrets where name = 'adwam_job_key') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'adwam_job_key', 'Bearer key for Adwam scheduled Edge Functions');
  end if;
end;
$$;

-- true on staging, false on production.
update public.app_config set debug_tools_enabled = false where singleton;
