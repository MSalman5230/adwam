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

const cronQuery = `
  select job.jobname, job.active, run.status, run.start_time
  from cron.job as job
  left join lateral (
    select status, start_time from cron.job_run_details
    where jobid = job.jobid order by runid desc limit 1
  ) as run on true
  where job.jobname in ('adwam-weather-tick', 'adwam-push-send', 'adwam-push-receipts', 'adwam-cleanup')
  order by job.jobname
`;

const networkStatusQuery = `
  select status_code, count(*)::integer as responses
  from net._http_response
  where created >= now() - interval '20 minutes'
  group by status_code order by status_code
`;

const cronJobs = ['adwam-weather-tick', 'adwam-push-send', 'adwam-push-receipts', 'adwam-cleanup'];
const cronStatuses = ['starting', 'connecting', 'sending', 'running', 'succeeded', 'failed'];

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
  if (failures.length) failures.push(...await describeSchedulerSetup(queryDatabase));
  const calls = Number(row.calls_today);
  const budget = Number(row.daily_budget);
  if (!Number.isSafeInteger(calls) || !Number.isSafeInteger(budget)) failures.push('Open-Meteo usage could not be read.');
  else if (calls > budget || (budget > 0 && calls === budget)) failures.push(`Open-Meteo usage reached ${calls} of ${budget} calls today.`);
  return failures;
}

async function describeSchedulerSetup(queryDatabase) {
  const unavailable = 'The health check could not verify staging Vault setup. Check the scheduler setup in the incident runbook.';
  const [vault] = await diagnosticRows(queryDatabase, vaultQuery) ?? [];
  if (typeof vault?.has_project_url !== 'boolean' || typeof vault.has_job_key !== 'boolean') return [unavailable];
  const missing = [];
  if (!vault.has_project_url) missing.push('adwam_project_url');
  if (!vault.has_job_key) missing.push('adwam_job_key');
  if (missing.length) return [`Missing staging Vault entries: ${missing.join(', ')}. Run supabase/setup-staging-jobs.sql and set ADWAM_JOB_KEY for the Edge Functions.`];
  const [cron, network] = await Promise.all([
    diagnosticRows(queryDatabase, cronQuery),
    diagnosticRows(queryDatabase, networkStatusQuery),
  ]);
  return [
    'Staging Vault entries are present.',
    cron ? cronJobs.map((job) => describeCron(job, cron)).join(' ') : 'Cron run metadata is unavailable.',
    describeNetwork(network),
  ];
}

async function diagnosticRows(queryDatabase, query) {
  try {
    const response = await queryDatabase(query);
    if (response.ok) {
      const rows = await response.json();
      return Array.isArray(rows) ? rows : null;
    }
    await response.body?.cancel();
  } catch {
    // Keep the original health failure even if optional diagnostics cannot load.
  }
  return null;
}

function describeCron(job, rows) {
  const row = rows.find((entry) => entry?.jobname === job);
  if (!row) return `${job} did not appear in cron.job.`;
  if (row.active !== true) return `${job} is not active.`;
  const started = Date.parse(row.start_time);
  if (!Number.isFinite(started)) return `${job} is active but no cron run was recorded.`;
  const status = cronStatuses.includes(row.status) ? row.status : 'unknown';
  return `${job} last cron run: ${status} at ${new Date(started).toISOString()}.`;
}

function describeNetwork(rows) {
  if (!rows) return 'pg_net response status counts are unavailable.';
  const statuses = rows.flatMap((row) => {
    if (!Number.isSafeInteger(row?.responses) || row.responses < 1) return [];
    const status = row.status_code === null ? 'no HTTP status' : (Number.isInteger(row.status_code)
      && row.status_code >= 100 && row.status_code <= 599) ? `HTTP ${row.status_code}` : null;
    return status ? [`${status} × ${row.responses}`] : [];
  });
  return statuses.length ? `Staging-wide pg_net responses in the last 20 minutes: ${statuses.join(', ')}.`
    : 'No pg_net response was recorded in the last 20 minutes.';
}
