import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WorkbenchRoot } from '../src/index';
import { createMockWorkbenchRuntime } from '../src/mock/index';

describe('formal shared workbench composition', () => {
  it.each(['en', 'zh-CN'] as const)(
    'renders the selected locale without browser globals or external IO: %s',
    (locale) => {
      const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
      const fetch = vi.fn(() => {
        throw new Error('No external IO during preview rendering');
      });
      vi.stubGlobal('fetch', fetch);
      try {
        const html = renderToStaticMarkup(
          <WorkbenchRoot
            runtime={createMockWorkbenchRuntime({ storage })}
            initialLocale={locale}
          />,
        );
        expect(html).toContain('成员导入失败后自动补偿');
        expect(html).toContain(locale === 'en' ? 'In review' : '评审中');
        expect(html).toContain(locale === 'en' ? 'Needs attention' : '待我处理');
        expect(storage.setItem).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
});
