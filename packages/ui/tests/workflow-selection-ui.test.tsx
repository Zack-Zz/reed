import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocalTaskDialog } from '../src/workbench/LocalTaskDialog';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { createMockWorkbenchRuntime } from '../src/mock';
import { TaskFlowDialogs } from '../src/workbench/TaskFlowDialogs';
const runtime = createMockWorkbenchRuntime({ storage: { getItem: () => null, setItem() {} } });
const wrap = (child: React.ReactNode, locale = 'zh-CN') =>
  renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={runtime}>
      <I18nProvider initialLocale={locale}>{child}</I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
it.each(['zh-CN', 'en'])(
  'offers an explicit optional versioned template choice during creation in %s',
  (locale) => {
    const model: any = runtime.createInitialState();
    const html = wrap(
      <LocalTaskDialog model={model} act={vi.fn()} close={vi.fn()} onCreated={vi.fn()} />,
      locale,
    );
    expect(html).toContain(locale === 'en' ? 'Workflow template (optional)' : '流程模板（可后补）');
    expect(html).toContain(locale === 'en' ? 'No internal workflow' : '无内部流程');
    expect(html).not.toContain('selection.');
  },
);
it('explains necessary work carried forward when an existing task changes workflow', () => {
  const model: any = runtime.createInitialState();
  const task = model.tasks.find((t: any) => t.id === 'REQ-1045');
  const html = wrap(
    <TaskFlowDialogs
      ctx={{ task, model, modal: { type: 'task-workflow' }, run: vi.fn(), setModal: vi.fn() }}
    />,
  );
  expect(html).toContain('原必要工作将保留在任务验收条件中');
  expect(html).toContain('变更原因');
  expect(html).toContain('流程版本');
  expect(html).not.toContain('selection.');
});
