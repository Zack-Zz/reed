import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@reed/client': fileURLToPath(new URL('../client/src/index.ts', import.meta.url)) } },
});
