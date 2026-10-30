import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../../src/mock/model.js';
import { createMockWorkbenchRuntime } from '../../src/mock/index.ts';
import { getBoardColumn } from '../../src/mock/personal-board.js';

const services = createMockWorkbenchRuntime().services;
function scenario(type = 'uncategorized') {
  let state = reduce(createInitialState(), {
    type: 'CREATE_TASK',
    title: '独立任务',
    taskType: type,
  });
  const id = state.tasks.at(-1).id;
  const task = () => state.tasks.find((item) => item.id === id);
  const act = (type, fields = {}) => (state = reduce(state, { type, taskId: id, ...fields }));
  const prepare = () => {
    act('START_TASK');
    act('SAVE_TASK_SCOPE', { goal: '完成约定交付', criteria: ['内容符合约定'] });
    act('ADD_TASK_ARTIFACT', {
      title: '交付.md',
      body: '完整成果',
      outcome: 'manual',
      coverageComplete: true,
    });
  };
  const submit = () =>
    act('SUBMIT_TASK_REVIEW', { expectedSnapshot: services.getTaskReview(state, task()).snapshot });
  const complete = () =>
    act('COMPLETE_TASK', {
      expectedSnapshot: services.getTaskCompletion(state, task()).snapshot,
      criterionIds: task().criteria.map((criterion) => criterion.id),
    });
  return { task, act, prepare, submit, complete, state: () => state };
}

test('title-only creation has an unclassified type, To do lifecycle and no internal workflow', () => {
  const s = scenario();
  assert.equal(s.task().status, 'todo');
  assert.equal(s.task().taskType, 'uncategorized');
  assert.equal(s.task().workflow, null);
  assert.equal(s.task().stage, null);
  assert.deepEqual(s.task().accepted, []);
  assert.equal(
    getBoardColumn({ ...s.task(), attention: 'review' }),
    'todo',
    'execution attention cannot submit a task',
  );
});

for (const type of ['requirement', 'development', 'test', 'verification', 'documentation']) {
  test(`${type}: manual task review, completion, archive, restore and reopen use one lifecycle`, () => {
    const s = scenario(type);
    s.prepare();
    assert.equal(s.task().status, 'in_progress');
    s.submit();
    assert.equal(s.task().status, 'review');
    s.complete();
    assert.equal(s.task().status, 'done');
    assert.equal(s.task().completions.length, 1);
    const oldDecision = structuredClone(s.task().completions[0]);
    s.act('ARCHIVE_TASK');
    assert.equal(getBoardColumn(s.task()), null);
    s.act('RESTORE_TASK');
    assert.equal(s.task().status, 'done');
    s.act('REOPEN_TASK', { reason: '补充范围' });
    assert.equal(s.task().status, 'in_progress');
    assert.equal(s.task().completions[0].id, oldDecision.id);
    assert.equal(s.task().docs.length, 1);
    assert.equal(s.task().workflow, null);
  });
}

test('task review requires scope, actual output, stopped execution and exact current snapshot', () => {
  const s = scenario();
  s.act('START_TASK');
  assert.throws(() => s.submit(), /goal|scope|产物|目标|验收|task\./i);
  s.prepare();
  const before = structuredClone(s.state());
  s.act('BIND_SESSION', { host: 'Codex' });
  s.act('START_STAGE');
  assert.throws(() => s.submit(), /执行|execution|task\./i);
  assert.throws(() => s.act('REQUEUE_TASK'), /执行|execution|task\./i);
  s.act('STOP_STAGE');
  const oldSnapshot = services.getTaskReview(s.state(), s.task()).snapshot;
  s.act('ADD_TASK_ARTIFACT', {
    title: '新版本.md',
    body: '后来补充',
    outcome: 'manual',
    coverageComplete: true,
  });
  assert.throws(
    () => s.act('SUBMIT_TASK_REVIEW', { expectedSnapshot: oldSnapshot }),
    /版本|snapshot|task\./i,
  );
  assert.equal(before.tasks.at(-1).docs.length, 1, 'the previous immutable snapshot is retained');
});

test('review changes require explicit withdrawal and a fresh task-level acceptance', () => {
  const s = scenario();
  s.prepare();
  s.submit();
  const old = structuredClone(s.task().review);
  assert.throws(
    () => s.act('SAVE_TASK_SCOPE', { goal: '新目标', criteria: ['新标准'] }),
    /撤回|review|task\./i,
  );
  assert.throws(
    () => s.act('ADD_TASK_ARTIFACT', { title: 'changed', body: 'changed' }),
    /撤回|review|task\./i,
  );
  assert.throws(
    () => s.act('COMPLETE_TASK', { expectedSnapshot: old.snapshot, criterionIds: [] }),
    /验收|criteria|task\./i,
  );
  s.act('WITHDRAW_TASK_REVIEW', { reason: '需修改' });
  assert.equal(s.task().status, 'in_progress');
  assert.equal(s.task().reviews[0].status, 'withdrawn');
  assert.equal(s.task().reviews[0].snapshot, old.snapshot);
  s.act('REQUEUE_TASK');
  assert.equal(s.task().status, 'todo');
  assert.equal(s.task().docs.length, 1);
});

test('failure reports may meet a reporting goal, but cannot fake passing or planned execution coverage', () => {
  for (const [requirePassingResult, outcome, coverageComplete, allowed] of [
    [false, 'failed', true, true],
    [true, 'failed', true, false],
    [false, 'not_run', false, false],
  ]) {
    const s = scenario('test');
    s.act('START_TASK');
    s.act('SAVE_TASK_SCOPE', {
      goal: '执行测试并报告',
      criteria: ['执行约定计划并报告'],
      requirePassingResult,
    });
    s.act('ADD_TASK_ARTIFACT', { title: '测试报告', body: '真实结果', outcome, coverageComplete });
    assert.equal(services.getTaskReview(s.state(), s.task()).allowed, allowed);
    if (allowed) {
      s.submit();
      s.complete();
      assert.equal(s.task().docs[0].outcome, 'failed');
    }
  }
});

test('only Done can archive; evidence applicability is retained on restore and cannot bypass reopen', () => {
  const s = scenario();
  s.prepare();
  assert.throws(() => s.act('ARCHIVE_TASK'), /完成|done|task\./i);
  s.submit();
  s.complete();
  s.act('ARCHIVE_TASK');
  s.task().completions[0].applicability = 'pending';
  s.act('RESTORE_TASK');
  assert.equal(s.task().status, 'done');
  assert.equal(s.task().completions[0].applicability, 'pending');
  assert.throws(
    () => s.act('SAVE_TASK_SCOPE', { goal: '绕过重开', criteria: ['x'] }),
    /重开|task\./i,
  );
  assert.equal(s.task().completions.length, 1);
});

test('an explicit workflow can finish its last internal step without completing the Task', () => {
  let state = createInitialState();
  let task = state.tasks.find((t) => t.id === 'REQ-1042');
  assert.ok(task.workflow);
  state = reduce(state, { type: 'ACCEPT_STAGE', taskId: task.id });
  task = state.tasks.find((t) => t.id === task.id);
  assert.equal(task.status, 'in_progress');
  assert.equal(task.completions.length, 0);
  const s = scenario();
  assert.throws(() => s.act('ACCEPT_STAGE'), /流程|workflow|task\./i);
});

test('manual task artifacts can be confirmed as optional internal step output without task completion', () => {
  const s = scenario();
  s.act('START_TASK');
  s.act('SET_TASK_WORKFLOW', { templateId: 'development' });
  s.act('ADD_TASK_ARTIFACT', {
    title: '当前步骤.md',
    body: '人工完成的步骤产物',
    coverageComplete: true,
  });
  const gate = services.getStageReview(s.state(), s.task());
  assert.ok(
    gate.checks.every((c) => c.passed),
    gate.checks
      .filter((c) => !c.passed)
      .map((c) => c.label)
      .join('；'),
  );
  s.act('SUBMIT_STAGE_REVIEW', {
    expectedStage: 0,
    documentId: gate.document.id,
    documentVersion: gate.document.version,
  });
  s.act('ACCEPT_STAGE');
  assert.equal(s.task().status, 'in_progress');
  assert.equal(s.task().accepted[0], true);
});

test('explicit manual internal confirmation does not require a simulated Agent attention state', () => {
  const s = scenario();
  s.act('START_TASK');
  s.act('SET_TASK_WORKFLOW', { templateId: 'development' });
  s.act('ADD_TASK_ARTIFACT', { title: '步骤说明.md', body: '人工成果', coverageComplete: true });
  const doc = s.task().docs.at(-1);
  s.act('ACCEPT_STAGE', { expectedStage: 0, documentId: doc.id, documentVersion: doc.version });
  assert.equal(s.task().accepted[0], true);
  assert.equal(s.task().status, 'in_progress');
});

test('source-backed task types are local classification and do not edit external identity or state', () => {
  const state = createInitialState();
  const before = structuredClone(state.tasks[0]);
  const next = reduce(state, {
    type: 'UPDATE_TASK_TYPE',
    taskId: before.id,
    taskType: 'documentation',
  });
  assert.equal(next.tasks[0].taskType, 'documentation');
  assert.deepEqual(next.tasks[0].origin, before.origin);
  assert.equal(next.tasks[0].remoteTitle, before.remoteTitle);
  assert.equal(next.tasks[0].sync, before.sync);
  assert.equal(next.tasks[0].status, before.status);
});

test('current invalid completion evidence blocks simulated outbound closure but preserves historical Done', () => {
  let state = createInitialState();
  const task = state.tasks.find((t) => t.id === 'LOCAL-8');
  task.origin = structuredClone(state.tasks[0].origin);
  task.source = '云效';
  task.sourceWorkItemType = 'requirement';
  task.docs[0].body = 'actual evidence changed';
  assert.throws(
    () => reduce(state, { type: 'SET_SYNC', taskId: task.id, value: 'synced' }),
    /completion-pending/,
  );
  assert.equal(task.status, 'done');
});

test('adopting a changed scope in a workflow reopens a reachable first step and preserves the old basis', () => {
  const initial = createInitialState();
  const old = structuredClone(initial.tasks[0]);
  let state = reduce(initial, {
    type: 'SAVE_TASK_SCOPE',
    taskId: old.id,
    goal: '修改后的完整范围',
    criteria: ['新范围可核查'],
  });
  let task = state.tasks[0];
  assert.equal(task.stage, 0);
  assert.equal(task.sessionId, null);
  assert.deepEqual(task.accepted, [false, false, false, false]);
  assert.equal(task.scopeHistory.at(-1).goal, old.goal);
  state = reduce(state, {
    type: 'ADD_TASK_ARTIFACT',
    taskId: old.id,
    title: '需求说明.md',
    body: '新范围说明',
    coverageComplete: true,
  });
  task = state.tasks[0];
  const doc = task.docs.at(-1);
  state = reduce(state, {
    type: 'ACCEPT_STAGE',
    taskId: old.id,
    expectedStage: 0,
    documentId: doc.id,
    documentVersion: doc.version,
  });
  assert.equal(state.tasks[0].stage, 1);
});

test('saving an artifact without explicit work coverage does not satisfy task review', () => {
  const s = scenario();
  s.act('START_TASK');
  s.act('SAVE_TASK_SCOPE', { goal: '执行约定工作', criteria: ['真实工作完成'] });
  s.act('ADD_TASK_ARTIFACT', { title: '仅保存.md', body: '内容保存不代表执行已完成' });
  assert.equal(services.getTaskReview(s.state(), s.task()).allowed, false);
});

test('task review freezes artifact provenance and rejects unknown or changed sources', () => {
  const s = scenario();
  s.prepare();
  const snapshot = services.getTaskReview(s.state(), s.task()).snapshot;
  s.task().docs[0].origin = { kind: 'host', host: 'Codex' };
  assert.throws(() => s.act('SUBMIT_TASK_REVIEW', { expectedSnapshot: snapshot }), /snapshot/);
  s.task().docs[0].origin = { kind: 'unknown' };
  assert.equal(services.getTaskReview(s.state(), s.task()).allowed, false);
  s.task().docs[0].origin = { kind: 'local', system: 'reed', actor: 'manual' };
  s.submit();
  assert.deepEqual(s.task().review.artifacts[0].origin, s.task().docs[0].origin);
});
