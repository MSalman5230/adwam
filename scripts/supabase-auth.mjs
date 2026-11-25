// Turns on anonymous app sign-in and points the admin page's magic links at ADMIN_URL,
// for the staging or production project named by ADWAM_ENVIRONMENT.
import process from 'node:process';

const { SUPABASE_PROJECT_ID: project, SUPABASE_ACCESS_TOKEN: token, ADMIN_URL: adminUrl } = process.env;
const name = process.env.ADWAM_ENVIRONMENT === 'production' ? 'production' : 'staging';
if (!project || !/^[a-z0-9]{20}$/.test(project) || !token) throw new Error(`The ${name} Auth configuration is unavailable.`);
if (!/^https:\/\/msalman5230\.github\.io\/adwam\/([a-z]+\/)?$/.test(adminUrl ?? '')) {
  throw new Error('ADMIN_URL must be an Adwam admin page on GitHub Pages, ending with a slash.');
}

const url = `https://api.supabase.com/v1/projects/${project}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const current = await globalThis.fetch(url, { headers });
if (current.status === 403) {
  process.stderr.write(`The scoped token cannot read ${name} Auth. Configure the admin Site URL, Redirect URLs and anonymous sign-in in Supabase.\n`);
} else {
  if (!current.ok) throw new Error(`Could not read ${name} Auth (${current.status}).`);
  const config = await current.json();
  const redirects = new Set((config.uri_allow_list ?? '').split(',').map((uri) => uri.trim()).filter(Boolean));
  const changes = {};
  if (config.site_url !== adminUrl) changes.site_url = adminUrl;
  if (!redirects.has(adminUrl)) changes.uri_allow_list = [...redirects, adminUrl].join(',');
  if (!config.external_anonymous_users_enabled) changes.external_anonymous_users_enabled = true;

  if (Object.keys(changes).length) {
    const updated = await globalThis.fetch(url, { method: 'PATCH', headers, body: JSON.stringify(changes) });
    await updated.body?.cancel();
    if (updated.status === 403) {
      const settings = [];
      if (changes.site_url) settings.push('the admin Site URL');
      if (changes.uri_allow_list) settings.push('the admin redirect URL');
      if (changes.external_anonymous_users_enabled) settings.push('anonymous sign-in');
      process.stderr.write(`The scoped token cannot update ${name} Auth. Configure ${settings.join(', ')} in Supabase.\n`);
    } else if (!updated.ok) {
      throw new Error(`Could not update ${name} Auth (${updated.status}).`);
    } else {
      process.stdout.write(`The ${name} anonymous sign-in and admin redirect settings are configured.\n`);
    }
  } else {
    process.stdout.write(`The ${name} Auth settings already match the app and admin page.\n`);
  }
}
