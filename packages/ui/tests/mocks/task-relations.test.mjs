import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../../src/mock/model.js';
import { normalizeState } from '../../src/mock/sources.js';
import { getTaskReview, getTaskCompletion } from '../../src/mock/task-lifecycle.js';
const create = (state, title) => reduce(state, { type: 'CREATE_TASK', title });
const get = (state, id) => state.tasks.find((t) => t.id === id);
const act = (state, id, type, fields = {}) => reduce(state, { type, taskId: id, ...fields });
const link = (state, from, to, kind = 'child', fields = {}) =>
  act(state, from, 'LINK_TASK', { targetTaskId: to, relationKind: kind, ...fields });
const pair = () => {
  let state = create(create(createInitialState(), '父任务'), '子任务');
  return { state, parent: state.tasks.at(-2).id, child: state.tasks.at(-1).id };
};
const prepare = (state, id) => {
  state = act(state, id, 'START_TASK');
  state = act(state, id, 'SAVE_TASK_SCOPE', { goal: '交付约定内容', criteria: ['交付完整'] });
  return act(state, id, 'ADD_TASK_ARTIFACT', {
    title: '交付.md',
    body: '完整成果',
    coverageComplete: true,
  });
};
const complete = (state, id) => {
  state = act(state, id, 'SUBMIT_TASK_REVIEW', {
    expectedSnapshot: getTaskReview(state, get(state, id)).snapshot,
  });
  return act(state, id, 'COMPLETE_TASK', {
    expectedSnapshot: getTaskCompletion(state, get(state, id)).snapshot,
    criterionIds: get(state, id).criteria.map((c) => c.id),
  });
};

test('creating a child links an independent To do task without copying execution or lifecycle', () => {
  const initial = createInitialState(),
    parent = initial.tasks[0];
  const before = structuredClone(initial);
  const next = act(initial, parent.id, 'CREATE_RELATED_TASK', {
    title: '后端实现',
    taskType: 'development',
    relationKind: 'child',
  });
  const child = next.tasks.at(-1);
  assert.equal(child.status, 'todo');
  assert.equal(child.workflow, null);
  assert.equal(child.project, parent.project);
  assert.equal(child.sessionId, null);
  assert.deepEqual(child.sessionIds, []);
  assert.equal(child.repo, '');
  assert.equal(child.workspace.ready, false);
  assert.ok(
    next.relations.some(
      (r) => r.kind === 'child' && r.fromTaskId === parent.id && r.toTaskId === child.id,
    ),
  );
  assert.equal(get(next, parent.id).status, parent.status);
  assert.deepEqual(initial, before);
});

test('linking rejects self edges, second parents, structural cycles and missing tasks without mutations', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child);
  state = create(state, '另一个父任务');
  const other = state.tasks.at(-1).id;
  for (const [from, to] of [
    [parent, parent],
    [other, child],
    [child, parent],
    [parent, 'missing'],
  ]) {
    const before = structuredClone(state);
    assert.throws(() => link(state, from, to));
    assert.deepEqual(state, before);
  }
  const duplicate = link(state, parent, child);
  assert.equal(duplicate.relations.length, state.relations.length);
});

test('ordinary association is symmetric, nonblocking and does not change either task scope', () => {
  const { state, parent, child } = pair();
  const next = link(state, parent, child, 'related');
  const again = link(next, child, parent, 'related');
  assert.equal(again.relations.length, next.relations.length);
  assert.equal(get(again, parent).scopeRevision, 0);
  assert.equal(get(again, child).scopeRevision, 0);
});

test('necessary deliverables require explicit scope confirmation and reject combined waiting cycles', () => {
  const { state, parent, child } = pair();
  assert.throws(() => link(state, parent, child, 'child', { required: true }));
  const linked = link(state, parent, child, 'child', { required: true, confirmScopeChange: true });
  assert.throws(() =>
    link(linked, child, parent, 'dependency', { required: true, confirmScopeChange: true }),
  );
});

test('required child completion is checked but never automatically completes the parent', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child, 'child', { required: true, confirmScopeChange: true });
  state = prepare(state, parent);
  assert.equal(getTaskReview(state, get(state, parent)).allowed, false);
  state = complete(prepare(state, child), child);
  assert.equal(get(state, parent).status, 'in_progress');
  assert.equal(getTaskReview(state, get(state, parent)).allowed, true);
  state = complete(state, parent);
  assert.equal(get(state, parent).status, 'done');
  assert.ok(get(state, parent).completions.at(-1).requiredRelations.length);
  const decided = structuredClone(get(state, parent).completions.at(-1));
  state = act(state, child, 'REOPEN_TASK', { reason: '拓展子任务新范围' });
  assert.equal(get(state, parent).status, 'done');
  assert.equal(get(state, parent).completions.at(-1).applicability, 'valid');
  assert.equal(get(state, parent).completions.at(-1).id, decided.id);
});

test('late changes to the accepted child evidence invalidate its parent basis without changing historical lifecycle', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child, 'child', { required: true, confirmScopeChange: true });
  state = prepare(state, parent);
  state = complete(prepare(state, child), child);
  state = complete(state, parent);
  get(state, child).docs[0].body = 'accepted content was changed';
  state = act(state, parent, 'ARCHIVE_TASK');
  assert.equal(get(state, parent).status, 'archived');
  assert.equal(get(state, parent).completions.at(-1).applicability, 'pending');
});

test('the relation example is opt-in, idempotent and keeps all existing tasks and user drafts', () => {
  const state = createInitialState();
  const before = structuredClone(state);
  const next = reduce(state, { type: 'ADD_RELATION_EXAMPLES' });
  assert.ok(next.relationExampleRootId);
  assert.ok(next.relations.filter((r) => r.kind === 'child').length >= 3);
  assert.deepEqual(next.tasks.slice(0, state.tasks.length), state.tasks);
  const again = reduce(next, { type: 'ADD_RELATION_EXAMPLES' });
  assert.deepEqual(again, next);
  assert.deepEqual(state, before);
});

test('same-scope internal rework retracts affected old evidence while new-scope expansion does not', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child, 'child', { required: true, confirmScopeChange: true });
  state = act(state, child, 'START_TASK');
  state = act(state, child, 'SET_TASK_WORKFLOW', { templateId: 'development' });
  state = act(state, child, 'SAVE_TASK_SCOPE', {
    goal: '完成研发交付',
    criteria: ['全部步骤满足约定'],
  });
  for (let stage = 0; stage < 4; stage++) {
    state = act(state, child, 'ADD_TASK_ARTIFACT', {
      title: `步骤${stage}.md`,
      body: '已完成的独立成果',
      coverageComplete: true,
    });
    const document = get(state, child).docs.at(-1);
    state = act(state, child, 'ACCEPT_STAGE', {
      expectedStage: stage,
      documentId: document.id,
      documentVersion: document.version,
    });
  }
  state = complete(state, child);
  state = complete(prepare(state, parent), parent);
  state = act(state, child, 'REOPEN_TASK', { reason: '原验证发现误判' });
  state = act(state, child, 'REOPEN_STAGE', { stage: 3, reason: '原范围验证报告有误' });
  state = act(state, parent, 'ARCHIVE_TASK');
  assert.equal(get(state, parent).completions.at(-1).applicability, 'pending');
  assert.equal(get(state, child).completions.at(-1).applicability, 'pending');
});

test('a frozen parent review cannot complete after its accepted child result is retracted', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child, 'child', { required: true, confirmScopeChange: true });
  state = act(state, child, 'START_TASK');
  state = act(state, child, 'SET_TASK_WORKFLOW', { templateId: 'development' });
  state = act(state, child, 'SAVE_TASK_SCOPE', { goal: '完整交付', criteria: ['步骤全部完成'] });
  for (let stage = 0; stage < 4; stage++) {
    state = act(state, child, 'ADD_TASK_ARTIFACT', {
      title: `材料${stage}.md`,
      body: '已确认成果',
      coverageComplete: true,
    });
    const document = get(state, child).docs.at(-1);
    state = act(state, child, 'ACCEPT_STAGE', {
      expectedStage: stage,
      documentId: document.id,
      documentVersion: document.version,
    });
  }
  state = complete(state, child);
  state = prepare(state, parent);
  state = act(state, parent, 'SUBMIT_TASK_REVIEW', {
    expectedSnapshot: getTaskReview(state, get(state, parent)).snapshot,
  });
  const frozen = get(state, parent).review.snapshot;
  state = act(state, child, 'REOPEN_TASK', { reason: '原范围纠错' });
  state = act(state, child, 'REOPEN_STAGE', { stage: 3, reason: '撤销原验证结论' });
  assert.equal(getTaskCompletion(state, get(state, parent)).allowed, false);
  assert.throws(
    () =>
      act(state, parent, 'COMPLETE_TASK', {
        expectedSnapshot: frozen,
        criterionIds: get(state, parent).criteria.map((c) => c.id),
      }),
    /relation.check-deliveries/,
  );
  assert.equal(get(state, parent).status, 'review');
});

test('same-scope manual correction retracts accepted child evidence and blocks a frozen parent review', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child, 'child', { required: true, confirmScopeChange: true });
  state = complete(prepare(state, child), child);
  state = prepare(state, parent);
  state = act(state, parent, 'SUBMIT_TASK_REVIEW', {
    expectedSnapshot: getTaskReview(state, get(state, parent)).snapshot,
  });
  const original = structuredClone(get(state, child).docs[0]);
  state = act(state, child, 'REOPEN_TASK', { reason: '原报告误判，需要纠正' });
  state = act(state, child, 'ADD_TASK_ARTIFACT', {
    sourceDocId: original.id,
    title: '更正报告.md',
    body: '原报告不成立',
    outcome: 'failed',
    coverageComplete: true,
  });
  assert.equal(get(state, child).completions.at(-1).applicability, 'pending');
  assert.deepEqual(get(state, child).docs[0], original);
  assert.equal(getTaskCompletion(state, get(state, parent)).allowed, false);
  assert.throws(
    () =>
      act(state, parent, 'COMPLETE_TASK', {
        expectedSnapshot: getTaskCompletion(state, get(state, parent)).snapshot,
        criterionIds: get(state, parent).criteria.map((c) => c.id),
      }),
    /relation.check-deliveries/,
  );
});

test('same-title corrections immediately mark completed ancestors pending and retain that fact on reload', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child, 'child', { required: true, confirmScopeChange: true });
  state = complete(prepare(state, child), child);
  state = complete(prepare(state, parent), parent);
  state = act(state, child, 'REOPEN_TASK', { reason: '原范围修正' });
  state = act(state, child, 'ADD_TASK_ARTIFACT', {
    title: '交付.md',
    body: '修正错误结论',
    outcome: 'failed',
    coverageComplete: true,
  });
  assert.equal(get(state, parent).status, 'done');
  assert.equal(get(state, parent).completions.at(-1).applicability, 'pending');
  assert.equal(get(normalizeState(state), parent).completions.at(-1).applicability, 'pending');
});

test('new-scope child work preserves the exact prior result accepted by a parent review', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child, 'dependency', { required: true, confirmScopeChange: true });
  state = complete(prepare(state, child), child);
  state = prepare(state, parent);
  state = act(state, parent, 'SUBMIT_TASK_REVIEW', {
    expectedSnapshot: getTaskReview(state, get(state, parent)).snapshot,
  });
  const bound = get(state, parent).review.requiredRelations[0].completionId;
  state = act(state, child, 'REOPEN_TASK', { reason: '新增另一轮范围' });
  state = act(state, child, 'SAVE_TASK_SCOPE', { goal: '扩展交付', criteria: ['覆盖新范围'] });
  state = act(state, child, 'ADD_TASK_ARTIFACT', {
    title: '交付.md',
    body: '下一轮成果',
    coverageComplete: true,
  });
  state = complete(state, child);
  assert.notEqual(get(state, child).completions.at(-1).id, bound);
  assert.equal(getTaskCompletion(state, get(state, parent)).allowed, true);
  state = act(state, parent, 'COMPLETE_TASK', {
    expectedSnapshot: getTaskCompletion(state, get(state, parent)).snapshot,
    criterionIds: get(state, parent).criteria.map((c) => c.id),
  });
  assert.equal(get(state, parent).completions.at(-1).requiredRelations[0].completionId, bound);
  assert.equal(get(normalizeState(state), parent).completions.at(-1).applicability, 'valid');
});

test('an open submission confirmation cannot silently bind a newer child completion', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child, 'child', { required: true, confirmScopeChange: true });
  state = complete(prepare(state, child), child);
  state = prepare(state, parent);
  const expectedSnapshot = getTaskReview(state, get(state, parent)).snapshot;
  state = act(state, child, 'REOPEN_TASK', { reason: '新增交付范围' });
  state = act(state, child, 'SAVE_TASK_SCOPE', { goal: '新增范围', criteria: ['新验收要求'] });
  state = act(state, child, 'ADD_TASK_ARTIFACT', {
    title: '交付.md',
    body: '新范围交付',
    coverageComplete: true,
  });
  state = complete(state, child);
  const before = structuredClone(state);
  assert.throws(
    () => act(state, parent, 'SUBMIT_TASK_REVIEW', { expectedSnapshot }),
    /task.snapshot-changed/,
  );
  assert.deepEqual(state, before);
  const fresh = getTaskReview(state, get(state, parent)).snapshot;
  state = act(state, parent, 'SUBMIT_TASK_REVIEW', { expectedSnapshot: fresh });
  assert.equal(
    get(state, parent).review.requiredRelations[0].completionId,
    get(state, child).completions.at(-1).id,
  );
});

test('same-named artifacts from different workflow steps all remain in the child and parent acceptance basis', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child, 'child', { required: true, confirmScopeChange: true });
  state = act(state, child, 'START_TASK');
  state = act(state, child, 'SET_TASK_WORKFLOW', { templateId: 'development' });
  state = act(state, child, 'SAVE_TASK_SCOPE', {
    goal: '逐步交付',
    criteria: ['四步成果均可复核'],
  });
  for (let stage = 0; stage < 4; stage++) {
    state = act(state, child, 'ADD_TASK_ARTIFACT', {
      title: '报告.md',
      body: `步骤 ${stage} 的成果`,
      coverageComplete: true,
    });
    const document = get(state, child).docs.at(-1);
    state = act(state, child, 'ACCEPT_STAGE', {
      expectedStage: stage,
      documentId: document.id,
      documentVersion: document.version,
    });
  }
  state = complete(state, child);
  assert.deepEqual(
    get(state, child).review.artifacts.map((doc) => doc.stage),
    [0, 1, 2, 3],
  );
  state = complete(prepare(state, parent), parent);
  const oldId = get(state, child).completions.at(-1).id;
  get(state, child).docs[0].body = '历史步骤的已接受内容被改变';
  state = normalizeState(state);
  assert.equal(get(state, child).completions.at(-1).id, oldId);
  assert.equal(get(state, parent).completions.at(-1).applicability, 'pending');
});

test('task-level artifacts without a legacy stage field use the same correction identity as null-stage artifacts', () => {
  let { state, parent, child } = pair();
  state = link(state, parent, child, 'child', { required: true, confirmScopeChange: true });
  state = prepare(state, child);
  delete get(state, child).docs[0].stage;
  state = complete(state, child);
  state = complete(prepare(state, parent), parent);
  state = act(state, child, 'REOPEN_TASK', { reason: '原范围更正' });
  state = act(state, child, 'ADD_TASK_ARTIFACT', {
    title: '交付.md',
    body: '纠正旧结论',
    coverageComplete: true,
  });
  assert.equal(get(state, child).completions.at(-1).applicability, 'pending');
  assert.equal(get(state, parent).completions.at(-1).applicability, 'pending');
});
