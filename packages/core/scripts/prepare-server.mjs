import { execFileSync } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { env, execPath } from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { build } from 'tsup';

const root = new URL('../../../', import.meta.url);
const shared = new URL('supabase/functions/_shared/', root);
const messages = new URL('messages/', shared);
const content = new URL('packages/content/', root);
const production = env.APP_VARIANT === 'production';
const contentScript = fileURLToPath(new URL('scripts/build.ts', content));
execFileSync(execPath, [contentScript, ...(production ? ['--release'] : ['--include-review'])], { stdio: 'inherit' });

await build({
  entry: { core: fileURLToPath(new URL('../src/index.ts', import.meta.url)) },
  outDir: fileURLToPath(shared),
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  splitting: false,
  noExternal: ['adhan', 'astronomy-engine'],
  outExtension: () => ({ js: '.mjs' }),
});
await mkdir(messages, { recursive: true });
await Promise.all([
  copyFile(new URL('dist/content.json', content), new URL('content.json', shared)),
  copyFile(new URL('messages/en.json', content), new URL('en.json', messages)),
]);
