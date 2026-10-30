import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { TaskDetail } from '../src/workbench/pages/TaskDetailPage.jsx';
import { Dialogs } from '../src/workbench/Dialogs.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { createMockWorkbenchRuntime } from '../src/mock';

describe('editing a task artifact version', () => {
  it.each(['not_run', 'failed'])(
    'keeps %s as the true outcome and asks for explicit work coverage',
    (outcome) => {
      const runtime = createMockWorkbenchRuntime();
      let model: any = runtime.createInitialState();
      model = runtime.reduce(model, { type: 'CREATE_TASK', title: '真实结果' });
      const id = model.tasks.at(-1).id;
      model = runtime.reduce(model, { type: 'START_TASK', taskId: id });
      model = runtime.reduce(model, {
        type: 'ADD_TASK_ARTIFACT',
        taskId: id,
        title: '报告.md',
        body: '旧版实际结果',
        outcome,
        coverageComplete: false,
      });
      const task = model.tasks.at(-1);
      const doc = task.docs.at(-1);
      const ctx = {
        task,
        model,
        modal: { type: 'edit-document', sourceDocId: doc.id, kind: doc.kind },
        setModal: vi.fn(),
        run: vi.fn(),
      };
      const html = renderToStaticMarkup(
        <WorkbenchRuntimeProvider runtime={runtime}>
          <I18nProvider initialLocale="zh-CN">
            <Dialogs ctx={ctx} />
          </I18nProvider>
        </WorkbenchRuntimeProvider>,
      );
      expect(html).toContain('真实执行结果');
      expect(html).toMatch(new RegExp(`value="${outcome}"[^>]*selected`));
      expect(html).toContain('已完成约定的必要工作与执行覆盖');
      expect(html).toContain('旧版实际结果');
    },
  );
});

it('failed execution exposes retry and explicit internal rework without changing task scope', () => {
  const runtime = createMockWorkbenchRuntime();
  const model: any = runtime.createInitialState();
  const task = model.tasks.find((item: any) => item.id === 'REQ-1039');
  const ctx = {
    task,
    model,
    stage: task.stage,
    setStage: vi.fn(),
    setModal: vi.fn(),
    run: vi.fn(),
    go: vi.fn(),
  };
  const html = renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={runtime}>
      <I18nProvider initialLocale="zh-CN">
        <TaskDetail ctx={ctx} saved />
      </I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
  expect(html).toContain('准备重试');
  expect(html).toContain('返工此步骤');
});

it('completed task history exposes its frozen review and decision without another acceptance', () => {
  const runtime = createMockWorkbenchRuntime();
  const model: any = runtime.createInitialState();
  const task = model.tasks.find((item: any) => item.id === 'LOCAL-8');
  const ctx = { task, model, modal: { type: 'task-history' }, setModal: vi.fn(), run: vi.fn() };
  const html = renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={runtime}>
      <I18nProvider initialLocale="zh-CN">
        <Dialogs ctx={ctx} />
      </I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
  expect(html).toContain(task.completions[0].id);
  expect(html).toContain(task.reviews[0].goal);
  expect(html).toContain('任务交付说明.md');
  expect(html).not.toContain('确认全部条件并完成');
});
