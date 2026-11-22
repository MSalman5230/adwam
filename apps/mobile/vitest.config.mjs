import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@adwam/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) },
  },
});
