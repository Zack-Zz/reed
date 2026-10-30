import { renderToStaticMarkup } from 'react-dom/server';
import type { RelationKind } from '../src/workbench/relations-layout';
import { describe, expect, it, vi } from 'vitest';
import { TaskRelationsPage } from '../src/workbench/pages/TaskRelationsPage';
import { TaskRelationDialog } from '../src/workbench/TaskRelationDialog';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { createTranslator } from '../src/workbench/i18n-core.js';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { createMockWorkbenchRuntime } from '../src/mock';
const tasks = ['P', 'C', 'R', 'D', 'H'].map((id) => ({
  id,
  title: `Task ${id}`,
  status: 'todo',
  taskType: 'requirement',
  project: 'Reed',
  origin: { kind: 'local', system: 'reed' },
  docs: [],
  sessionIds: [],
}));
const relation = (toTaskId: string, kind: RelationKind, active = true) => ({
  id: `P-${toTaskId}`,
  fromTaskId: 'P',
  toTaskId,
  kind,
  required: toTaskId === 'C',
  active,
});
const model = {
  tasks,
  sessions: [],
  branches: [],
  relations: [
    relation('C', 'child'),
    relation('R', 'related'),
    relation('D', 'dependency'),
    relation('H', 'child', false),
  ],
};
const ctx = {
  model,
  task: tasks[0],
  modal: null,
  openTask: vi.fn(),
  openRelations: vi.fn(),
  showRelationExample: vi.fn(),
  setModal: vi.fn(),
  act: vi.fn(),
};
function render(view: 'page' | 'create' | 'link', locale = 'zh-CN', patch = {}) {
  return renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
      <I18nProvider initialLocale={locale}>
        {view === 'page' ? (
          <TaskRelationsPage
            ctx={ctx}
            relationsUi={{
              rootId: 'P',
              collapsed: [],
              zoom: 1,
              pan: { x: 0, y: 0 },
              showRelated: true,
              showDependencies: true,
              ...patch,
            }}
            setRelationsUi={vi.fn()}
          />
        ) : (
          <TaskRelationDialog
            ctx={{
              ...ctx,
              task: tasks[0],
              modal: {
                type: view === 'create' ? 'relation-create' : 'relation-link',
                taskId: 'C',
                relationKind: 'child',
                ...patch,
              },
            }}
          />
        )}
      </I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
}
describe('task relationships presentation', () => {
  it('separates the child tree from optional related and dependency context', () => {
    const html = render('page');
    expect(html).toContain('aria-label="任务拆分图"');
    expect(html).toContain('data-task-id="P"');
    expect(html).toContain('data-task-id="C"');
    expect(html).not.toContain('data-task-id="R"');
    expect(html).not.toContain('data-task-id="H"');
    expect(html).toContain('普通关联');
    expect(html).toContain('前置依赖');
    expect(html).toContain('必要交付');
    expect(html).toContain('关系不改变任务状态，也不会自动启动 Agent');
  });
  it('labels optional prerequisites as nonblocking instead of promising a required result', () => {
    expect(render('page')).toContain('参考依赖 · 不阻塞验收');
    const html = render('link', 'zh-CN', { relationKind: 'dependency', required: false });
    expect(html).toContain('不限制开始处理、提交评审或完成');
    expect(html).not.toContain('当前任务需要目标任务的已接受成果');
  });
  it('exposes keyboard controls, node actions, navigation and the example entry', () => {
    const html = render('page');
    for (const text of [
      '适应视图',
      '放大',
      '缩小',
      '以此为起点',
      '查看示例',
      '选择起点任务',
      '移动关系画布',
    ])
      expect(html).toContain(text);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="为 Task C 添加关系"');
  });
  it('keeps auxiliary relationship details hidden until their switches are enabled', () => {
    const html = render('page', 'zh-CN', { showRelated: false, showDependencies: false });
    expect(html).not.toContain('>Task R<');
    expect(html).not.toContain('>Task D<');
  });
  it('creates from modal.taskId with a required title, optional type and project, and no preselected required delivery', () => {
    const html = render('create');
    expect(html).toContain('Task C');
    expect(html).not.toContain('Task P');
    expect(html.match(/<input[^>]*name="title"[^>]*>/)?.[0]).toContain('required');
    expect(html).toContain('项目（可后补）');
    expect(html).toContain('创建后为待办');
    expect(html).not.toContain('checked=""');
    expect(html).not.toContain('我确认更新');
  });
  it('states the required dependency impact and keeps a separate scope confirmation unchecked', () => {
    const html = render('link', 'zh-CN', { relationKind: 'dependency', required: true });
    expect(html).toContain('必要成果将影响当前任务的完成条件');
    expect(html).toContain('我确认更新当前任务必要交付范围');
    expect(html).toContain('name="confirmScopeChange"');
    expect(html).toContain('不自动派发');
  });
  it('localizes the new view and creation form in English', () => {
    expect(render('page', 'en')).toContain('Task relationships');
    const html = render('create', 'en');
    expect(html).toContain('New child task');
    expect(html).toContain('Project (optional)');
    expect(html).not.toContain('relation.');
  });
});

const feedbackKeys = [
  'invalid-kind',
  'target-missing',
  'self-link',
  'related-not-required',
  'already-linked',
  'reopen-parent',
  'second-parent',
  'tree-cycle',
  'confirm-scope',
  'wait-cycle',
  'linked',
  'check-deliveries',
];
it.each(['zh-CN', 'en'])(
  'explains mock relationship feedback in %s without exposing internal keys',
  (locale) => {
    const t = createTranslator(locale);
    for (const key of feedbackKeys) expect(t(`relation.${key}`)).not.toContain('relation.');
  },
);
