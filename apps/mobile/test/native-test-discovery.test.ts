import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { basename } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);

it('discovers the native Jest suites using the default config', () => {
  const output = execFileSync(process.execPath, [require.resolve('jest/bin/jest'), '--listTests', '--runInBand', '--json'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    encoding: 'utf8',
  });
  const tests = JSON.parse(output) as string[];
  expect(tests.map((path) => basename(path))).toContain('about.jest.tsx');
});
