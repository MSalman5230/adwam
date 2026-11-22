import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/adwam/',
  resolve: { alias: { '@adwam/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) } },
  server: { strictPort: true },
});
