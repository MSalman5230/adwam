// Prints a project's public Supabase URL and publishable key as PREFIX_SUPABASE_URL and PREFIX_SUPABASE_KEY.
import process from 'node:process';

const prefix = process.argv[2];
const { SUPABASE_PROJECT_ID: project, SUPABASE_ACCESS_TOKEN: token } = process.env;
if (!['VITE', 'EXPO_PUBLIC'].includes(prefix) || !project || !/^[a-z0-9]{20}$/.test(project) || !token) {
  throw new Error('Expected a Supabase project reference and its scoped access token.');
}

const response = await globalThis.fetch(`https://api.supabase.com/v1/projects/${project}/api-keys?reveal=false`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!response.ok) throw new Error(`Supabase could not list the project's API keys (${response.status}).`);
const keys = await response.json();
const key = keys.find((item) => item.type === 'publishable' && /^sb_publishable_[\w-]+$/.test(item.api_key))?.api_key;
if (!key) throw new Error('The project needs a publishable API key.');

process.stdout.write(`${prefix}_SUPABASE_URL=https://${project}.supabase.co\n${prefix}_SUPABASE_KEY=${key}\n`);
