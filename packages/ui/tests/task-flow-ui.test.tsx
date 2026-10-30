import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TaskFlowDialogs } from '../src/workbench/TaskFlowDialogs';
import { getTaskReview, getTaskCompletion, taskSnapshot } from '../src/mock/task-lifecycle.js';
import { createTranslator } from '../src/workbench/i18n-core.js';
import { TaskDetail } from '../src/workbench/pages/TaskDetailPage.jsx';
import { TaskList } from '../src/workbench/pages/TaskListPage.jsx';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { createMockWorkbenchRuntime } from '../src/mock';
import { createInitialState, reduce } from '../src/mock/model.js';

function renderTask(
  status = 'todo',
  workflow = false,
  locale = 'zh-CN',
  view = 'detail',
  patch = {},
  taskOrigin = 'personal',
) {
  const model = createInitialState();
  const task = model.tasks.find((item: { id: string }) => item.id === 'LOCAL-1');
  Object.assign(task, {
    status,
    taskType: 'documentation',
    workflow: workflow
      ? {
          templateId: 'development',
          name: '研发流程',
          stepLabels: ['需求', '设计', '开发', '验证'],
        }
      : null,
    goal: '整理可复核的操作说明',
    criteria: [{ id: 'c1', text: '覆盖所有操作入口' }],
    review: null,
    ...patch,
  });
  const ctx = {
    model,
    task,
    stage: 0,
    taskOrigin,
    setModal: vi.fn(),
    setStage: vi.fn(),
    run: vi.fn(),
    openTask: vi.fn(),
    go: vi.fn(),
    showOrigin: vi.fn(),
  };
  return renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
      <I18nProvider initialLocale={locale}>
        {view === 'detail' ? (
          <TaskDetail ctx={ctx} saved />
        ) : (
          <TaskList
            ctx={ctx}
            filter="all"
            setFilter={vi.fn()}
            listUi={{ query: '', source: 'all', board: false }}
            setListUi={vi.fn()}
          />
        )}
      </I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
}

describe('unified task presentation', () => {
  it('shows task scope and criteria without a default development phase navigation', () => {
    const html = renderTask();
    expect(html).toContain('目标说明与验收条件');
    expect(html).toContain('整理可复核的操作说明');
    expect(html).toContain('覆盖所有操作入口');
    expect(html).not.toContain('aria-label="任务阶段"');
    expect(html).not.toContain('class="stage-nav"');
    expect(html).toContain('开始处理');
  });
  it('labels navigation back to the relationship canvas in full task details', () => {
    expect(renderTask('in_progress', false, 'en', 'detail', {}, 'relations')).toContain(
      '>Task relationships</button>',
    );
  });
  it('offers task-level manual artifacts and review in Processing', () => {
    const html = renderTask('in_progress');
    expect(html).toContain('提交产物');
    expect(html).toContain('提交任务评审');
    expect(html).toContain('处理记录');
    expect(html).toContain('关联资源');
  });
  it('only shows internal steps for an explicitly selected workflow', () => {
    expect(renderTask('in_progress', true)).toContain('aria-label="内部流程步骤"');
    expect(renderTask('in_progress')).not.toContain('aria-label="内部流程步骤"');
  });
  it('presents completed work with archive and reasoned reopen actions', () => {
    const html = renderTask('done');
    expect(html).toContain('归档任务');
    expect(html).toContain('重新打开任务');
    expect(html).not.toContain('>提交产物<');
  });
  it('filters task type and lifecycle separately, without a phase filter', () => {
    const html = renderTask('todo', false, 'zh-CN', 'list');
    expect(html).toContain('aria-label="任务类型筛选"');
    expect(html).toContain('aria-label="任务状态筛选"');
    expect(html).not.toContain('aria-label="阶段筛选"');
  });
  it('keeps type editable before review and read-only after completion', () => {
    expect(renderTask('todo')).toContain('aria-label="修改任务类型"');
    expect(renderTask('done')).not.toContain('aria-label="修改任务类型"');
  });
  it('retains Done while warning that completion evidence needs checking', () => {
    const html = renderTask('done', false, 'zh-CN', 'detail', {
      completions: [{ id: 'completion-1', applicability: 'pending' }],
    });
    expect(html).toContain('status-done');
    expect(html).toContain('完成依据待复核');
    expect(html).toContain('重新打开任务');
  });
  it('restores archived tasks to Done before offering a separate reopen', () => {
    const html = renderTask('archived');
    expect(html).toContain('恢复归档');
    expect(html).toContain('恢复后仍为已完成');
    expect(html).not.toContain('>重新打开任务<');
  });
  it('does not relabel an Agent review artifact as a manual submission', () => {
    const html = renderTask('in_progress', false, 'zh-CN', 'detail', {
      docs: [
        {
          id: 'agent-doc',
          title: 'Agent报告.md',
          version: 1,
          body: '待审阅的结果',
          outcome: 'review',
        },
      ],
    });
    expect(html).toContain('待审阅产物');
    expect(html).not.toContain('人工提交');
  });
  it('localizes the task-level scope and review actions', () => {
    const html = renderTask('in_progress', false, 'en');
    expect(html).toContain('Goal and acceptance criteria');
    expect(html).toContain('Submit task review');
  });
});

function renderDialog(type: string, status = 'in_progress', patch = {}, locale = 'zh-CN') {
  const model = createInitialState();
  const task = model.tasks.find((item: { id: string }) => item.id === 'LOCAL-1');
  Object.assign(task, {
    status,
    goal: '当前任务目标',
    criteria: [
      { id: 'c-one', text: '第一项必要条件' },
      { id: 'c-two', text: '第二项必要条件' },
    ],
    scopeRevision: 1,
    workflow: null,
    docs: [
      {
        id: 'artifact-1',
        title: '报告.md',
        version: 2,
        body: '可核查报告正文',
        outcome: 'failed',
        coverageComplete: true,
      },
    ],
    ...patch,
  });
  if (status === 'review')
    task.review = {
      id: 'review-one',
      status: 'submitted',
      snapshot: taskSnapshot(task),
      goal: '提交时冻结的目标',
      criteria: [
        { id: 'frozen-one', text: '冻结条件一' },
        { id: 'frozen-two', text: '冻结条件二' },
      ],
      artifacts: [
        {
          id: 'frozen-artifact',
          title: '冻结报告.md',
          version: 1,
          body: '冻结的精确版本正文',
          outcome: 'failed',
        },
      ],
    };
  const ctx = { task, model, modal: { type }, setModal: vi.fn(), run: vi.fn() };
  return renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
      <I18nProvider initialLocale={locale}>
        <TaskFlowDialogs ctx={ctx} />
      </I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
}

describe('task-level confirmation dialogs', () => {
  it('shows frozen submission details and requires an explicit checkbox for every criterion', () => {
    const html = renderDialog('task-review', 'review');
    expect(html).toContain('提交时冻结的目标');
    expect(html).toContain('冻结报告.md');
    expect(html).toContain('冻结的精确版本正文');
    expect(html).not.toContain('当前任务目标');
    expect(html).not.toContain('可核查报告正文');
    expect(html).toContain('name="frozen-one"');
    expect(html).toContain('name="frozen-two"');
    expect(html).not.toContain('checked=""');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>确认全部条件并完成/);
    expect(html).toContain('执行失败');
  });
  it.each(['task-reopen', 'task-feedback'])('requires a reason for %s', (type) => {
    const html = renderDialog(type, type === 'task-reopen' ? 'done' : 'review');
    expect(html).toMatch(/<textarea[^>]*name="reason"[^>]*required=""/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
  });
  it('shows unified missing conditions without enabling submit or leaking rule keys', () => {
    const html = renderDialog('task-review', 'in_progress', {
      goal: '',
      scopeRevision: 0,
      docs: [],
    });
    expect(html).toContain('目标已明确并保存为当前范围');
    expect(html).toContain('卡片保持原位');
    expect(html).not.toContain('task.check-');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>确认提交评审/);
  });
  it('offers optional workflow adoption with an explicit no-workflow choice', () => {
    const html = renderDialog('task-workflow');
    expect(html).toContain('无内部流程');
    expect(html).toContain('研发流程');
    expect(html).toContain('不选流程也可以人工处理');
  });
  it('keeps manual submission distinct from execution results and requires work coverage confirmation', () => {
    const html = renderDialog('task-artifact', 'in_progress', {}, 'en');
    expect(html).toContain('Manual submission');
    expect(html).toContain('Not run');
    expect(html).toContain('required work and execution coverage');
    expect(html).not.toContain('checked=""');
  });
  it('does not handle legacy context or unrelated dialogs', () => {
    expect(renderDialog('task-context')).toBe('');
    expect(renderDialog('document')).toBe('');
  });
  it('translates combined rule failures in both languages', () => {
    const keys = 'task.check-goal；task.check-artifacts';
    expect(createTranslator('zh-CN')(keys)).not.toContain('task.check-');
    expect(createTranslator('en')(keys)).not.toContain('task.check-');
  });
});

it.each(['zh-CN', 'en'])(
  'shows exact required child results in the parent review in %s',
  (locale) => {
    let model = createInitialState();
    const act = (taskId: string, type: string, fields = {}) => {
      model = reduce(model, { type, taskId, ...fields });
    };
    model = reduce(model, { type: 'CREATE_TASK', title: '待验收父任务' });
    const parentId = model.tasks.at(-1).id;
    model = reduce(model, { type: 'CREATE_TASK', title: '已交付子任务' });
    const childId = model.tasks.at(-1).id;
    act(parentId, 'LINK_TASK', {
      targetTaskId: childId,
      relationKind: 'child',
      required: true,
      confirmScopeChange: true,
    });
    for (const id of [parentId, childId]) {
      act(id, 'START_TASK');
      act(id, 'SAVE_TASK_SCOPE', { goal: '独立交付', criteria: ['完整交付'] });
      act(id, 'ADD_TASK_ARTIFACT', { title: '报告.md', body: '完整交付', coverageComplete: true });
    }
    const child = () => model.tasks.find((task: { id: string }) => task.id === childId);
    act(childId, 'SUBMIT_TASK_REVIEW', {
      expectedSnapshot: getTaskReview(model, child()).snapshot,
    });
    act(childId, 'COMPLETE_TASK', {
      expectedSnapshot: getTaskCompletion(model, child()).snapshot,
      criterionIds: child().criteria.map((c: { id: string }) => c.id),
    });
    const ctx = {
      model,
      task: model.tasks.find((task: { id: string }) => task.id === parentId),
      modal: { type: 'task-review' },
      setModal: vi.fn(),
      run: vi.fn(),
    };
    const html = renderToStaticMarkup(
      <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
        <I18nProvider initialLocale={locale}>
          <TaskFlowDialogs ctx={ctx} />
        </I18nProvider>
      </WorkbenchRuntimeProvider>,
    );
    expect(html).toContain('已交付子任务');
    expect(html).toContain(child().completions.at(-1).id);
    expect(html).toContain(locale === 'en' ? 'scope 1' : '范围 1');
    expect(html).not.toContain('relation.');
  },
);
it('shows an optional-step skip and its reason distinctly from performed work', () => {
  const html = renderTask('in_progress', false, 'zh-CN', 'detail', {
    stage: 0,
    scopeRevision: 1,
    workflow: {
      templateId: 'personal-review',
      instanceId: 'flow-one',
      version: 1,
      name: '复核流程',
      stepLabels: ['复核'],
      steps: [
        {
          id: 'optional',
          name: '复核',
          goal: '复核材料',
          instructions: '',
          outputs: [],
          checks: [],
          required: false,
          mode: 'manual',
        },
      ],
    },
    accepted: [true],
    stepSkips: [
      {
        instanceId: 'flow-one',
        stepId: 'optional',
        scopeRevision: 1,
        reason: '本次无需额外复核',
        applicability: 'valid',
      },
    ],
  });
  expect(html).toContain('已跳过');
  expect(html).toContain('本次无需额外复核');
});

it.each(['zh-CN', 'en'])(
  'retains optional-step skip decisions and reasons after workflow replacement in %s',
  (locale) => {
    const html = renderTask('in_progress', false, locale, 'detail', {
      workflowHistory: [
        {
          workflow: {
            templateId: 'old',
            instanceId: 'old-1',
            name: '原复核流程',
            version: 1,
            stepLabels: ['可选复核'],
            steps: [{ id: 'review', required: false }],
          },
          accepted: [true],
          stage: 0,
          reason: '改为直接处理',
          stepSkips: [
            {
              instanceId: 'old-1',
              stepId: 'review',
              applicability: 'valid',
              reason: '本轮已有独立复核',
            },
          ],
        },
      ],
    });
    expect(html).toContain(locale === 'en' ? 'Skipped' : '已跳过');
    expect(html).toContain('本轮已有独立复核');
    expect(html).not.toContain(locale === 'en' ? '可选复核 (Confirmed)' : '可选复核 (已确认)');
  },
);

it('keeps equal-text and multiline acceptance criteria as independent editable entries', () => {
  const model = createInitialState();
  const task = model.tasks.find((item: { id: string }) => item.id === 'LOCAL-1');
  Object.assign(task, {
    criteria: [
      { id: 'carry-one', text: '同一项承诺' },
      { id: 'carry-two', text: '同一项承诺' },
      { id: 'carry-multiline', text: '复核边界\n保留执行证据' },
    ],
  });
  const html = renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
      <I18nProvider initialLocale="zh-CN">
        <TaskFlowDialogs
          ctx={{ model, task, modal: { type: 'task-scope' }, run: vi.fn(), setModal: vi.fn() }}
        />
      </I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
  expect(html.match(/name="criteria"/g)).toHaveLength(3);
  expect(html).toContain('复核边界\n保留执行证据</textarea>');
});

it('shows invalidated skip history without treating it as the accepted decision', () => {
  const html = renderTask('in_progress', false, 'en', 'detail', {
    workflowHistory: [
      {
        workflow: {
          templateId: 'old',
          instanceId: 'old-1',
          name: '原复核流程',
          version: 1,
          stepLabels: ['可选复核'],
          steps: [{ id: 'review', required: false }],
        },
        accepted: [false],
        stage: 0,
        reason: '变更流程',
        stepSkips: [
          {
            instanceId: 'old-1',
            stepId: 'review',
            applicability: 'invalidated',
            reason: '原范围曾经免复核',
          },
        ],
      },
    ],
  });
  expect(html).toContain('原范围曾经免复核');
  expect(html).toContain('Previous skip no longer applies');
  expect(html).not.toContain('可选复核 (Skipped)');
});
