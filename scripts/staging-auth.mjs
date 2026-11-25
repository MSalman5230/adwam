import process from 'node:process';

const { SUPABASE_PROJECT_ID: project, SUPABASE_ACCESS_TOKEN: token } = process.env;
if (!project || !/^[a-z0-9]{20}$/.test(project) || !token) throw new Error('Staging Auth configuration is unavailable.');

const url = `https://api.supabase.com/v1/projects/${project}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const current = await globalThis.fetch(url, { headers });
if (current.status === 403) {
  process.stderr.write('The scoped token cannot read staging Auth. Configure the admin Site URL, Redirect URLs and anonymous sign-in in Supabase.\n');
} else {
  if (!current.ok) throw new Error(`Could not read staging Auth (${current.status}).`);
  const config = await current.json();
  const adminUrl = 'https://msalman5230.github.io/adwam/';
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
      process.stderr.write(`The scoped token cannot update staging Auth. Configure ${settings.join(', ')} in Supabase.\n`);
    } else if (!updated.ok) {
      throw new Error(`Could not update staging Auth (${updated.status}).`);
    } else {
      process.stdout.write('Staging anonymous sign-in and admin redirect settings are configured.\n');
    }
  } else {
    process.stdout.write('Staging Auth already matches the app and admin page.\n');
  }
}
