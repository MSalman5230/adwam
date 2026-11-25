// Checks the release-please files before the Release workflow uses them:
// every version file agrees with the manifest, and a one-off release-as is removed once released.
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const semver = /^(\d+)\.(\d+)\.(\d+)$/;

function compare(a, b) {
  const [left, right] = [a, b].map((version) => semver.exec(version).slice(1).map(Number));
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

export function releaseConfigProblems({ config, manifest, rootPackage, mobilePackage, appConfig }) {
  const problems = [];
  const released = manifest['.'];
  if (!semver.test(released ?? '')) return ['The release manifest needs a version for the root package.'];

  const files = {
    'package.json': rootPackage.version,
    'apps/mobile/package.json': mobilePackage.version,
    'apps/mobile/app.config.ts': /version: '([^']+)', \/\/ x-release-please-version/.exec(appConfig)?.[1],
  };
  for (const [file, version] of Object.entries(files)) {
    if (version !== released) problems.push(`${file} has version ${version ?? 'none'}, but the manifest has ${released}.`);
  }

  const releaseAs = config.packages?.['.']?.['release-as'];
  if (releaseAs !== undefined) {
    if (!semver.test(releaseAs)) problems.push(`release-as must be a version such as 1.0.0, not ${releaseAs}.`);
    else if (compare(releaseAs, released) <= 0) {
      problems.push(`Version ${released} is released, so remove "release-as": "${releaseAs}" from release-please-config.json.`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const problems = releaseConfigProblems({
    config: JSON.parse(read('release-please-config.json')),
    manifest: JSON.parse(read('.release-please-manifest.json')),
    rootPackage: JSON.parse(read('package.json')),
    mobilePackage: JSON.parse(read('apps/mobile/package.json')),
    appConfig: read('apps/mobile/app.config.ts'),
  });
  for (const problem of problems) process.stderr.write(`${problem}\n`);
  if (problems.length) process.exitCode = 1;
  else process.stdout.write('The release settings and version files agree.\n');
}
