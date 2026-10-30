import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PersonalBoard } from '../src/workbench/PersonalBoard.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { createMockWorkbenchRuntime } from '../src/mock';
import { createInitialState } from '../src/mock/model.js';

function renderBoard(status = 'all', locale = 'zh-CN', extra = {}) {
  const model = createInitialState();
  const local = structuredClone(model.tasks.find((task: { id: string }) => task.id === 'LOCAL-1'));
  const source = structuredClone(model.tasks[0]);
  model.tasks = [
    { ...local, id: 'LOCAL-TODO', status: 'todo', taskType: 'uncategorized', workflow: null },
    {
      ...source,
      id: 'FLOW-PROCESSING',
      status: 'in_progress',
      taskType: 'development',
      attention: 'review',
      workflow: { templateId: 'development', stepLabels: ['需求', '设计', '开发', '验证'] },
      stage: 1,
    },
    {
      ...local,
      id: 'LOCAL-PROCESSING',
      status: 'in_progress',
      taskType: 'documentation',
      workflow: null,
    },
    { ...local, id: 'LOCAL-REVIEW', status: 'review', taskType: 'documentation', workflow: null },
    { ...local, id: 'LOCAL-DONE', status: 'done', taskType: 'documentation', workflow: null },
    { ...local, id: 'LOCAL-ARCHIVED', status: 'archived', workflow: null },
  ];
  return renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
      <I18nProvider initialLocale={locale}>
        <PersonalBoard
          ctx={{ model, openTask: vi.fn(), setModal: vi.fn(), openForTask: vi.fn() }}
          boardUi={{ query: '', status, project: 'all', source: 'all', ...extra }}
          setBoardUi={vi.fn()}
        />
      </I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
}
const cardIds = (html: string) =>
  [...html.matchAll(/data-task-id="([^"]+)"/g)].map((match) => match[1]);

describe('personal board lifecycle and type filters', () => {
  it.each([
    ['todo', ['LOCAL-TODO']],
    ['in_progress', ['FLOW-PROCESSING', 'LOCAL-PROCESSING']],
    ['review', ['LOCAL-REVIEW']],
    ['done', ['LOCAL-DONE']],
  ])(
    'filters %s by explicit lifecycle independently from internal step review',
    (status, expected) => {
      expect(cardIds(renderBoard(status as string))).toEqual(expected);
    },
  );
  it('excludes archived tasks from the four daily columns', () => {
    expect(cardIds(renderBoard())).toHaveLength(5);
    expect(renderBoard()).not.toContain('data-task-id="LOCAL-ARCHIVED"');
  });
  it('combines lifecycle, type, search and source filtering', () => {
    expect(cardIds(renderBoard('in_progress', 'zh-CN', { query: 'FLOW' }))).toEqual([
      'FLOW-PROCESSING',
    ]);
    expect(cardIds(renderBoard('in_progress', 'zh-CN', { source: 'local' }))).toEqual([
      'LOCAL-PROCESSING',
    ]);
    expect(cardIds(renderBoard('all', 'zh-CN', { taskType: 'documentation' }))).toEqual([
      'LOCAL-PROCESSING',
      'LOCAL-REVIEW',
      'LOCAL-DONE',
    ]);
  });
  it.each([
    ['zh-CN', '看板状态筛选', '任务类型筛选', '全部状态'],
    ['en', 'Board status filter', 'Task type filter', 'All statuses'],
  ])(
    'localizes separate filters in %s and only shows explicit workflow steps',
    (locale, statusLabel, typeLabel, all) => {
      const html = renderBoard('all', locale);
      expect(html).toContain(`aria-label="${statusLabel}"`);
      expect(html).toContain(`aria-label="${typeLabel}"`);
      expect(html).toContain(all);
      expect(html.match(/class="phase-tag"/g)).toHaveLength(1);
      expect(html).not.toContain('aria-label="看板阶段筛选"');
    },
  );
});
