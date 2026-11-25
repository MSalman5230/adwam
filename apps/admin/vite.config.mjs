import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // Production is served at /adwam/ and staging at /adwam/staging/ on GitHub Pages.
  base: process.env.ADMIN_BASE ?? '/adwam/',
  resolve: { alias: { '@adwam/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) } },
  server: { strictPort: true },
});
