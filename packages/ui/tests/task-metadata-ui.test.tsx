import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createInitialState, reduce } from '../src/mock/model.js';
import { TaskDetail } from '../src/workbench/pages/TaskDetailPage.jsx';
import { TaskList } from '../src/workbench/pages/TaskListPage.jsx';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { createMockWorkbenchRuntime } from '../src/mock';

function metadataScenario() {
  let model = reduce(createInitialState(), {
    type: 'CREATE_TASK',
    title: '元数据任务',
    project: '成员中心',
  });
  const id = model.tasks.at(-1).id;
  model = reduce(model, {
    type: 'SAVE_TASK_BASICS',
    taskId: id,
    title: '元数据任务',
    taskType: 'uncategorized',
    description: '',
    priority: 'p1',
    owner: 'self',
  });
  const task = model.tasks.find((item: { id: string }) => item.id === id);
  const render = (node: ReactNode) =>
    renderToStaticMarkup(
      <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
        <I18nProvider initialLocale="zh-CN">{node}</I18nProvider>
      </WorkbenchRuntimeProvider>,
    );
  return {
    model,
    task,
    renderDetail: () =>
      render(
        <TaskDetail
          ctx={{
            model,
            task,
            taskOrigin: 'personal',
            modal: null,
            stage: task.stage,
            setModal: vi.fn(),
            setStage: vi.fn(),
            run: vi.fn(),
            act: vi.fn(),
            openTask: vi.fn(),
            go: vi.fn(),
            showOrigin: vi.fn(),
          }}
          saved
        />,
      ),
    renderList: () =>
      render(
        <TaskList
          ctx={{ model, openTask: vi.fn(), setModal: vi.fn() }}
          filter="all"
          setFilter={vi.fn()}
          listUi={{ query: '', source: 'all', taskType: 'all', status: 'all', board: false }}
          setListUi={vi.fn()}
        />,
      ),
  };
}

describe('task metadata presentation', () => {
  it('shows priority, owner, creation and modification times in task detail', () => {
    const s = metadataScenario();
    const html = s.renderDetail();
    expect(html).toContain('P1');
    expect(html).toContain('负责人');
    expect(html).toContain('我');
    expect(html).toContain('创建于');
    expect(html).toContain('最近修改');
    expect(html).toContain('dateTime="' + s.task.createdAt + '"');
    expect(html).toContain('dateTime="' + s.task.updatedAt + '"');
  });

  it('shows priority column plus owner and timestamps in the task list', () => {
    const s = metadataScenario();
    const html = s.renderList();
    expect(html).toContain('优先级');
    expect(html).toContain('负责人');
    expect(html).toContain('创建于');
    expect(html).toContain('最近修改');
    expect(html).toContain('P1');
    expect(html).toContain('元数据任务');
  });
});
