import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialogs } from '../src/workbench/Dialogs.jsx';
import { TaskDetail } from '../src/workbench/pages/TaskDetailPage.jsx';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { createMockWorkbenchRuntime } from '../src/mock';
import { createInitialState } from '../src/mock/model.js';

function renderLocal(view: 'create' | 'detail' | 'context', started = false, locale = 'zh-CN') {
  const model = createInitialState();
  const task = model.tasks.find((item: { id: string }) => item.id === 'LOCAL-1');
  Object.assign(task, {
    project: '',
    repo: '',
    hasStarted: started,
    status: started ? 'in_progress' : 'todo',
    workflow: null,
    description: '先整理本地任务目标',
    references: [],
  });
  const ctx = {
    model,
    task,
    stage: 0,
    taskOrigin: 'personal',
    modal:
      view === 'create' ? { type: 'create' } : view === 'context' ? { type: 'task-context' } : null,
    setModal: vi.fn(),
    setStage: vi.fn(),
    run: vi.fn(),
    act: vi.fn(),
    openTask: vi.fn(),
    openForTask: vi.fn(),
    go: vi.fn(),
    download: vi.fn(),
    reset: vi.fn(),
    notify: vi.fn(),
  };
  return renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
      <I18nProvider initialLocale={locale}>
        {view !== 'detail' ? <Dialogs ctx={ctx} /> : <TaskDetail ctx={ctx} saved />}
      </I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('local task creation and explicit start', () => {
  it('creates from a required title with optional unassigned project and context', () => {
    const html = renderLocal('create');
    expect(html.match(/<input[^>]*name="title"[^>]*>/)?.[0]).toContain('required');
    expect(html).toContain('未归组');
    expect(html).toContain('关联上下文');
    expect(html).toContain('创建后进入待办');
  });

  it('presents status switching without requiring a repository or phase output', () => {
    const html = renderLocal('detail');
    expect(html).toContain('aria-label="切换任务状态"');
    expect(html).not.toContain('未关联仓库');
    expect(html).toContain('先整理本地任务目标');
    expect(html).toContain('class="task-menu"');
  });

  it('offers comments instead of separate review and result actions', () => {
    const html = renderLocal('detail', true);
    expect(html).toContain('添加评论');
    expect(html).not.toContain('填写处理结果');
    expect(html).not.toContain('提交任务评审');
    expect(html).not.toContain('交给 Agent');
    expect(html).not.toContain('>开始处理<');
    expect(html).not.toContain('需求尚未开始');
  });

  it('localizes the create and start experience in English', () => {
    expect(renderLocal('create', false, 'en')).toContain('Unassigned');
    expect(renderLocal('detail', false, 'en')).toContain('Change task status');
  });
});

it('editing task context uses the latest saved task instead of an old cancelled draft', () => {
  vi.stubGlobal('sessionStorage', {
    getItem: () =>
      JSON.stringify({
        title: '旧标题缓存',
        project: '',
        repo: '',
        description: '旧描述',
        references: [],
      }),
  });
  const html = renderLocal('context');
  expect(html).toContain('value="整理成员导入常见问题"');
  expect(html).not.toContain('旧标题缓存');
});
