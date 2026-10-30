import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, createInitialState, reduce } from '../../src/mock/model.js';
import { getStageReview } from '../../src/mock/personal-board.js';
import { DEMO_CONNECTOR_ID } from '../../src/mock/sources.js';

const get = (s, id = 'REQ-1042') => s.tasks.find((t) => t.id === id);
const act = (s, type, fields = {}) => reduce(s, { type, taskId: 'REQ-1042', ...fields });
const local = (flow = false) => {
  let state = act(createInitialState(), 'CREATE_TASK', { title: '新增本地任务' });
  const id = state.tasks.at(-1).id;
  state = act(state, 'START_TASK', { taskId: id });
  if (flow) state = act(state, 'SET_TASK_WORKFLOW', { taskId: id, templateId: 'development' });
  return { state, id };
};
const bound = (s, id) => act(s, 'BIND_SESSION', { taskId: id, host: 'Codex' });
const submitStep = (s, id) => {
  const t = get(s, id),
    d = getStageReview(s, t).document;
  return act(s, 'SUBMIT_STAGE_REVIEW', {
    taskId: id,
    expectedStage: t.stage,
    documentId: d?.id,
    documentVersion: d?.version,
  });
};

test('samples retain original content and separately demonstrate task review, Done and archive', () => {
  const s = createInitialState();
  assert.deepEqual(STAGES, ['需求', '设计', '开发', '验证']);
  assert.equal(get(s).title, '成员导入失败后自动补偿');
  assert.equal(get(s).status, 'in_progress');
  assert.equal(get(s).attention, 'review');
  assert.equal(get(s).workspace.ready, false);
  for (const status of ['todo', 'in_progress', 'review', 'done', 'archived'])
    assert.ok(
      s.tasks.some((t) => t.status === status),
      status,
    );
});

test('Agent output is not task submission, internal acceptance advances only the selected workflow', () => {
  let { state, id } = local(true);
  state = act(bound(state, id), 'START_STAGE', { taskId: id });
  state = act(state, 'FINISH_STAGE', { taskId: id, outcome: 'review' });
  assert.equal(get(state, id).status, 'in_progress');
  assert.equal(get(state, id).stage, 0);
  const result = get(state, id).docs[0];
  state = act(state, 'ACKNOWLEDGE_STEP_COVERAGE', {
    taskId: id,
    documentId: result.id,
    documentVersion: result.version,
    coverageComplete: true,
  });
  const doc = structuredClone(get(state, id).docs[0]);
  state = act(state, 'ACCEPT_STAGE', { taskId: id });
  assert.equal(get(state, id).stage, 1);
  assert.deepEqual(get(state, id).accepted, [true, false, false, false]);
  assert.equal(get(state, id).status, 'in_progress');
  assert.deepEqual(get(state, id).docs[0], doc);
});

test('each internal step needs its own exact, current evidence and prior acceptance', () => {
  for (const mutate of [
    (s) => (get(s).docs = []),
    (s) => (get(s).docs.at(-1).body = ' '),
    (s) => (get(s).docs.at(-1).stale = true),
    (s) => (get(s).docs.at(-1).outcome = 'failed'),
    (s) => (get(s).accepted[0] = false),
    (s) => s.sessions.push({ id: 'extra', taskId: 'REQ-1042', status: 'unknown' }),
  ]) {
    const s = createInitialState();
    mutate(s);
    const before = structuredClone(s);
    assert.throws(() => act(s, 'ACCEPT_STAGE'));
    assert.deepEqual(s, before);
  }
  const s = createInitialState();
  assert.throws(
    () => act(s, 'ACCEPT_STAGE', { expectedStage: 1, documentId: 'wrong', documentVersion: 2 }),
    /快照/,
  );
});

test('manual workflow artifacts keep versions; feedback makes prior content stale', () => {
  let s = createInitialState();
  const old = structuredClone(get(s).docs);
  s = act(s, 'REQUEST_CHANGES', { feedback: '补充失败恢复' });
  assert.deepEqual(get(s).docs[0], old[0]);
  assert.ok(
    get(s)
      .docs.filter((d) => d.stage === 1)
      .every((d) => d.stale),
  );
  assert.throws(() => act(s, 'ACCEPT_STAGE'));
  s = act(s, 'SAVE_DOCUMENT', { title: '补偿方案.md', kind: '设计', body: '新方案' });
  assert.equal(get(s).docs.at(-1).version, 3);
  assert.equal(get(s).docs.at(-1).origin.actor, 'manual');
  s = submitStep(s, 'REQ-1042');
  s = act(s, 'ACCEPT_STAGE');
  assert.equal(get(s).stage, 2);
  assert.equal(old.at(-1).version, 2);
});

test('workflow rework preserves upstream evidence and invalidates affected downstream versions', () => {
  const s = createInitialState(),
    before = structuredClone(s);
  const next = act(s, 'REOPEN_STAGE', { taskId: 'REQ-1039', stage: 2, reason: '修正实现' });
  assert.deepEqual(get(next, 'REQ-1039').accepted, [true, true, false, false]);
  assert.equal(get(next, 'REQ-1039').docs[0].stale, true);
  assert.equal(get(next, 'REQ-1039').sessionId, null);
  assert.equal(get(next, 'REQ-1039').workspace.verified, false);
  assert.deepEqual(s, before);
  assert.throws(() => act(s, 'REOPEN_STAGE', { stage: 3, reason: 'future' }));
});

test('no-flow Agent execution needs an exact session, but no fabricated repository or stage', () => {
  let { state, id } = local();
  assert.throws(() => act(state, 'START_STAGE', { taskId: id }), /会话/);
  state = bound(state, id);
  assert.equal(get(state, id).stage, null);
  assert.equal(get(state, id).repo, '');
  state = act(state, 'START_STAGE', { taskId: id });
  state = act(state, 'FINISH_STAGE', { taskId: id, outcome: 'review' });
  assert.equal(get(state, id).status, 'in_progress');
  assert.equal(get(state, id).docs[0].stage, null);
  assert.equal(get(state, id).docs[0].origin.host, 'Codex');
});

test('code execution checks workspace, real session binding, branch and prerequisites', () => {
  let s = act(createInitialState(), 'ACCEPT_STAGE');
  assert.throws(() => bound(s, 'REQ-1042'), /工作区/);
  s = act(s, 'PREPARE_WORKSPACE');
  assert.equal(get(s).workspace.verified, false);
  s = bound(s, 'REQ-1042');
  assert.equal(get(s).workspace.verified, true);
  for (const mutate of [
    (s) => (get(s).accepted[1] = false),
    (s) => (get(s).workspace.verified = false),
    (s) => (s.sessions.find((x) => x.id === get(s).sessionId).branch = 'wrong'),
  ]) {
    const broken = structuredClone(s);
    mutate(broken);
    assert.throws(() => act(broken, 'START_STAGE'));
  }
});

test('a running task cannot duplicate execution or silently rebind its session', () => {
  let { state, id } = local();
  state = act(bound(state, id), 'START_STAGE', { taskId: id });
  const old = get(state, id).sessionId;
  assert.throws(() => act(state, 'START_STAGE', { taskId: id }), /运行/);
  assert.throws(() => bound(state, id), /执行/);
  assert.equal(get(state, id).sessionId, old);
  const forged = structuredClone(state);
  get(forged).sessionId = old;
  get(forged).attention = 'idle';
  assert.throws(() => act(forged, 'START_STAGE'), /会话/);
});

test('unknown results retain ownership; stopping and ordinary retry never guess a terminal result', () => {
  let { state, id } = local();
  state = act(bound(state, id), 'START_STAGE', { taskId: id });
  state = act(state, 'FINISH_STAGE', { taskId: id, outcome: 'unknown' });
  const sessionId = get(state, id).sessionId;
  for (const type of ['RETRY_STAGE', 'STOP_STAGE', 'BIND_SESSION'])
    assert.throws(() => act(state, type, { taskId: id, host: 'Codex' }), /未知/);
  assert.throws(() => act(state, 'REQUEUE_TASK', { taskId: id }));
  assert.equal(get(state, id).sessionId, sessionId);
  state = act(state, 'RECONCILE_STAGE', { taskId: id, outcome: 'review' });
  assert.equal(state.sessions.find((s) => s.id === sessionId).status, 'ended');
  assert.equal(get(state, id).status, 'in_progress');
});

test('pause is an independent control; accurate waiting replies continue without unpausing', () => {
  let { state, id } = local();
  state = act(bound(state, id), 'START_STAGE', { taskId: id });
  state = act(state, 'FINISH_STAGE', { taskId: id, outcome: 'waiting' });
  state = act(state, 'TOGGLE_PAUSE', { taskId: id });
  assert.equal(get(state, id).status, 'in_progress');
  assert.equal(get(state, id).paused, true);
  state = act(state, 'RESUME_STAGE', { taskId: id, reply: '仅答复本轮问题' });
  assert.equal(get(state, id).attention, 'running');
  assert.equal(get(state, id).paused, true);
  state = act(state, 'STOP_STAGE', { taskId: id });
  assert.throws(() => act(state, 'START_STAGE', { taskId: id }), /暂停/);
  assert.throws(() => act(state, 'ARCHIVE_TASK', { taskId: id }));
});

test('failure, retry and waiting preserve actual results and new versions', () => {
  let { state, id } = local();
  state = act(bound(state, id), 'START_STAGE', { taskId: id });
  state = act(state, 'FINISH_STAGE', { taskId: id, outcome: 'failed' });
  const first = structuredClone(get(state, id).docs[0]);
  state = act(state, 'RETRY_STAGE', { taskId: id });
  assert.deepEqual(get(state, id).docs[0], first);
  state = act(state, 'START_STAGE', { taskId: id });
  state = act(state, 'FINISH_STAGE', { taskId: id, outcome: 'review' });
  assert.deepEqual(
    get(state, id).docs.map((d) => d.version),
    [1, 2],
  );
  assert.equal(first.outcome, 'failed');
});

test('document and workspace provenance remain separate from task source', () => {
  const s = createInitialState();
  assert.equal(get(s).origin.connectorId, DEMO_CONNECTOR_ID);
  assert.equal(get(s).docs[0].origin.kind, 'connector');
  assert.equal(get(s).docs[1].origin.kind, 'host');
  const changed = act(s, 'SAVE_DOCUMENT', { title: '补偿方案.md', kind: '设计', body: '人工修订' });
  assert.deepEqual(get(changed).docs.at(-1).origin, {
    kind: 'local',
    system: 'reed',
    actor: 'manual',
  });
  const prep = act(s, 'PREPARE_WORKSPACE');
  assert.equal(get(prep).workspace.origin.system, 'git');
  assert.equal(prep.events.at(-1).origin.system, 'reed');
});

test('history links grant no execution binding and invalid links do not change the input', () => {
  const { state, id } = local();
  const before = structuredClone(state);
  const linked = act(state, 'LINK_SESSION', { taskId: id, sessionId: 'session-design' });
  assert.ok(get(linked, id).sessionIds.includes('session-design'));
  assert.equal(get(linked, id).sessionId, null);
  assert.throws(() => act(linked, 'START_STAGE', { taskId: id }));
  assert.deepEqual(state, before);
  assert.throws(() => act(state, 'LINK_SESSION', { taskId: id, sessionId: 'missing' }));
});

test('source imports deduplicate per exact connector/project identity and retain local defaults', () => {
  let s = createInitialState();
  s = act(s, 'IMPORT_TASK', {
    connectorId: DEMO_CONNECTOR_ID,
    externalId: 'REQ-X',
    title: '云效需求',
  });
  const id = s.tasks.at(-1).id;
  const count = s.tasks.length;
  s = act(s, 'IMPORT_TASK', {
    connectorId: DEMO_CONNECTOR_ID,
    externalId: 'REQ-X',
    title: '重复导入',
  });
  assert.equal(s.tasks.length, count);
  assert.equal(get(s, id).status, 'todo');
  assert.equal(get(s, id).workflow, null);
  s = act(s, 'UPDATE_TASK', { taskId: id, title: '本地修订' });
  assert.equal(get(s, id).sync, 'pending');
  for (const choice of ['local', 'remote']) {
    s = act(s, 'SET_SYNC', { taskId: id, value: 'conflict' });
    s = act(s, 'RESOLVE_SYNC', { taskId: id, choice });
  }
  s = act(s, 'SET_SYNC', { taskId: id, value: 'unknown' });
  assert.throws(() => act(s, 'RESOLVE_SYNC', { taskId: id, choice: 'local' }), /未知/);
});

test('disabled/readonly sources preserve local work while rejecting import and outbound writes', () => {
  let s = createInitialState();
  s = act(s, 'TOGGLE_CONNECTOR', { connectorId: DEMO_CONNECTOR_ID });
  assert.throws(() =>
    act(s, 'IMPORT_TASK', { connectorId: DEMO_CONNECTOR_ID, externalId: 'X', title: 'x' }),
  );
  s = act(s, 'SAVE_DOCUMENT', { title: '本地继续.md', kind: '设计', body: '保留本地工作' });
  assert.equal(get(s).docs.at(-1).body, '保留本地工作');
  assert.throws(() => act(s, 'SET_SYNC', { value: 'synced' }));
});

test('reducer is immutable, rejects malformed commands, and reset samples are independent', () => {
  const state = createInitialState(),
    before = structuredClone(state);
  const next = act(state, 'ACCEPT_STAGE');
  assert.deepEqual(state, before);
  assert.notEqual(next, state);
  assert.throws(() => act(state, 'CREATE_TASK', { title: '' }));
  assert.throws(() => act(state, 'INVALID'));
  assert.throws(() => act(state, 'ACCEPT_STAGE', { taskId: 'missing' }));
  next.tasks[0].notes.push('another');
  assert.deepEqual(createInitialState(), before);
});

test('the no-workflow waiting sample can answer its exact existing session', () => {
  const initial = createInitialState();
  const task = get(initial, 'REQ-1043');
  const next = act(initial, 'RESUME_STAGE', { taskId: task.id, reply: '重复手机号跳过并记录' });
  assert.equal(get(next, task.id).attention, 'running');
  assert.equal(get(next, task.id).workflow, null);
});
