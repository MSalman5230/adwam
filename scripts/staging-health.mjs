import process from 'node:process';

const healthQuery = `
  select
    max(finished_at) as last_tick,
    coalesce(sum(open_meteo_calls) filter (where started_at >= date_trunc('day', now(), 'UTC')), 0) as calls_today,
    (select open_meteo_daily_budget from public.app_config where singleton) as daily_budget
  from public.job_runs where job = 'weather-tick'
`;

const vaultQuery = `
  select
    exists (select 1 from vault.secrets where name = 'adwam_project_url') as has_project_url,
    exists (select 1 from vault.secrets where name = 'adwam_job_key') as has_job_key
`;

export async function stagingWeatherHealth() {
  const { SUPABASE_PROJECT_ID: project, SUPABASE_ACCESS_TOKEN: token } = process.env;
  if (!project || !/^[a-z0-9]{20}$/.test(project) || !token) return ['The staging project credentials are unavailable.'];
  const queryDatabase = (query) => globalThis.fetch(
    `https://api.supabase.com/v1/projects/${project}/database/query/read-only`,
    {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }), signal: AbortSignal.timeout(30000),
    },
  );
  const response = await queryDatabase(healthQuery);
  if (!response.ok) {
    await response.body?.cancel();
    return [`Supabase did not return the staging health query (HTTP ${response.status}).`];
  }
  const observed = await response.json();
  const row = observed[0];
  if (!row || row.calls_today == null || row.daily_budget == null) return ['The staging health query did not return its expected counts.'];
  const failures = [];
  const last = Date.parse(row.last_tick);
  if (!Number.isFinite(last)) failures.push('No completed weather tick was recorded.');
  else if (Date.now() - last > 45 * 60_000) failures.push(`The last completed weather tick was ${new Date(last).toISOString()}.`);
  if (failures.length) failures.push(await describeSchedulerSetup(queryDatabase));
  const calls = Number(row.calls_today);
  const budget = Number(row.daily_budget);
  if (!Number.isSafeInteger(calls) || !Number.isSafeInteger(budget)) failures.push('Open-Meteo usage could not be read.');
  else if (calls > budget || (budget > 0 && calls === budget)) failures.push(`Open-Meteo usage reached ${calls} of ${budget} calls today.`);
  return failures;
}

async function describeSchedulerSetup(queryDatabase) {
  const unavailable = 'The health check could not verify staging Vault setup. Check the scheduler setup in the incident runbook.';
  try {
    const response = await queryDatabase(vaultQuery);
    if (!response.ok) {
      await response.body?.cancel();
      return unavailable;
    }
    const [vault] = await response.json();
    if (typeof vault?.has_project_url !== 'boolean' || typeof vault.has_job_key !== 'boolean') return unavailable;
    const missing = [];
    if (!vault.has_project_url) missing.push('adwam_project_url');
    if (!vault.has_job_key) missing.push('adwam_job_key');
    if (missing.length) return `Missing staging Vault entries: ${missing.join(', ')}. Run supabase/setup-staging-jobs.sql and set ADWAM_JOB_KEY for the Edge Functions.`;
    return 'Staging Vault entries are present. Check the cron run and the weather-tick invocation in Supabase. HTTP 401 indicates an issue with the Edge Function job key.';
  } catch {
    return unavailable;
  }
}
