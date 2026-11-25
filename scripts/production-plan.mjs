// Checks shared by the production plan jobs. They read, and never change, staging or production.
import { readdirSync } from 'node:fs';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const unfinished = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);

// Resolves once Deploy staging has succeeded on `sha`, or on a later master commit that contains it.
// Waits while a matching deploy is still running, because a Release PR's merge starts both at once.
export async function waitForStagingDeploy({ github, context, sha, timeoutMs = 45 * 60_000, pollMs = 30_000 }) {
  const repository = context.repo;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { data } = await github.rest.actions.listWorkflowRuns({
      ...repository, workflow_id: 'deploy-staging.yml', branch: 'master', event: 'push', per_page: 30,
    });
    const runs = data.workflow_runs ?? [];
    const exact = runs.filter((run) => run.head_sha === sha);
    const done = exact.find((run) => run.conclusion === 'success');
    if (done) return { url: done.html_url, sha };

    for (const run of runs.filter((item) => item.conclusion === 'success' && item.head_sha !== sha)) {
      const { data: comparison } = await github.rest.repos.compareCommitsWithBasehead({
        ...repository, basehead: `${sha}...${run.head_sha}`,
      });
      if (comparison.status === 'ahead') return { url: run.html_url, sha: run.head_sha };
    }

    if (!runs.some((run) => unfinished.has(run.status))) {
      const outcome = exact.length ? `ended as ${exact.map((run) => run.conclusion).join(', ')}` : 'never ran';
      throw new Error(`Deploy staging ${outcome} for ${sha.slice(0, 7)}, so this commit can't go to production yet.`);
    }
    if (Date.now() + pollMs > deadline) throw new Error(`Deploy staging hasn't finished for ${sha.slice(0, 7)}.`);
    await sleep(pollMs);
  }
}

// Migration files in supabase/migrations that the target database hasn't recorded yet.
export function pendingMigrations(files, appliedVersions) {
  const applied = new Set(appliedVersions);
  return files
    .filter((file) => /^\d{14}_[\w-]+\.sql$/.test(file))
    .filter((file) => !applied.has(file.slice(0, 14)))
    .sort();
}

export function migrationFiles(directory = new URL('../supabase/migrations/', import.meta.url)) {
  return readdirSync(directory).filter((file) => file.endsWith('.sql'));
}

// Reads the applied versions with the read-only token, or returns null if the token can't.
export async function appliedMigrationVersions() {
  const { SUPABASE_PROJECT_ID: project, SUPABASE_ACCESS_TOKEN: token } = process.env;
  if (!/^[a-z0-9]{20}$/.test(project ?? '') || !token) return null;
  try {
    const response = await globalThis.fetch(`https://api.supabase.com/v1/projects/${project}/database/query/read-only`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'select version from supabase_migrations.schema_migrations order by version' }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }
    const rows = await response.json();
    return Array.isArray(rows) ? rows.map((row) => String(row?.version)) : null;
  } catch {
    return null;
  }
}

export function describeMigrations(pending) {
  if (!pending) return 'The read-only token could not list the applied migrations, so check them in Supabase.';
  if (!pending.length) return 'No new migrations.';
  return `New migrations, applied before the app changes:\n${pending.map((file) => `- \`${file}\``).join('\n')}`;
}
