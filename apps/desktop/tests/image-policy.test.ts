import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isSafeImageUrl } from '../../../packages/ui/src/workbench/ui.jsx';

const base = JSON.parse(
  readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'),
);
const demo = JSON.parse(
  readFileSync(new URL('../src-tauri/tauri.demo.conf.json', import.meta.url), 'utf8'),
);

describe('desktop Markdown image policy', () => {
  it.each([
    ['desktop', base],
    ['demo', demo],
  ])(
    'allows the shared editor image sources in the %s build without widening script or connection sources',
    (_name, variant) => {
      const csp: string = variant.app.security.csp ?? base.app.security.csp;
      const directives = new Map(
        csp.split(';').map((entry) => {
          const [name, ...sources] = entry.trim().split(/\s+/);
          return [name, sources];
        }),
      );
      for (const url of [
        'https://images.example.invalid/a.png',
        'http://127.0.0.1:1435/a.png',
        'data:image/png;base64,iVBORw0KGgo=',
      ]) {
        expect(isSafeImageUrl(url)).toBe(true);
        expect(directives.get('img-src')).toContain(new URL(url).protocol);
      }
      expect(directives.get('default-src')).toEqual(["'self'"]);
      expect(directives.get('connect-src')).toEqual(['ipc:', 'http://ipc.localhost']);
      expect(directives.get('script-src')).toBeUndefined();
    },
  );
});
