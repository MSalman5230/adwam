import assert from 'node:assert/strict';
import process from 'node:process';
import { test } from 'node:test';
import { stagingWeatherHealth } from './staging-health.mjs';

process.env.SUPABASE_PROJECT_ID = 'abcdefghijklmnopqrst';
process.env.SUPABASE_ACCESS_TOKEN = 'test-fixture';

test('a healthy weather tick does not need the Vault diagnostic', async (context) => {
  const fetch = context.mock.method(globalThis, 'fetch', () =>
    Response.json([{ last_tick: new Date().toISOString(), calls_today: 1, daily_budget: 100 }]));

  assert.deepEqual(await stagingWeatherHealth(), []);
  assert.equal(fetch.mock.callCount(), 1);
});

test('a missing tick identifies missing Vault entries without reading their values', async (context) => {
  const fetch = context.mock.method(globalThis, 'fetch', (_url, options) => {
    const { query } = JSON.parse(options.body);
    if (query.includes('public.job_runs')) {
      return Response.json([{ last_tick: null, calls_today: 0, daily_budget: 100 }]);
    }
    assert.match(query, /from vault\.secrets/);
    assert.doesNotMatch(query, /decrypted/);
    return Response.json([{ has_project_url: true, has_job_key: false }]);
  });

  const failures = await stagingWeatherHealth();
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(failures[0], 'No completed weather tick was recorded.');
  assert.match(failures[1], /^Missing staging Vault entries: adwam_job_key\./);
});

test('a denied Vault query preserves the stale tick and budget failures', async (context) => {
  const last_tick = new Date(Date.now() - 60 * 60_000).toISOString();
  context.mock.method(globalThis, 'fetch', (_url, options) =>
    options.body.includes('public.job_runs')
      ? Response.json([{ last_tick, calls_today: 100, daily_budget: 100 }])
      : new Response(null, { status: 403 }));

  const failures = await stagingWeatherHealth();
  assert.equal(failures.length, 3);
  assert.match(failures[0], /last completed weather tick/);
  assert.match(failures[1], /could not verify staging Vault setup/);
  assert.match(failures[2], /reached 100 of 100/);
});

test('configured Vault reports cron progress and aggregate HTTP statuses, never credentials', async (context) => {
  const start_time = new Date().toISOString();
  const fetch = context.mock.method(globalThis, 'fetch', (_url, options) => {
    const { query } = JSON.parse(options.body);
    assert.doesNotMatch(query, /\b(?:decrypted_secret|headers|content|command|return_message)\b/);
    if (query.includes('public.job_runs')) {
      return Response.json([{ last_tick: null, calls_today: 0, daily_budget: 100 }]);
    }
    if (query.includes('vault.secrets')) return Response.json([{ has_project_url: true, has_job_key: true }]);
    if (query.includes('cron.job_run_details')) return Response.json([
      { jobname: 'adwam-weather-tick', active: true, status: 'succeeded', start_time },
      { jobname: 'adwam-cleanup', active: false },
    ]);
    assert.match(query, /from net\._http_response/);
    return Response.json([{ status_code: 401, responses: 4 }, { status_code: null, responses: 1 }]);
  });

  const failures = await stagingWeatherHealth();
  assert.equal(fetch.mock.callCount(), 4);
  assert.equal(failures[0], 'No completed weather tick was recorded.');
  assert.equal(failures[1], 'Staging Vault entries are present.');
  assert.ok(failures[2].includes(`adwam-weather-tick last cron run: succeeded at ${start_time}.`));
  assert.match(failures[2], /adwam-cleanup is not active/);
  assert.match(failures[2], /adwam-push-send did not appear/);
  assert.equal(failures[3], 'Staging-wide pg_net responses in the last 20 minutes: HTTP 401 × 4, no HTTP status × 1.');
});

test('a failed optional query does not hide results from the other diagnostic', async (context) => {
  context.mock.method(globalThis, 'fetch', (_url, options) => {
    if (options.body.includes('public.job_runs')) {
      return Response.json([{ last_tick: null, calls_today: 0, daily_budget: 100 }]);
    }
    if (options.body.includes('vault.secrets')) return Response.json([{ has_project_url: true, has_job_key: true }]);
    if (options.body.includes('cron.job_run_details')) return new Response(null, { status: 403 });
    return Response.json([]);
  });
  assert.deepEqual(await stagingWeatherHealth(), [
    'No completed weather tick was recorded.', 'Staging Vault entries are present.',
    'Cron run metadata is unavailable.', 'No pg_net response was recorded in the last 20 minutes.',
  ]);
});
