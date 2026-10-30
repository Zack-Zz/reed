import { toScopeCriteria } from '../src/workbench/acceptance-criteria';
import { describe, it, expect } from 'vitest';
import { createInitialState, reduce } from '../src/mock/model.js';
import { getTaskReview, getTaskCompletion, taskSnapshot } from '../src/mock/task-lifecycle.js';
import { createMockWorkbenchRuntime } from '../src/mock';
const definition = (count = 2) => ({
  name: '自定义测试',
  description: '按约定输出报告',
  suggestedCriteria: ['报告覆盖约定范围'],
  steps: Array.from({ length: count }, (_, i) => ({
    id: `step-${i}`,
    name: `检查${i + 1}`,
    goal: `完成检查${i + 1}`,
    instructions: '',
    outputs: [`报告${i + 1}.md`],
    checks: ['结果可核查'],
    required: true,
    mode: 'either',
    requiresCode: false,
  })),
});
const createTemplate = (state: any, count = 2) =>
  reduce(state, {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    definition: definition(count),
    publish: true,
    expectedRevision: 0,
  });
const taskOf = (state: any, id: string) => state.tasks.find((task: any) => task.id === id);
const act = (state: any, id: string, type: string, fields = {}) =>
  reduce(state, { type, taskId: id, ...fields });
describe('local task and workflow configuration', () => {
  it('seeds built-in configuration without adopting a workflow on title-only creation', () => {
    const state = createInitialState();
    expect(state.configuration.taskTypes.some((t: any) => t.id === 'uncategorized')).toBe(true);
    expect(
      state.configuration.templates.find((t: any) => t.id === 'testing').versions[0].steps.length,
    ).toBeGreaterThan(0);
    expect(
      reduce(state, { type: 'CREATE_TASK', title: '直接处理' }).tasks.at(-1).workflow,
    ).toBeNull();
  });
  it('creates custom types and recommendations, and preserves adopted disabled types', () => {
    let state = reduce(createInitialState(), {
      type: 'SAVE_TASK_TYPE',
      definition: {
        name: '代码审查',
        description: '',
        icon: 'review',
        recommendedTemplateIds: ['development', 'testing'],
      },
    });
    const type = state.configuration.taskTypes.at(-1);
    state = reduce(state, { type: 'CREATE_TASK', title: '独立审查', taskType: type.id });
    const id = state.tasks.at(-1).id;
    state = reduce(state, { type: 'SET_TASK_TYPE_ENABLED', typeId: type.id, enabled: false });
    expect(taskOf(state, id).taskType).toBe(type.id);
    expect(() =>
      reduce(state, { type: 'CREATE_TASK', title: '新审查', taskType: type.id }),
    ).toThrow();
    expect(() => reduce(state, { type: 'DELETE_TASK_TYPE', typeId: type.id })).toThrow(
      /config.type-in-use/,
    );
    expect(() =>
      reduce(state, { type: 'SET_TASK_TYPE_ENABLED', typeId: 'uncategorized', enabled: false }),
    ).toThrow();
  });
  it('publishes immutable successor versions without upgrading tasks and refuses stale or invalid draft writes', () => {
    let state = createTemplate(createInitialState());
    const template = state.configuration.templates.at(-1);
    state = reduce(state, {
      type: 'CREATE_TASK',
      title: '使用 V1',
      templateId: template.id,
      templateVersion: 1,
    });
    const id = state.tasks.at(-1).id;
    const frozen = structuredClone(taskOf(state, id).workflow);
    state = reduce(state, {
      type: 'SAVE_WORKFLOW_TEMPLATE',
      templateId: template.id,
      expectedRevision: 1,
      definition: definition(3),
      publish: true,
    });
    expect(taskOf(state, id).workflow).toEqual(frozen);
    expect(state.configuration.templates.at(-1).versions).toHaveLength(2);
    const before = structuredClone(state);
    expect(() =>
      reduce(state, {
        type: 'SAVE_WORKFLOW_TEMPLATE',
        templateId: template.id,
        expectedRevision: 2,
        definition: { ...definition(), steps: [] },
        publish: true,
      }),
    ).toThrow();
    expect(state).toEqual(before);
    expect(() =>
      reduce(state, {
        type: 'SAVE_WORKFLOW_TEMPLATE',
        templateId: template.id,
        expectedRevision: 1,
        definition: definition(),
        publish: true,
      }),
    ).toThrow(/revision/);
  });
  it('keeps stopped templates on adopted tasks, rejects new selections and copies builtins into unpublished drafts', () => {
    let state = createTemplate(createInitialState());
    const templateId = state.configuration.templates.at(-1).id;
    state = reduce(state, {
      type: 'CREATE_TASK',
      title: '保持旧版本',
      templateId,
      templateVersion: 1,
    });
    state = reduce(state, { type: 'SET_WORKFLOW_TEMPLATE_ENABLED', templateId, enabled: false });
    expect(state.tasks.at(-1).workflow.templateId).toBe(templateId);
    expect(() =>
      reduce(state, {
        type: 'CREATE_TASK',
        title: '不能选停用模板',
        templateId,
        templateVersion: 1,
      }),
    ).toThrow();
    state = reduce(state, { type: 'COPY_WORKFLOW_TEMPLATE', templateId: 'development' });
    expect(state.configuration.templates.at(-1).builtin).toBe(false);
    expect(state.configuration.templates.at(-1).versions).toEqual([]);
  });
  it('runs five custom steps with their declared outputs and never completes the Task implicitly', () => {
    let state = createTemplate(createInitialState(), 5);
    const templateId = state.configuration.templates.at(-1).id;
    state = reduce(state, {
      type: 'CREATE_TASK',
      title: '五步任务',
      templateId,
      templateVersion: 1,
    });
    const id = state.tasks.at(-1).id;
    state = act(state, id, 'START_TASK');
    state = act(state, id, 'SAVE_TASK_SCOPE', { goal: '完成五步检查', criteria: ['覆盖全部检查'] });
    for (let i = 0; i < 5; i++) {
      expect(() => act(state, id, 'ACCEPT_STAGE')).toThrow();
      state = act(state, id, 'ADD_TASK_ARTIFACT', {
        title: `报告${i + 1}.md`,
        body: '独立检查结果',
        coverageComplete: true,
      });
      const doc = taskOf(state, id).docs.at(-1);
      state = act(state, id, 'ACCEPT_STAGE', {
        expectedStage: i,
        documentId: doc.id,
        documentVersion: doc.version,
      });
    }
    expect(taskOf(state, id).accepted).toEqual([true, true, true, true, true]);
    expect(taskOf(state, id).status).toBe('in_progress');
    expect(getTaskReview(state, taskOf(state, id)).allowed).toBe(true);
  });
  it('requires workflow-change confirmation and carries unfinished promises into task-level criteria', () => {
    let state = createTemplate(createInitialState());
    const templateId = state.configuration.templates.at(-1).id;
    state = reduce(state, {
      type: 'CREATE_TASK',
      title: '更换流程',
      templateId,
      templateVersion: 1,
    });
    const id = state.tasks.at(-1).id;
    state = act(state, id, 'START_TASK');
    state = act(state, id, 'SAVE_TASK_SCOPE', { goal: '交付', criteria: ['原约定'] });
    state = act(state, id, 'ADD_TASK_ARTIFACT', {
      title: '报告1.md',
      body: '旧步骤成果',
      coverageComplete: true,
    });
    expect(() => act(state, id, 'SET_TASK_WORKFLOW', { templateId: null })).toThrow();
    state = act(state, id, 'SET_TASK_WORKFLOW', {
      templateId: null,
      expectedSnapshot: taskSnapshot(taskOf(state, id)),
      confirmChange: true,
      reason: '延续原工作，改为直接处理',
    });
    expect(taskOf(state, id).workflow).toBeNull();
    expect(taskOf(state, id).criteria.some((c: any) => c.text.includes('检查1'))).toBe(true);
    expect(taskOf(state, id).criteria.some((c: any) => c.text.includes('检查2'))).toBe(true);
    expect(taskOf(state, id).workflowHistory).toHaveLength(1);
    expect(getTaskReview(state, taskOf(state, id)).allowed).toBe(false);
  });
  it('reloads saved custom types and arbitrary workflow versions without resetting user content', () => {
    let state = createTemplate(createInitialState(), 5);
    const templateId = state.configuration.templates.at(-1).id;
    state = reduce(state, {
      type: 'CREATE_TASK',
      title: '重载仍保留',
      templateId,
      templateVersion: 1,
    });
    const runtime = createMockWorkbenchRuntime({
      storage: { getItem: () => JSON.stringify({ version: 3, model: state }), setItem() {} },
    });
    const restored: any = runtime.load();
    expect(restored.tasks.at(-1).title).toBe('重载仍保留');
    expect(restored.tasks.at(-1).workflow.steps).toHaveLength(5);
  });
});

it('explicitly confirms coverage on exact ended Agent results without replacing provenance', () => {
  let state = reduce(createInitialState(), {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    expectedRevision: 0,
    publish: true,
    definition: {
      ...definition(1),
      steps: definition(1).steps.map((s) => ({ ...s, mode: 'agent' })),
    },
  });
  const templateId = state.configuration.templates.at(-1).id;
  state = reduce(state, {
    type: 'CREATE_TASK',
    title: 'Agent 检查',
    templateId,
    templateVersion: 1,
  });
  const id = state.tasks.at(-1).id;
  state = act(state, id, 'START_TASK');
  state = act(state, id, 'BIND_SESSION', { host: 'Codex' });
  state = act(state, id, 'START_STAGE');
  state = act(state, id, 'FINISH_STAGE', { outcome: 'review' });
  const document = taskOf(state, id).docs.at(-1);
  state = act(state, id, 'ACKNOWLEDGE_STEP_COVERAGE', {
    documentId: document.id,
    documentVersion: document.version,
    coverageComplete: true,
  });
  state = act(state, id, 'ACCEPT_STAGE', {
    expectedStage: 0,
    documentId: document.id,
    documentVersion: document.version,
  });
  expect(taskOf(state, id).accepted[0]).toBe(true);
  expect(taskOf(state, id).docs.at(-1).origin.kind).toBe('host');
});
it('does not reinterpret reused task-level legacy material as a numerical step in a new workflow', () => {
  let state = createInitialState();
  const id = 'REQ-1045';
  const original = taskOf(state, id).docs[0];
  state = act(state, id, 'SET_TASK_WORKFLOW', {
    templateId: 'testing',
    templateVersion: 1,
    expectedSnapshot: taskSnapshot(taskOf(state, id)),
    confirmChange: true,
    reason: '延续必要工作',
    reuseDocumentIds: [original.id],
  });
  const reused = taskOf(state, id).docs.at(-1);
  expect(reused.stage).toBeNull();
  expect(() =>
    act(state, id, 'ACCEPT_STAGE', {
      expectedStage: 0,
      documentId: reused.id,
      documentVersion: reused.version,
    }),
  ).toThrow();
  state = act(state, id, 'REOPEN_STAGE', { stage: 0, reason: '新流程首步返工' });
  expect(taskOf(state, id).docs.find((d: any) => d.id === reused.id).stale).toBe(false);
});
it.each(['missing steps', 'empty published version'])(
  'rejects corrupted modern configuration without downgrading to legacy acceptance: %s',
  (kind) => {
    let state = createTemplate(createInitialState());
    const templateId = state.configuration.templates.at(-1).id;
    state = reduce(state, {
      type: 'CREATE_TASK',
      title: '损坏稿不能绕过验收',
      templateId,
      templateVersion: 1,
    });
    if (kind === 'missing steps') state.tasks.at(-1).workflow.steps = [];
    else state.configuration.templates.at(-1).versions[0].steps = [];
    const runtime = createMockWorkbenchRuntime({
      storage: { getItem: () => JSON.stringify({ version: 3, model: state }), setItem() {} },
    });
    expect((runtime.load() as any).tasks.some((t: any) => t.title === '损坏稿不能绕过验收')).toBe(
      false,
    );
  },
);
it('requires explicit internal rework before revising an accepted step artifact', () => {
  let state = createTemplate(createInitialState(), 1);
  const templateId = state.configuration.templates.at(-1).id;
  state = reduce(state, {
    type: 'CREATE_TASK',
    title: '已验收步骤',
    templateId,
    templateVersion: 1,
  });
  const id = state.tasks.at(-1).id;
  state = act(state, id, 'START_TASK');
  state = act(state, id, 'ADD_TASK_ARTIFACT', {
    title: '报告1.md',
    body: '已确认',
    coverageComplete: true,
  });
  const doc = taskOf(state, id).docs.at(-1);
  state = act(state, id, 'ACCEPT_STAGE', {
    expectedStage: 0,
    documentId: doc.id,
    documentVersion: doc.version,
  });
  expect(() =>
    act(state, id, 'ADD_TASK_ARTIFACT', {
      sourceDocId: doc.id,
      title: doc.title,
      body: '改写原成果',
      coverageComplete: true,
    }),
  ).toThrow(/rework/);
  expect(taskOf(state, id).accepted[0]).toBe(true);
});
it('uses globally unique document identities across workflow replacements at the same numerical stage', () => {
  let state = reduce(createInitialState(), {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    expectedRevision: 0,
    publish: true,
    definition: { ...definition(1), name: '流程 A' },
  });
  const first = state.configuration.templates.at(-1).id;
  state = reduce(state, {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    expectedRevision: 0,
    publish: true,
    definition: {
      ...definition(1),
      name: '流程 B',
      steps: definition(1).steps.map((s) => ({ ...s, outputs: ['另一份报告.md'] })),
    },
  });
  const second = state.configuration.templates.at(-1).id;
  state = reduce(state, {
    type: 'CREATE_TASK',
    title: '连续更换执行',
    templateId: first,
    templateVersion: 1,
  });
  const id = state.tasks.at(-1).id;
  state = act(state, id, 'START_TASK');
  for (const templateId of [first, second]) {
    if (templateId === second)
      state = act(state, id, 'SET_TASK_WORKFLOW', {
        templateId,
        templateVersion: 1,
        expectedSnapshot: taskSnapshot(taskOf(state, id)),
        confirmChange: true,
        reason: '延续必要工作',
      });
    state = act(state, id, 'BIND_SESSION', { host: 'Codex' });
    state = act(state, id, 'START_STAGE');
    state = act(state, id, 'FINISH_STAGE', { outcome: 'review' });
  }
  const ids = taskOf(state, id).docs.map((d: any) => d.id);
  expect(new Set(ids).size).toBe(ids.length);
});
it('skips only an optional current step with a reason and keeps task completion separate', () => {
  let state = reduce(createInitialState(), {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    expectedRevision: 0,
    publish: true,
    definition: {
      ...definition(1),
      steps: definition(1).steps.map((s) => ({ ...s, required: false })),
    },
  });
  const templateId = state.configuration.templates.at(-1).id;
  state = reduce(state, { type: 'CREATE_TASK', title: '可选复核', templateId, templateVersion: 1 });
  const id = state.tasks.at(-1).id;
  state = act(state, id, 'START_TASK');
  expect(() => act(state, id, 'SKIP_WORKFLOW_STEP', { expectedStage: 0, reason: '' })).toThrow();
  state = act(state, id, 'SKIP_WORKFLOW_STEP', { expectedStage: 0, reason: '本次范围不需要复核' });
  expect(taskOf(state, id).accepted[0]).toBe(true);
  expect(taskOf(state, id).status).toBe('in_progress');
  expect(taskOf(state, id).stepSkips[0].reason).toBe('本次范围不需要复核');
});
it('retains the historical type reference after recategorization, preventing deletion', () => {
  let state = reduce(createInitialState(), {
    type: 'SAVE_TASK_TYPE',
    definition: { name: '原分类', description: '', icon: 'task', recommendedTemplateIds: [] },
  });
  const typeId = state.configuration.taskTypes.at(-1).id;
  state = reduce(state, { type: 'CREATE_TASK', title: '保留分类历史', taskType: typeId });
  const id = state.tasks.at(-1).id;
  state = act(state, id, 'UPDATE_TASK_TYPE', { taskType: 'development' });
  expect(() => reduce(state, { type: 'DELETE_TASK_TYPE', typeId })).toThrow(/type-in-use/);
});
it('requires an explicit reason to omit an optional step before task review', () => {
  let state = reduce(createInitialState(), {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    expectedRevision: 0,
    publish: true,
    definition: {
      ...definition(1),
      steps: definition(1).steps.map((s) => ({ ...s, required: false })),
    },
  });
  const templateId = state.configuration.templates.at(-1).id;
  state = reduce(state, { type: 'CREATE_TASK', title: '可选步骤仍需明确处置' });
  const id = state.tasks.at(-1).id;
  state = act(state, id, 'START_TASK');
  state = act(state, id, 'SAVE_TASK_SCOPE', { goal: '交付报告', criteria: ['结果可核查'] });
  state = act(state, id, 'ADD_TASK_ARTIFACT', {
    title: '任务报告.md',
    body: '本轮成果',
    coverageComplete: true,
  });
  const doc = taskOf(state, id).docs.at(-1);
  state = act(state, id, 'SET_TASK_WORKFLOW', {
    templateId,
    templateVersion: 1,
    expectedSnapshot: taskSnapshot(taskOf(state, id)),
    confirmChange: true,
    reason: '选择可选复核',
    reuseDocumentIds: [doc.id],
  });
  expect(getTaskReview(state, taskOf(state, id)).allowed).toBe(false);
  state = act(state, id, 'SKIP_WORKFLOW_STEP', { expectedStage: 0, reason: '本次不需要额外复核' });
  expect(getTaskReview(state, taskOf(state, id)).allowed).toBe(true);
});
it('returns optional-step execution state to idle before starting the following step', () => {
  let state = reduce(createInitialState(), {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    expectedRevision: 0,
    publish: true,
    definition: {
      ...definition(2),
      steps: definition(2).steps.map((s, i) => ({ ...s, required: i !== 0 })),
    },
  });
  const templateId = state.configuration.templates.at(-1).id;
  state = reduce(state, {
    type: 'CREATE_TASK',
    title: '跳过并继续',
    templateId,
    templateVersion: 1,
  });
  const id = state.tasks.at(-1).id;
  state = act(state, id, 'START_TASK');
  state = act(state, id, 'BIND_SESSION', { host: 'Codex' });
  state = act(state, id, 'START_STAGE');
  state = act(state, id, 'FINISH_STAGE', { outcome: 'review' });
  state = act(state, id, 'SKIP_WORKFLOW_STEP', {
    expectedStage: 0,
    reason: '采用后续步骤直接处理',
  });
  expect(taskOf(state, id).attention).toBe('idle');
  expect(taskOf(state, id).docs[0].outcome).toBe('review');
  state = act(state, id, 'BIND_SESSION', { host: 'Codex' });
  state = act(state, id, 'START_STAGE');
  expect(taskOf(state, id).attention).toBe('running');
});
it('retains skip history but requires a fresh decision after internal rework or scope change', () => {
  let state = reduce(createInitialState(), {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    expectedRevision: 0,
    publish: true,
    definition: {
      ...definition(1),
      steps: definition(1).steps.map((s) => ({ ...s, required: false })),
    },
  });
  const templateId = state.configuration.templates.at(-1).id;
  state = reduce(state, { type: 'CREATE_TASK', title: '跳过适用性' });
  const id = state.tasks.at(-1).id;
  state = act(state, id, 'START_TASK');
  state = act(state, id, 'SAVE_TASK_SCOPE', { goal: '交付', criteria: ['完整报告'] });
  state = act(state, id, 'ADD_TASK_ARTIFACT', {
    title: '报告.md',
    body: '当前材料',
    coverageComplete: true,
  });
  const doc = taskOf(state, id).docs.at(-1);
  state = act(state, id, 'SET_TASK_WORKFLOW', {
    templateId,
    templateVersion: 1,
    expectedSnapshot: taskSnapshot(taskOf(state, id)),
    confirmChange: true,
    reason: '可选复核',
    reuseDocumentIds: [doc.id],
  });
  const reused = taskOf(state, id).docs.at(-1);
  state = act(state, id, 'SKIP_WORKFLOW_STEP', { expectedStage: 0, reason: '原范围无需额外复核' });
  expect(getTaskReview(state, taskOf(state, id)).allowed).toBe(true);
  state = act(state, id, 'REOPEN_STAGE', { stage: 0, reason: '重新核对该步骤' });
  expect(getTaskReview(state, taskOf(state, id)).allowed).toBe(false);
  state = act(state, id, 'SKIP_WORKFLOW_STEP', { expectedStage: 0, reason: '复核后仍不需要' });
  state = act(state, id, 'SAVE_TASK_SCOPE', { goal: '新增范围', criteria: ['重新核对材料'] });
  state = act(state, id, 'REUSE_TASK_ARTIFACT', {
    documentId: reused.id,
    expectedScopeRevision: taskOf(state, id).scopeRevision,
  });
  expect(getTaskReview(state, taskOf(state, id)).allowed).toBe(false);
  expect(taskOf(state, id).stepSkips).toHaveLength(2);
});
it('does not publish unchanged content even when the published definition was explicitly saved as a draft', () => {
  let state = createTemplate(createInitialState());
  const templateId = state.configuration.templates.at(-1).id;
  state = reduce(state, {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    templateId,
    expectedRevision: 1,
    definition: definition(),
    publish: false,
  });
  const before = structuredClone(state);
  expect(() =>
    reduce(state, {
      type: 'SAVE_WORKFLOW_TEMPLATE',
      templateId,
      expectedRevision: 2,
      definition: definition(),
      publish: true,
    }),
  ).toThrow(/template-no-changes/);
  expect(state).toEqual(before);
});

it('continues a pinned task through acceptance after its type and template are disabled and a successor is published', () => {
  let state = createTemplate(createInitialState(), 1);
  const templateId = state.configuration.templates.at(-1).id;
  state = reduce(state, {
    type: 'SAVE_TASK_TYPE',
    definition: {
      name: '独立复核',
      description: '',
      icon: 'review',
      recommendedTemplateIds: [templateId],
    },
  });
  const typeId = state.configuration.taskTypes.at(-1).id;
  state = reduce(state, {
    type: 'CREATE_TASK',
    title: '停用后完成原承诺',
    taskType: typeId,
    templateId,
    templateVersion: 1,
  });
  const id = state.tasks.at(-1).id;
  const adopted = structuredClone(taskOf(state, id).workflow);
  state = reduce(state, {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    templateId,
    expectedRevision: 1,
    publish: true,
    definition: { ...definition(1), description: '新版追加的要求', steps: definition(2).steps },
  });
  state = reduce(state, { type: 'SET_TASK_TYPE_ENABLED', typeId, enabled: false });
  state = reduce(state, { type: 'SET_WORKFLOW_TEMPLATE_ENABLED', templateId, enabled: false });
  state = createMockWorkbenchRuntime({
    storage: { getItem: () => JSON.stringify({ version: 3, model: state }), setItem() {} },
  }).load();
  expect(taskOf(state, id).workflow).toEqual(adopted);
  state = act(state, id, 'START_TASK');
  state = act(state, id, 'SAVE_TASK_SCOPE', { goal: '原版本约定', criteria: ['结果可核查'] });
  state = act(state, id, 'ADD_TASK_ARTIFACT', {
    title: '原约定报告.md',
    body: '原范围独立复核结果',
    coverageComplete: true,
  });
  const doc = taskOf(state, id).docs.at(-1);
  state = act(state, id, 'ACCEPT_STAGE', {
    expectedStage: 0,
    documentId: doc.id,
    documentVersion: doc.version,
  });
  state = act(state, id, 'SUBMIT_TASK_REVIEW', {
    expectedSnapshot: getTaskReview(state, taskOf(state, id)).snapshot,
  });
  state = act(state, id, 'COMPLETE_TASK', {
    expectedSnapshot: getTaskCompletion(state, taskOf(state, id)).snapshot,
    criterionIds: taskOf(state, id).criteria.map((c: any) => c.id),
  });
  expect(taskOf(state, id).status).toBe('done');
  expect(taskOf(state, id).workflow).toEqual(adopted);
  expect(taskOf(state, id).reviews[0].taskTypeName).toBe('独立复核');
});

it('round-trips carried duplicate and multiline criteria without invalidating scope or evidence', () => {
  let state = reduce(createInitialState(), {
    type: 'SAVE_WORKFLOW_TEMPLATE',
    expectedRevision: 0,
    publish: true,
    definition: {
      ...definition(1),
      steps: definition(1).steps.map((s) => ({ ...s, goal: '第一行\n第二行' })),
    },
  });
  const templateId = state.configuration.templates.at(-1).id;
  state = reduce(state, {
    type: 'CREATE_TASK',
    title: '保留条件身份',
    templateId,
    templateVersion: 1,
  });
  const id = state.tasks.at(-1).id;
  state = act(state, id, 'START_TASK');
  state = act(state, id, 'SAVE_TASK_SCOPE', { goal: '完整交付', criteria: ['原条件'] });
  for (const selected of [null, templateId, null]) {
    state = act(state, id, 'SET_TASK_WORKFLOW', {
      templateId: selected,
      templateVersion: 1,
      expectedSnapshot: taskSnapshot(taskOf(state, id)),
      confirmChange: true,
      reason: '保留必要工作',
    });
  }
  state = act(state, id, 'ADD_TASK_ARTIFACT', {
    title: '交付报告.md',
    body: '当前范围已核对',
    coverageComplete: true,
  });
  const before = structuredClone(taskOf(state, id));
  expect(before.criteria.filter((c: any) => c.text.includes('第一行\n第二行'))).toHaveLength(2);
  state = act(state, id, 'SAVE_TASK_SCOPE', {
    goal: before.goal,
    criteria: toScopeCriteria(before.criteria),
    requirePassingResult: before.requirePassingResult,
  });
  expect(taskOf(state, id).criteria).toEqual(before.criteria);
  expect(taskOf(state, id).scopeRevision).toBe(before.scopeRevision);
  expect(taskOf(state, id).scopeHistory).toEqual(before.scopeHistory);
  expect(taskOf(state, id).accepted).toEqual(before.accepted);
  expect(taskOf(state, id).docs).toEqual(before.docs);
  expect(getTaskReview(state, taskOf(state, id)).allowed).toBe(true);
});
