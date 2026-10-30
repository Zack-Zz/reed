import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  publicDir: fileURLToPath(new URL('../../packages/ui/public', import.meta.url)),
  resolve: {
    alias: [
      { find: '@reed/ui/styles.css', replacement: fileURLToPath(new URL('../../packages/ui/src/workbench/styles.css', import.meta.url)) },
      { find: '@reed/ui/foundation.css', replacement: fileURLToPath(new URL('../../packages/ui/src/styles.css', import.meta.url)) },
      { find: '@reed/ui/mock', replacement: fileURLToPath(new URL('../../packages/ui/src/mock/index.ts', import.meta.url)) },
      { find: '@reed/ui', replacement: fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)) },
      { find: '@reed/client', replacement: fileURLToPath(new URL('../../packages/client/src/index.ts', import.meta.url)) },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    proxy: { '/core': { target: 'http://127.0.0.1:47821', rewrite: (path) => path.replace(/^\/core/, '') } },
  },
  build: { outDir: 'dist', emptyOutDir: true, rolldownOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), diagnostics: fileURLToPath(new URL('./diagnostics.html', import.meta.url)) } } },
});
