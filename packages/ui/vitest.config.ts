import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'] },
  resolve: { alias: { '@reed/client': fileURLToPath(new URL('../client/src/index.ts', import.meta.url)) } },
});
