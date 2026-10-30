import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../../src/mock/model.js';
import { BOARD_COLUMNS, getBoardColumn, getBoardMove } from '../../src/mock/personal-board.js';
import { getTaskReview, getTaskCompletion } from '../../src/mock/task-lifecycle.js';
const fresh = () => {
  const state = reduce(createInitialState(), { type: 'CREATE_TASK', title: '看板任务' });
  return { state, id: state.tasks.at(-1).id };
};
const current = (s, id) => s.tasks.find((t) => t.id === id);
const act = (s, id, type, fields = {}) => reduce(s, { type, taskId: id, ...fields });
const ready = () => {
  let { state, id } = fresh();
  state = act(state, id, 'START_TASK');
  state = act(state, id, 'SAVE_TASK_SCOPE', { goal: '交付检查说明', criteria: ['材料完整'] });
  state = act(state, id, 'ADD_TASK_ARTIFACT', {
    title: '说明.md',
    body: '完成内容',
    outcome: 'manual',
    coverageComplete: true,
  });
  return { state, id };
};

test('personal board keeps four columns while archive is a separate lifecycle', () => {
  assert.deepEqual(
    BOARD_COLUMNS.map((c) => [c.id, c.label]),
    [
      ['todo', '待办'],
      ['in_progress', '处理中'],
      ['review', '评审中'],
      ['done', '已完成'],
    ],
  );
  assert.equal(getBoardColumn({ status: 'archived' }), null);
});

test('types, stages, attention, pauses and source sync never derive the task lifecycle', () => {
  for (const status of ['todo', 'in_progress', 'review', 'done'])
    for (const taskType of [
      'requirement',
      'development',
      'test',
      'verification',
      'documentation',
    ]) {
      const task = {
        status,
        taskType,
        stage: 3,
        accepted: [true, true, true, true],
        attention: 'review',
        paused: true,
        sync: 'unknown',
      };
      const before = structuredClone(task);
      assert.equal(getBoardColumn(task), status);
      assert.deepEqual(task, before);
    }
});

test('planning a drag is pure; start and requeue preserve records rather than clearing history', () => {
  let { state, id } = fresh();
  const before = structuredClone(state);
  assert.equal(getBoardMove(state, id, 'in_progress').kind, 'start');
  assert.deepEqual(state, before);
  state = act(state, id, 'START_TASK');
  state = act(state, id, 'ADD_TASK_ARTIFACT', { title: '已有工作', body: '保留' });
  assert.equal(getBoardMove(state, id, 'todo').kind, 'requeue');
  state = act(state, id, 'MOVE_BOARD', { target: 'todo' });
  assert.equal(current(state, id).docs.length, 1);
  assert.equal(current(state, id).status, 'todo');
});

test('dragging To do directly to Done cannot bypass task submission or explicit acceptance', () => {
  const { state, id } = fresh();
  const before = structuredClone(state);
  assert.equal(getBoardMove(state, id, 'done').allowed, false);
  assert.throws(() => act(state, id, 'MOVE_BOARD', { target: 'done' }));
  assert.deepEqual(state, before);
});

test('review drag requires exact current scope and output snapshot; stage acceptance alone is insufficient', () => {
  let { state, id } = ready();
  let plan = getBoardMove(state, id, 'review');
  assert.equal(plan.allowed, true);
  state = act(state, id, 'ADD_TASK_ARTIFACT', {
    title: '说明.md',
    body: '后来新内容',
    coverageComplete: true,
  });
  assert.throws(
    () => act(state, id, 'MOVE_BOARD', { target: 'review', expectedSnapshot: plan.snapshot }),
    /snapshot/,
  );
  plan = getBoardMove(state, id, 'review');
  state = act(state, id, 'MOVE_BOARD', { target: 'review', expectedSnapshot: plan.snapshot });
  assert.equal(current(state, id).status, 'review');
  assert.equal(getBoardMove(state, id, 'in_progress').kind, 'feedback');
  const complete = getBoardMove(state, id, 'done');
  assert.equal(complete.allowed, true);
  assert.throws(
    () =>
      act(state, id, 'MOVE_BOARD', {
        target: 'done',
        expectedSnapshot: complete.snapshot,
        criterionIds: [],
      }),
    /criteria/,
  );
  state = act(state, id, 'MOVE_BOARD', {
    target: 'done',
    expectedSnapshot: complete.snapshot,
    criterionIds: current(state, id).criteria.map((c) => c.id),
  });
  assert.equal(current(state, id).status, 'done');
  assert.equal(getBoardMove(state, id, 'in_progress').kind, 'reopen');
});

test('task artifacts that are empty, stale, not executed or changed cannot be accepted by dragging', () => {
  for (const mutate of [
    (t) => (t.docs = []),
    (t) => (t.docs[0].body = ' '),
    (t) => (t.docs[0].stale = true),
    (t) => (t.docs[0].outcome = 'not_run'),
    (t) => (t.docs[0].coverageComplete = false),
  ]) {
    const { state, id } = ready();
    mutate(current(state, id));
    const before = structuredClone(state);
    assert.equal(getBoardMove(state, id, 'review').allowed, false);
    assert.deepEqual(state, before);
  }
});

test('a failure report is reviewed against the adopted goal rather than an implicit all-green policy', () => {
  let { state, id } = ready();
  current(state, id).docs[0].outcome = 'failed';
  assert.equal(getBoardMove(state, id, 'review').allowed, true);
  current(state, id).requirePassingResult = true;
  assert.equal(getBoardMove(state, id, 'review').allowed, false);
});

test('all task-owned execution must be settled before review or requeue; historical foreign links do not block', () => {
  for (const status of ['running', 'waiting', 'unknown']) {
    const { state, id } = ready();
    state.sessions.push({ id: 'busy', taskId: id, status });
    assert.equal(getBoardMove(state, id, 'review').allowed, false);
    assert.equal(getBoardMove(state, id, 'todo').allowed, false);
  }
  const { state, id } = ready();
  current(state, id).sessionIds = ['session-develop'];
  assert.equal(getBoardMove(state, id, 'review').allowed, true);
});

test('archive restore returns Done with pending evidence, never an implicit retry or reopen', () => {
  let { state, id } = ready();
  state = act(state, id, 'SUBMIT_TASK_REVIEW', {
    expectedSnapshot: getTaskReview(state, current(state, id)).snapshot,
  });
  state = act(state, id, 'COMPLETE_TASK', {
    expectedSnapshot: getTaskCompletion(state, current(state, id)).snapshot,
    criterionIds: current(state, id).criteria.map((c) => c.id),
  });
  state = act(state, id, 'ARCHIVE_TASK');
  current(state, id).docs[0].body = '实际内容变化';
  assert.equal(getBoardMove(state, id, 'in_progress').allowed, false);
  state = act(state, id, 'RESTORE_TASK');
  assert.equal(current(state, id).status, 'done');
  assert.equal(current(state, id).completions.at(-1).applicability, 'pending');
  assert.equal(current(state, id).completions.length, 1);
});

test('missing tasks and unknown columns report a blocked plan instead of mutating anything', () => {
  const { state, id } = fresh();
  const before = structuredClone(state);
  assert.equal(getBoardMove(state, 'missing', 'review').allowed, false);
  assert.equal(getBoardMove(state, id, 'unknown').allowed, false);
  assert.equal(getBoardMove(state, id, 'todo').kind, 'noop');
  assert.deepEqual(state, before);
});
