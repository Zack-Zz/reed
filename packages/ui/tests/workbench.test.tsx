import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WorkbenchRoot } from '../src/index';
import { TaskIdentity } from '../src/workbench/ui.jsx';
import { createMockWorkbenchRuntime } from '../src/mock/index';

describe('shared task identity', () => {
  it('prefers the external id and pairs it with the muted project name', () => {
    const html = renderToStaticMarkup(
      <TaskIdentity task={{ id: 'LOCAL-8', externalId: 'REQ-9', project: '成员中心' }} />,
    );
    expect(html).toContain('REQ-9');
    expect(html).toContain('<small>成员中心</small>');
    expect(html).not.toContain('LOCAL-8');
    expect(html).toContain('class="task-identity"');
  });

  it('falls back to the local id and omits an empty project', () => {
    const html = renderToStaticMarkup(<TaskIdentity task={{ id: 'LOCAL-3' }} />);
    expect(html).toContain('LOCAL-3');
    expect(html).not.toContain('<small>');
  });
});

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
        expect(html).not.toContain(locale === 'en' ? 'Needs attention' : '待我处理');
        expect(html).not.toContain(locale === 'en' ? 'My board' : '我的看板');
        expect(html).toContain(locale === 'en' ? 'Board' : '看板');
        expect(html).not.toContain(locale === 'en' ? 'Task relationships' : '任务关系');
        expect(html).toContain(locale === 'en' ? 'View graph of REQ-1042' : '查看 REQ-1042 的关系图');
        expect(storage.setItem).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
});
