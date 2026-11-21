import { execFileSync } from 'node:child_process';
import { error, log } from 'node:console';
import { createWriteStream, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { pipeline } from 'node:stream/promises';

const packageId = 'com.msalman5230.adwam.preview';
const blocked = [
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
];

function checkPermissions(aapt2, apk) {
  const manifest = execFileSync(aapt2, ['dump', 'permissions', apk], { encoding: 'utf8' });
  if (/^package:\s+(\S+)$/m.exec(manifest)?.[1] !== packageId) {
    throw new Error(`Expected the ${packageId} APK.`);
  }
  const permissions = new Set(Array.from(manifest.matchAll(/^uses-permission[\w-]*:\s+name='([^']+)'/gm), ([, name]) => name));
  const forbidden = blocked.filter((permission) => permissions.has(permission));
  if (forbidden.length) throw new Error(`Forbidden APK permissions: ${forbidden.join(', ')}`);
  log('Preview APK passed the location and exact-alarm permission check.');
}

async function checkBuild(aapt2) {
  let result;
  try {
    result = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    throw new Error('EAS did not return a valid build result.');
  }
  const build = Array.isArray(result) ? result[0] : result;
  const artifact = build?.artifacts?.applicationArchiveUrl ?? build?.artifacts?.buildUrl;
  if (build?.status !== 'FINISHED' || typeof artifact !== 'string' || !artifact.startsWith('https://')) {
    throw new Error('EAS did not return a finished preview APK.');
  }
  const temp = realpathSync(tmpdir());
  const directory = mkdtempSync(join(temp, 'adwam-preview-apk-'));
  try {
    const apk = join(directory, 'preview.apk');
    try {
      const response = await globalThis.fetch(artifact);
      if (!response.ok || !response.body) throw new Error(String(response.status));
      await pipeline(response.body, createWriteStream(apk));
    } catch {
      throw new Error('Could not download the preview APK from EAS.');
    }
    checkPermissions(aapt2, apk);
  } finally {
    if (dirname(realpathSync(directory)) === temp) rmSync(directory, { recursive: true, force: true });
  }
}

try {
  const [aapt2, source] = process.argv.slice(2);
  if (!aapt2 || !source) throw new Error('Provide the aapt2 executable and the APK path, or pass - to read the EAS result.');
  if (source === '-') await checkBuild(aapt2);
  else checkPermissions(aapt2, source);
} catch (failure) {
  error(failure instanceof Error ? failure.message : 'Preview APK check failed.');
  process.exitCode = 1;
}
