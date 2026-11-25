import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { releaseConfigProblems } from './check-release-config.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const repository = () => ({
  config: JSON.parse(read('release-please-config.json')),
  manifest: JSON.parse(read('.release-please-manifest.json')),
  rootPackage: JSON.parse(read('package.json')),
  mobilePackage: JSON.parse(read('apps/mobile/package.json')),
  appConfig: read('apps/mobile/app.config.ts'),
});

const files = (version, releaseAs) => ({
  config: { packages: { '.': releaseAs ? { 'release-as': releaseAs } : {} } },
  manifest: { '.': version },
  rootPackage: { version },
  mobilePackage: { version },
  appConfig: `    version: '${version}', // x-release-please-version\n`,
});

test('the repository release files agree', () => {
  assert.deepEqual(releaseConfigProblems(repository()), []);
});

test('the release-please config follows the release design', () => {
  const { config } = repository();
  const root = config.packages['.'];
  assert.equal(config['include-component-in-tag'], false);
  assert.equal(root['release-type'], 'node');
  for (const path of ['supabase', 'apps/admin', 'docs', '.github']) assert.ok(root['exclude-paths'].includes(path), path);
  for (const path of ['apps/mobile', 'packages']) assert.ok(!root['exclude-paths'].some((item) => path.startsWith(item)), path);
  const visible = config['changelog-sections'].filter((section) => !section.hidden).map((section) => section.type);
  assert.deepEqual(visible.sort(), ['content', 'feat', 'fix', 'perf', 'revert']);
});

test('a version file that falls behind is reported', () => {
  const input = { ...files('1.2.0'), mobilePackage: { version: '1.1.0' } };
  assert.deepEqual(releaseConfigProblems(input), ['apps/mobile/package.json has version 1.1.0, but the manifest has 1.2.0.']);
});

test('a missing version marker in the app config is reported', () => {
  const input = { ...files('1.0.0'), appConfig: "    version: '1.0.0',\n" };
  assert.match(releaseConfigProblems(input)[0], /app\.config\.ts has version none/);
});

test('release-as is allowed until that version is released', () => {
  assert.deepEqual(releaseConfigProblems(files('0.1.0', '1.0.0')), []);
  assert.deepEqual(releaseConfigProblems(files('1.0.0', '1.0.0')), [
    'Version 1.0.0 is released, so remove "release-as": "1.0.0" from release-please-config.json.',
  ]);
  assert.match(releaseConfigProblems(files('1.0.0', 'one'))[0], /must be a version/);
});
