import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createInitialState, reduce } from '../src/mock/model.js';
import {
  getTaskReview,
  getTaskCompletion,
  getTaskStatusChange,
} from '../src/mock/task-lifecycle.js';
import { TaskDetail } from '../src/workbench/pages/TaskDetailPage.jsx';
import { Dialogs } from '../src/workbench/Dialogs.jsx';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { createMockWorkbenchRuntime } from '../src/mock';
import { TaskStatusChangePanel } from '../src/workbench/TaskStatusControl';
import { taskEventText } from '../src/workbench/ui.jsx';
import { createTranslator } from '../src/workbench/i18n-core.js';
import { getStageReview } from '../src/mock/personal-board.js';

function scenario() {
  let model = reduce(createInitialState(), { type: 'CREATE_TASK', title: '更新项目说明' });
  const id = model.tasks.at(-1).id;
  const task = () => model.tasks.find((item: { id: string }) => item.id === id);
  const act = (type: string, fields = {}) => {
    model = reduce(model, { type, taskId: id, ...fields });
  };
  const submit = () =>
    act('SUBMIT_TASK_REVIEW', { expectedSnapshot: getTaskReview(model, task()).snapshot });
  const complete = (criterionIds: string[] = []) =>
    act('COMPLETE_TASK', {
      expectedSnapshot: getTaskCompletion(model, task()).snapshot,
      criterionIds,
    });
  const render = (modal: string | null = null, locale = 'zh-CN') => {
    const ctx = {
      model,
      task: task(),
      taskOrigin: 'personal',
      modal: modal ? { type: modal } : null,
      stage: task().stage,
      setModal: vi.fn(),
      setStage: vi.fn(),
      run: vi.fn(),
      act: vi.fn(),
      openTask: vi.fn(),
      go: vi.fn(),
      showOrigin: vi.fn(),
    };
    return renderToStaticMarkup(
      <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
        <I18nProvider initialLocale={locale}>
          {modal ? <Dialogs ctx={ctx} /> : <TaskDetail ctx={ctx} saved />}
        </I18nProvider>
      </WorkbenchRuntimeProvider>,
    );
  };
  return { task, act, submit, complete, render, model: () => model };
}

describe('minimal task', () => {
  it.each(['passed', 'failed'])(
    'keeps manual %s workflow results confirmable before direct completion',
    (outcome) => {
      const s = scenario();
      s.act('START_TASK');
      s.act('SET_TASK_WORKFLOW', { templateId: 'development' });
      for (let stage = 0; stage < 4; stage++) {
        expect(s.render()).toContain('>提交产物</button>');
        s.act('ADD_TASK_ARTIFACT', {
          title: `步骤${stage}.md`,
          body: '如实记录本步骤结果',
          outcome,
          coverageComplete: true,
        });
        const doc = s.task().docs.at(-1);
        expect(
          getStageReview(s.model(), s.task()).checks.every(
            (check: { passed: boolean }) => check.passed,
          ),
        ).toBe(true);
        const button = s.render().match(/<button[^>]*>确认内部步骤<\/button>/)?.[0];
        expect(button).toBeDefined();
        expect(button).not.toContain('disabled');
        s.act('ACCEPT_STAGE', {
          expectedStage: stage,
          documentId: doc.id,
          documentVersion: doc.version,
        });
      }
      const gate = getTaskStatusChange(s.model(), s.task(), 'done');
      expect(gate.allowed).toBe(true);
      s.act('CHANGE_TASK_STATUS', {
        status: 'done',
        expectedStatus: 'in_progress',
        expectedSnapshot: gate.snapshot,
      });
      expect(s.task().status).toBe('done');
      expect(s.task().docs.every((doc: { outcome: string }) => doc.outcome === outcome)).toBe(true);
    },
  );
  it('completes, archives, restores and reopens with only a title, type and lifecycle', () => {
    const s = scenario();
    expect(s.task().taskType).toBe('uncategorized');
    expect(s.task().description).toBe('');
    s.act('START_TASK');
    expect(getTaskReview(s.model(), s.task()).allowed).toBe(true);
    s.submit();
    s.complete();
    const decision = s.task().completions[0].id;
    expect(s.task().status).toBe('done');
    expect(s.task().docs).toEqual([]);
    s.act('ARCHIVE_TASK');
    s.act('RESTORE_TASK');
    expect(s.task().status).toBe('done');
    s.act('REOPEN_TASK', { reason: '继续补充说明' });
    expect(s.task().status).toBe('in_progress');
    expect(s.task().completions[0].id).toBe(decision);
  });

  it('allows criteria without a result while still requiring every configured criterion', () => {
    const s = scenario();
    s.act('START_TASK');
    s.act('SAVE_TASK_SCOPE', { goal: '', criteria: ['说明清楚'] });
    s.submit();
    expect(() => s.complete()).toThrow(/criteria/);
    s.complete([s.task().criteria[0].id]);
    expect(s.task().status).toBe('done');
  });

  it('freezes the task title and optional content and rejects stale review submissions', () => {
    const s = scenario();
    s.act('START_TASK');
    const prior = getTaskReview(s.model(), s.task()).snapshot;
    s.act('SAVE_TASK_BASICS', {
      title: '更新使用说明',
      taskType: 'documentation',
      description: '补充本地启动方法',
    });
    expect(() => s.act('SUBMIT_TASK_REVIEW', { expectedSnapshot: prior })).toThrow(/snapshot/);
    s.submit();
    expect(JSON.parse(s.task().review.snapshot)).toMatchObject({
      title: '更新使用说明',
      description: '补充本地启动方法',
    });
    expect(() => s.act('UPDATE_TASK_CONTEXT', { description: '替换评审内容' })).toThrow();
    expect(() => s.act('UPDATE_TASK', { title: '替换评审标题' })).toThrow();
  });

  it('accepts an explicitly completed child without manufacturing an artifact', () => {
    const s = scenario();
    s.act('START_TASK');
    s.submit();
    s.complete();
    let model = reduce(s.model(), { type: 'CREATE_TASK', title: '父任务' });
    const parentId = model.tasks.at(-1).id;
    model = reduce(model, {
      type: 'LINK_TASK',
      taskId: parentId,
      targetTaskId: s.task().id,
      relationKind: 'child',
      required: true,
      confirmScopeChange: true,
    });
    const parent = model.tasks.at(-1);
    expect(getTaskReview(model, parent).allowed).toBe(true);
    model.tasks.find(
      (task: { id: string }) => task.id === s.task().id,
    ).completions[0].applicability = 'pending';
    expect(getTaskReview(model, parent).allowed).toBe(false);
  });

  it.each(['zh-CN', 'en'])(
    'presents task content and explicit editing with optional additions in %s',
    (locale) => {
      const s = scenario();
      const html = s.render(null, locale);
      expect(html).toContain(locale === 'en' ? 'Task content' : '任务内容');
      expect(html).toContain(locale === 'en' ? 'Edit task' : '编辑任务');
      expect(html).toContain(locale === 'en' ? 'Add acceptance criteria' : '添加验收条件');
      expect(html).toContain(locale === 'en' ? 'Task type: Uncategorized' : '任务类型：未分类');
      expect(html).toContain(
        locale === 'en' ? 'No acceptance criteria configured.' : '未设置验收条件。',
      );
      expect(html).toContain(locale === 'en' ? 'No comments yet.' : '暂无评论');
      expect(html).toContain(locale === 'en' ? 'Change task status' : '切换任务状态');
      expect(html).toContain(locale === 'en' ? 'Add a comment' : '添加评论');
      expect(html).not.toContain(locale === 'en' ? 'Add work result' : '填写处理结果');
      expect(html).not.toContain(locale === 'en' ? 'Submit task review' : '提交任务评审');
      expect(html).toContain(locale === 'en' ? 'No linked tasks.' : '暂无关联');
      expect(html).toContain(locale === 'en' ? 'Recent activity' : '最近活动');
      expect(html).toContain(locale === 'en' ? 'View all activity' : '查看全部活动');
      expect(html).not.toContain('aria-label="修改任务类型"');
      expect(html).not.toContain('先明确目标，提交评审前补齐');
    },
  );

  it('keeps the empty supplementary sections visible while viewing a completed task', () => {
    const s = scenario();
    s.act('START_TASK');
    s.submit();
    s.complete();
    const html = s.render();
    expect(html).toContain('任务类型：未分类');
    expect(html).toContain('未设置验收条件。');
    expect(html).toContain('暂无评论');
    expect(html).toContain('添加评论');
    expect(html).toContain('暂无关联');
    expect(html).not.toContain('>添加验收条件</button>');
    expect(html).not.toContain('>关联任务</button>');
    expect(s.task().criteria).toEqual([]);
    expect(s.task().docs).toEqual([]);
  });

  it('keeps authored comments as plain content in either language, with no artifact form', () => {
    const s = scenario();
    s.task().comments = [
      {
        id: 'comment-1',
        author: 'You',
        body: '我的看板\n<script>example</script>',
        createdAt: '2026-10-31T09:00:00.000Z',
      },
    ];
    const html = s.render(null, 'en');
    expect(html).toContain('我的看板');
    expect(html).toContain('&lt;script&gt;example&lt;/script&gt;');
    expect(html).not.toContain('<script>example</script>');
    expect(html).not.toContain('Artifact title');
    expect(html).toContain('name="comment"');
  });

  it('only asks to confirm existing criteria when choosing Done', () => {
    const s = scenario();
    s.act('SAVE_TASK_SCOPE', { goal: '', criteria: ['说明包含启动方式'] });
    const html = renderToStaticMarkup(
      <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
        <I18nProvider initialLocale="zh-CN">
          <TaskStatusChangePanel
            ctx={{ task: s.task(), model: s.model(), run: vi.fn() }}
            target="done"
            close={vi.fn()}
          />
        </I18nProvider>
      </WorkbenchRuntimeProvider>,
    );
    expect(html).toContain('说明包含启动方式');
    expect(html).toMatch(/type="checkbox"/);
    expect(html).toMatch(/type="submit" disabled=""/);
    expect(html).not.toContain('产物标题');
    expect(html).not.toContain('提交任务评审');
  });

  it('shows the actual status transition in recent and full activity copy', () => {
    const event = { text: 'task.status-changed', fromStatus: 'todo', status: 'done' };
    expect(taskEventText(event, createTranslator('zh-CN'))).toBe('状态从待办改为已完成');
    expect(taskEventText(event, createTranslator('en'))).toBe(
      'Status changed from To do to Completed',
    );
  });

  it('does not ask an already reopened task to reopen again', () => {
    const s = scenario();
    s.act('CHANGE_TASK_STATUS', {
      status: 'done',
      expectedStatus: 'todo',
      expectedSnapshot: getTaskStatusChange(s.model(), s.task(), 'done').snapshot,
    });
    s.act('CHANGE_TASK_STATUS', {
      status: 'todo',
      expectedStatus: 'done',
      expectedSnapshot: getTaskStatusChange(s.model(), s.task(), 'todo').snapshot,
    });
    expect(s.render()).not.toContain('补做或采用新范围前请重新打开任务');
  });

  it('edits the required title and type together with optional content', () => {
    const s = scenario();
    const html = s.render('task-basics');
    expect(html.match(/<input[^>]*name="title"[^>]*>/)?.[0]).toContain('required');
    expect(html).toContain('任务类型');
    expect(html.match(/<textarea[^>]*name="description"[^>]*>/)?.[0]).not.toContain('required');
  });

  it('retains old submitted reviews and completion snapshots without inventing captured content', () => {
    const s = scenario();
    s.act('START_TASK');
    s.submit();
    const old = JSON.parse(s.task().review.snapshot);
    delete old.title;
    delete old.description;
    s.task().review.snapshot = JSON.stringify(old);
    s.complete();
    const decision = s.task().completions[0];
    const oldBasis = JSON.parse(decision.basisSnapshot);
    delete oldBasis.title;
    delete oldBasis.description;
    decision.basisSnapshot = JSON.stringify(oldBasis);
    const stored = JSON.stringify({ version: 3, model: s.model() });
    const restored = createMockWorkbenchRuntime({
      storage: { getItem: () => stored, setItem: vi.fn() },
    }).load() as ReturnType<typeof createInitialState>;
    const task = restored.tasks.find((item: { id: string }) => item.id === s.task().id);
    expect(task.completions[0].applicability).toBe('valid');
    expect(task.completions[0].snapshot).toBe(JSON.stringify(old));
  });

  it('rejects a stale basic-information edit and editing a completed task', () => {
    const s = scenario();
    const prior = getTaskReview(s.model(), s.task()).snapshot;
    s.act('SAVE_TASK_BASICS', { title: '新标题', taskType: 'uncategorized', description: '' });
    expect(() =>
      s.act('SAVE_TASK_BASICS', {
        title: '旧窗口内容',
        taskType: 'uncategorized',
        description: '',
        expectedSnapshot: prior,
      }),
    ).toThrow(/snapshot/);
    s.act('START_TASK');
    s.submit();
    s.complete();
    expect(() =>
      s.act('SAVE_TASK_BASICS', {
        title: '完成后替换',
        taskType: 'uncategorized',
        description: '',
      }),
    ).toThrow(/reopen/);
  });

  it('keeps an explicit passing-result requirement and active execution as completion gates', () => {
    const s = scenario();
    s.act('START_TASK');
    s.act('SAVE_TASK_SCOPE', { goal: '', criteria: [], requirePassingResult: true });
    expect(getTaskReview(s.model(), s.task()).allowed).toBe(false);
    s.act('SAVE_TASK_SCOPE', { goal: '', criteria: [], requirePassingResult: false });
    s.act('BIND_SESSION', { host: 'Codex' });
    s.act('START_STAGE');
    expect(getTaskReview(s.model(), s.task()).allowed).toBe(false);
  });

  it('shows automatically recorded activity and keeps optional criteria editable without a goal field', () => {
    const s = scenario();
    s.act('START_TASK');
    expect(s.render()).toContain('已开始处理任务');
    const html = s.render('task-scope');
    expect(html).toContain('验收条件（选填）');
    expect(html).not.toContain('name="goal"');
    expect(html).toMatch(/<button class="primary" type="submit">保存任务范围/);
  });

  it('marks a changed source-backed title pending through the new editor without changing remote facts', () => {
    const model = createInitialState();
    const before = model.tasks[0];
    const next = reduce(model, {
      type: 'SAVE_TASK_BASICS',
      taskId: before.id,
      title: '更正后的本地标题',
      taskType: before.taskType,
      description: before.description || '',
    });
    expect(next.tasks[0].sync).toBe('pending');
    expect(next.tasks[0].remoteTitle).toBe(before.remoteTitle);
  });

  it('shows the original basic information in completion history after reopening and editing', () => {
    const s = scenario();
    s.act('SAVE_TASK_BASICS', {
      title: '原任务标题',
      taskType: 'documentation',
      description: '原来完成的任务内容',
    });
    s.act('START_TASK');
    s.submit();
    s.complete();
    s.act('REOPEN_TASK', { reason: '补充工作' });
    s.act('SAVE_TASK_BASICS', {
      title: '本轮新标题',
      taskType: 'documentation',
      description: '本轮新增内容',
    });
    const html = s.render('task-history');
    expect(html).toContain('原任务标题');
    expect(html).toContain('原来完成的任务内容');
    expect(html).not.toContain('本轮新增内容');
  });
});
