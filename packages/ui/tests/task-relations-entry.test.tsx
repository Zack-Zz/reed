import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkbenchRoot } from '../src';
import { TaskRelationsPage } from '../src/workbench/pages/TaskRelationsPage';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { I18nProvider } from '../src/workbench/i18n.jsx';
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
  expect(html).toContain('relations-toolbar');
});
it('renders the embedded relation canvas without the page chrome', () => {
  const runtime = createMockWorkbenchRuntime();
  const model: any = runtime.createInitialState();
  const task: any = model.tasks.find((item: any) => item.id === 'REQ-1042');
  const html = renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={runtime}>
      <I18nProvider initialLocale="zh-CN">
        <TaskRelationsPage
          ctx={{
            task,
            model,
            setModal: vi.fn(),
            openTask: vi.fn(),
            showRelationExample: vi.fn(),
            openRelations: vi.fn(),
          }}
          relationsUi={{
            rootId: 'REQ-1042',
            collapsed: [],
            zoom: 1,
            pan: { x: 16, y: 16 },
            showRelated: true,
            showDependencies: true,
          }}
          setRelationsUi={vi.fn()}
          embedded
        />
      </I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
  expect(html).toContain('relations-viewport');
  expect(html).toContain('relation-zoom-controls');
  expect(html).not.toContain('page-heading');
  expect(html).not.toContain('relations-toolbar');
  expect(html).not.toContain('relation-breadcrumbs');
  expect(html).not.toContain('relation-auxiliary');
  expect(html).not.toContain('relation-boundary-note');
});
