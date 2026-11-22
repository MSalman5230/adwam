import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const mode = process.argv[2];
if (!['test', 'tick', 'simulate-rain'].includes(mode)) throw new Error('Unknown local server command');

const status = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/d', '/c', 'supabase status -o env'], { encoding: 'utf8' })
  : spawnSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' });
if (status.status !== 0) throw new Error('Start local Supabase with pnpm db:start first.');
const values = Object.fromEntries(Array.from(status.stdout.matchAll(/^([A-Z_]+)="([^"\r\n]*)"\s*$/gm),
  ([, name, value]) => [name, value]));
if (values.API_URL !== 'http://127.0.0.1:54321' || !values.ANON_KEY || !values.SERVICE_ROLE_KEY) {
  throw new Error('Expected the Adwam local Supabase API at port 54321.');
}

const env = {
  ...process.env,
  SUPABASE_URL: values.API_URL,
  SUPABASE_SERVICE_ROLE_KEY: values.SERVICE_ROLE_KEY,
  ADWAM_LOCAL_ANON_KEY: values.ANON_KEY,
  ADWAM_JOB_KEY: randomBytes(32).toString('hex'),
  SENTRY_DSN: '',
  EXPO_ACCESS_TOKEN: '',
};
const args = [
  mode === 'test' ? 'test' : 'run',
  '--config', 'supabase/functions/weather-tick/deno.json', '--no-lock', '--allow-env',
  mode === 'tick' ? '--allow-net=127.0.0.1,api.open-meteo.com' : '--allow-net=127.0.0.1',
  mode === 'test' ? 'supabase/function-tests' : 'scripts/local-server.ts',
];
if (mode !== 'test') args.push(mode);
const run = spawnSync('deno', args, { env, stdio: 'inherit' });
if (run.error) throw new Error('Install Deno before running local server commands.');
process.exitCode = run.status ?? 1;
