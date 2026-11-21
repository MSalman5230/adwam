import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { log } from 'node:console';
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { env, execPath } from 'node:process';

const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve('expo/package.json')), 'bin/cli');
const temp = realpathSync(tmpdir());
const destination = mkdtempSync(join(temp, 'adwam-route-check-'));

function exportAndroid(variant) {
  const directory = join(destination, variant);
  const result = spawnSync(execPath, [
    cli, 'export', '--platform', 'android', '--source-maps', 'external', '--max-workers', '2', '--output-dir', directory,
  ], { env: { ...env, APP_VARIANT: variant, EXPO_NO_DOTENV: '1' }, stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Android export failed for ${variant}`);

  const bundleDirectory = join(directory, '_expo', 'static', 'js', 'android');
  const maps = readdirSync(bundleDirectory).filter((name) => name.endsWith('.map'));
  assert.ok(maps.length > 0, `Missing Android source map for ${variant}`);
  const sources = maps.flatMap((name) => JSON.parse(readFileSync(join(bundleDirectory, name), 'utf8')).sources)
    .map((name) => name.replaceAll('\\', '/'));
  assert.ok(sources.some((name) => name.endsWith('/app/(tabs)/today.tsx')), `Missing Today route for ${variant}`);
  return sources.filter((name) => name.includes('/app/debug/'));
}

try {
  const preview = exportAndroid('preview');
  for (const name of ['index.tsx', 'clock.tsx', 'components.tsx', 'theme.tsx']) {
    assert.ok(preview.some((source) => source.endsWith(`/app/debug/${name}`)), `Missing preview route ${name}`);
  }
  assert.deepEqual(exportAndroid('production'), [], 'Debug routes are bundled in the production variant');
  log('Preview includes the debug routes. The production bundle excludes them.');
} finally {
  assert.equal(dirname(realpathSync(destination)), temp);
  rmSync(destination, { recursive: true, force: true });
}
