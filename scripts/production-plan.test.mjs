import assert from 'node:assert/strict';
import process from 'node:process';
import { test } from 'node:test';
import {
  appliedMigrationVersions, describeMigrations, migrationFiles, pendingMigrations, waitForStagingDeploy,
} from './production-plan.mjs';

const context = { repo: { owner: 'MSalman5230', repo: 'adwam' } };
const sha = 'a'.repeat(40);
const later = 'b'.repeat(40);

function fakeGitHub(pages, comparisons = {}) {
  let call = 0;
  return {
    calls: () => call,
    rest: {
      actions: {
        listWorkflowRuns: async (args) => {
          assert.equal(args.workflow_id, 'deploy-staging.yml');
          assert.equal(args.branch, 'master');
          const page = pages[Math.min(call, pages.length - 1)];
          call += 1;
          return { data: { workflow_runs: page } };
        },
      },
      repos: {
        compareCommitsWithBasehead: async ({ basehead }) => ({ data: { status: comparisons[basehead] ?? 'diverged' } }),
      },
    },
  };
}

const run = (head_sha, status, conclusion) => ({ head_sha, status, conclusion, html_url: `https://example.test/${head_sha.slice(0, 3)}` });

test('a successful staging deploy of the same commit passes at once', async () => {
  const github = fakeGitHub([[run(sha, 'completed', 'success')]]);
  assert.deepEqual(await waitForStagingDeploy({ github, context, sha, pollMs: 1 }), { url: 'https://example.test/aaa', sha });
});

test('a running staging deploy is waited for', async () => {
  const github = fakeGitHub([[run(sha, 'in_progress', null)], [run(sha, 'completed', 'success')]]);
  await waitForStagingDeploy({ github, context, sha, pollMs: 1 });
  assert.equal(github.calls(), 2);
});

test('a later successful deploy that contains the commit also passes', async () => {
  const github = fakeGitHub([[run(later, 'completed', 'success'), run(sha, 'completed', 'cancelled')]], {
    [`${sha}...${later}`]: 'ahead',
  });
  assert.deepEqual(await waitForStagingDeploy({ github, context, sha, pollMs: 1 }), { url: 'https://example.test/bbb', sha: later });
});

test('a failed staging deploy stops the plan', async () => {
  const github = fakeGitHub([[run(sha, 'completed', 'failure')]]);
  await assert.rejects(waitForStagingDeploy({ github, context, sha, pollMs: 1 }), /ended as failure/);
});

test('a commit staging never deployed stops the plan', async () => {
  const github = fakeGitHub([[run(later, 'completed', 'success')]], { [`${sha}...${later}`]: 'diverged' });
  await assert.rejects(waitForStagingDeploy({ github, context, sha, pollMs: 1 }), /never ran/);
});

test('waiting gives up at the deadline', async () => {
  const github = fakeGitHub([[run(sha, 'queued', null)]]);
  await assert.rejects(waitForStagingDeploy({ github, context, sha, pollMs: 5, timeoutMs: 1 }), /hasn't finished/);
});

test('pending migrations are the files the database has not recorded', () => {
  const files = ['20261122001000_b.sql', '20261122000000_a.sql', 'README.md', '20261201000000_c.sql'];
  assert.deepEqual(pendingMigrations(files, ['20261122000000', '20261122001000']), ['20261201000000_c.sql']);
  assert.deepEqual(pendingMigrations(files, []), ['20261122000000_a.sql', '20261122001000_b.sql', '20261201000000_c.sql']);
});

test('the repository migrations follow the timestamp naming', () => {
  const files = migrationFiles();
  assert.ok(files.length > 0);
  assert.deepEqual(pendingMigrations(files, []).length, files.length);
});

test('applied versions are read with the read-only query, and failures return null', async (t) => {
  process.env.SUPABASE_PROJECT_ID = 'abcdefghijklmnopqrst';
  process.env.SUPABASE_ACCESS_TOKEN = 'test-fixture';
  const fetch = t.mock.method(globalThis, 'fetch', (url, options) => {
    assert.match(url, /database\/query\/read-only$/);
    assert.match(JSON.parse(options.body).query, /supabase_migrations\.schema_migrations/);
    return Response.json([{ version: '20261122000000' }]);
  });
  assert.deepEqual(await appliedMigrationVersions(), ['20261122000000']);
  fetch.mock.mockImplementation(() => new Response(null, { status: 403 }));
  assert.equal(await appliedMigrationVersions(), null);
});

test('the migration summary covers each case', () => {
  assert.match(describeMigrations(null), /could not list/);
  assert.equal(describeMigrations([]), 'No new migrations.');
  assert.match(describeMigrations(['20261201000000_c.sql']), /`20261201000000_c\.sql`/);
});
