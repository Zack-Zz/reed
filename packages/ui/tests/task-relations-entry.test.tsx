import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkbenchRoot } from '../src';
import { createMockWorkbenchRuntime } from '../src/mock';
afterEach(() => vi.unstubAllGlobals());
it('opens the relation preview route with the shared workbench and keeps mock data isolated', () => {
  vi.stubGlobal('location', { search: '?view=relations' });
  const runtime = createMockWorkbenchRuntime({
    storage: { getItem: () => null, setItem: vi.fn() },
  });
  const html = renderToStaticMarkup(<WorkbenchRoot runtime={runtime} initialLocale="zh-CN" />);
  expect(html).toContain('relations-viewport');
  expect(html).toContain('任务关系');
  expect(html).toContain('成员导入失败后自动补偿');
});
