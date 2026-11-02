import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../../src/mock/model.js';
import { createMockWorkbenchRuntime } from '../../src/mock/index.ts';
import { taskSnapshot, getTaskCompletion } from '../../src/mock/task-lifecycle.js';

const services = createMockWorkbenchRuntime().services;
function scenario() {
  let state = reduce(createInitialState(), { type: 'CREATE_TASK', title: '直接管理的任务' });
  const id = state.tasks.at(-1).id;
  const task = () => state.tasks.find((item) => item.id === id);
  const act = (type, fields = {}) => {
    state = reduce(state, { type, taskId: id, ...fields });
  };
  const gate = (status) => {
    assert.equal(
      typeof services.getTaskStatusChange,
      'function',
      'the injected runtime must expose status planning',
    );
    return services.getTaskStatusChange(state, task(), status);
  };
  const change = (status, fields = {}) =>
    act('CHANGE_TASK_STATUS', {
      status,
      expectedStatus: task().status,
      expectedSnapshot: gate(status).snapshot,
      ...fields,
    });
  return { id, task, act, gate, change, state: () => state };
}

test('a title-only To do task completes directly with one status event and a stable completion identity', () => {
  const s = scenario();
  const count = s.state().events.length;
  assert.equal(s.gate('done').allowed, true);
  s.change('done');
  assert.equal(s.task().status, 'done');
  assert.deepEqual(s.task().docs, []);
  assert.equal(s.task().completions.length, 1);
  assert.equal(s.task().review.status, 'accepted');
  const events = s.state().events.slice(count);
  assert.equal(events.length, 1);
  assert.equal(events[0].text, 'task.status-changed');
  assert.equal(events[0].fromStatus, 'todo');
  assert.equal(events[0].status, 'done');
});

for (const source of ['todo', 'in_progress', 'review']) {
  for (const target of ['todo', 'in_progress', 'review', 'done']) {
    test(`direct task status: ${source} -> ${target}`, () => {
      const s = scenario();
      if (source !== 'todo') s.change(source);
      const beforeCount = s.state().events.length;
      s.change(target);
      assert.equal(s.task().status, target);
      assert.equal(s.state().events.length, beforeCount + (source === target ? 0 : 1));
    });
  }
}

test('leaving review requires no reason and retains the original frozen submission', () => {
  const s = scenario();
  s.change('review');
  const review = structuredClone(s.task().review);
  s.change('todo');
  assert.equal(s.task().review, null);
  assert.equal(s.task().reviews[0].snapshot, review.snapshot);
  assert.equal(s.task().reviews[0].status, 'withdrawn');
  assert.deepEqual(s.task().notes, []);
  s.change('review');
  assert.equal(s.task().reviews.length, 2);
});

test('configured criteria require every explicit confirmation and rejected commands preserve input', () => {
  const s = scenario();
  s.act('SAVE_TASK_SCOPE', { goal: '', criteria: ['条件一', '条件二'] });
  const before = structuredClone(s.state());
  assert.throws(() => s.change('done'), /criteria/);
  assert.deepEqual(s.state(), before);
  assert.throws(() => s.change('done', { criterionIds: [s.task().criteria[0].id] }), /criteria/);
  assert.deepEqual(s.state(), before);
  s.change('done', { criterionIds: s.task().criteria.map((item) => item.id) });
  assert.equal(s.task().status, 'done');
});

test('stale status and stale content are rejected even when a task has no criteria or results', () => {
  const s = scenario();
  const planned = s.gate('done');
  s.change('in_progress');
  const before = structuredClone(s.state());
  assert.throws(
    () =>
      s.act('CHANGE_TASK_STATUS', {
        status: 'done',
        expectedStatus: 'todo',
        expectedSnapshot: planned.snapshot,
      }),
    /snapshot/,
  );
  assert.deepEqual(s.state(), before);
  const current = s.gate('done');
  s.act('SAVE_TASK_BASICS', { title: '新标题', taskType: s.task().taskType, description: '' });
  const edited = structuredClone(s.state());
  assert.throws(
    () =>
      s.act('CHANGE_TASK_STATUS', {
        status: 'done',
        expectedStatus: 'in_progress',
        expectedSnapshot: current.snapshot,
      }),
    /snapshot/,
  );
  assert.deepEqual(s.state(), edited);
});

test('running and unknown execution cannot be bypassed with direct status changes', () => {
  const s = scenario();
  s.act('START_TASK');
  s.act('BIND_SESSION', { host: 'Codex' });
  s.act('START_STAGE');
  for (const status of ['todo', 'review', 'done']) {
    assert.equal(s.gate(status).allowed, false);
    assert.equal(s.gate(status).checks.find((item) => item.id === 'execution').passed, false);
    assert.throws(() => s.change(status), /execution/);
  }
  s.act('FINISH_STAGE', { outcome: 'unknown' });
  assert.equal(s.gate('done').allowed, false);
  assert.throws(() => s.change('done'), /execution/);
});

test('paused tasks cannot start through status selection while selecting the same status remains a no-op', () => {
  const s = scenario();
  s.act('TOGGLE_PAUSE');
  const before = structuredClone(s.state());
  assert.equal(s.gate('in_progress').allowed, false);
  assert.throws(() => s.change('in_progress'), /start-state/);
  assert.deepEqual(s.state(), before);
  s.change('todo');
  assert.deepEqual(s.state(), before);
  s.act('TOGGLE_PAUSE');
  s.change('in_progress');
  assert.equal(s.task().status, 'in_progress');
});

test('chosen workflow, required dependencies and explicit passing requirements remain gates', () => {
  const workflow = scenario();
  workflow.act('SET_TASK_WORKFLOW', { templateId: 'development' });
  assert.equal(workflow.gate('done').allowed, false);
  assert.equal(workflow.gate('review').allowed, false);
  assert.throws(() => workflow.change('done'), /workflow|work/);
  const quality = scenario();
  quality.act('SAVE_TASK_SCOPE', { goal: '', criteria: [], requirePassingResult: true });
  assert.equal(quality.gate('done').allowed, false);
  assert.throws(() => quality.change('done'), /quality/);
  const dependent = scenario();
  dependent.act('LINK_TASK', {
    targetTaskId: 'LOCAL-1',
    relationKind: 'dependency',
    required: true,
    confirmScopeChange: true,
  });
  assert.equal(dependent.gate('done').allowed, false);
  assert.throws(() => dependent.change('done'), /deliveries/);
});

for (const status of ['todo', 'in_progress', 'review']) {
  test(`reopening Done to ${status} preserves completion history and invalidates parent evidence`, () => {
    const child = scenario();
    child.change('done');
    const decisionId = child.task().completions[0].id;
    let state = reduce(child.state(), { type: 'CREATE_TASK', title: '依赖完成成果的父任务' });
    const parentId = state.tasks.at(-1).id;
    state = reduce(state, {
      type: 'LINK_TASK',
      taskId: parentId,
      targetTaskId: child.id,
      relationKind: 'child',
      required: true,
      confirmScopeChange: true,
    });
    let parent = state.tasks.find((item) => item.id === parentId);
    const parentGate = services.getTaskStatusChange(state, parent, 'done');
    state = reduce(state, {
      type: 'CHANGE_TASK_STATUS',
      taskId: parentId,
      status: 'done',
      expectedStatus: 'todo',
      expectedSnapshot: parentGate.snapshot,
    });
    const currentChild = state.tasks.find((item) => item.id === child.id);
    state = reduce(state, {
      type: 'CHANGE_TASK_STATUS',
      taskId: child.id,
      status,
      expectedStatus: 'done',
      expectedSnapshot: services.getTaskStatusChange(state, currentChild, status).snapshot,
    });
    const reopened = state.tasks.find((item) => item.id === child.id);
    parent = state.tasks.find((item) => item.id === parentId);
    assert.equal(reopened.status, status);
    assert.equal(reopened.completions[0].id, decisionId);
    assert.equal(reopened.completions[0].applicability, 'pending');
    assert.equal(parent.status, 'done');
    assert.equal(parent.completions[0].applicability, 'pending');
    assert.deepEqual(reopened.notes, []);
  });
}

test('archive accepts only completed tasks and restores the same historical completion', () => {
  const s = scenario();
  assert.equal(s.gate('archived').allowed, false);
  assert.throws(() => s.change('archived'));
  s.change('done');
  const decision = structuredClone(s.task().completions[0]);
  s.change('archived');
  for (const status of ['todo', 'in_progress', 'review']) {
    assert.equal(s.gate(status).allowed, false);
    assert.throws(() => s.change(status));
  }
  s.change('done');
  assert.deepEqual(s.task().completions, [decision]);
});

test('comments persist independently, preserve frozen review and are allowed after completion and archive', () => {
  const s = scenario();
  assert.deepEqual(s.task().comments, []);
  s.change('review');
  const snapshot = getTaskCompletion(s.state(), s.task()).snapshot;
  const before = {
    docs: structuredClone(s.task().docs),
    notes: [...s.task().notes],
    basis: taskSnapshot(s.task()),
  };
  s.act('ADD_TASK_COMMENT', { body: '  第一条评论\n保留换行  ' });
  assert.equal(s.task().comments[0].body, '第一条评论\n保留换行');
  assert.equal(s.task().comments[0].author, 'You');
  assert.match(s.task().comments[0].createdAt, /^\d{4}-\d\d-\d\dT/);
  assert.ok(Number.isFinite(Date.parse(s.task().comments[0].createdAt)));
  assert.equal(getTaskCompletion(s.state(), s.task()).snapshot, snapshot);
  assert.equal(taskSnapshot(s.task()), before.basis);
  assert.deepEqual(s.task().docs, before.docs);
  assert.deepEqual(s.task().notes, before.notes);
  s.change('done');
  const completion = structuredClone(s.task().completions[0]);
  s.act('ADD_TASK_COMMENT', { body: '完成后补充' });
  s.change('archived');
  s.act('ADD_TASK_COMMENT', { body: '归档后补充' });
  assert.equal(s.task().comments.length, 3);
  assert.equal(new Set(s.task().comments.map((comment) => comment.id)).size, 3);
  assert.deepEqual(s.task().completions[0], completion);
  assert.equal(s.state().events.at(-1).text, 'task.comment-added');
  let saved = null;
  const runtime = createMockWorkbenchRuntime({
    storage: {
      getItem: () => saved,
      setItem: (_key, content) => {
        saved = content;
      },
    },
  });
  assert.equal(runtime.save(s.state()), true);
  assert.deepEqual(
    runtime.load().tasks.find((item) => item.id === s.id).comments,
    s.task().comments,
  );
});

test('invalid and oversized comments reject atomically, and legacy drafts gain an empty collection', () => {
  const s = scenario();
  for (const body of ['', '  \n ', undefined, { text: 'wrong type' }, 'x'.repeat(400001)]) {
    const before = structuredClone(s.state());
    assert.throws(() => s.act('ADD_TASK_COMMENT', { body }), /comment/);
    assert.deepEqual(s.state(), before);
  }
  const old = structuredClone(s.state());
  for (const task of old.tasks) delete task.comments;
  const restored = createMockWorkbenchRuntime({
    storage: {
      getItem: () => JSON.stringify({ version: 3, model: old }),
      setItem() {},
    },
  }).load();
  assert.ok(restored.tasks.every((task) => Array.isArray(task.comments) && !task.comments.length));
});

test('unrenderable comment drafts do not reach the UI', () => {
  const s = scenario();
  s.task().comments = [
    { id: 'bad-comment', body: {}, createdAt: '2026-10-31T00:00:00.000Z', author: 'You' },
  ];
  const runtime = createMockWorkbenchRuntime({
    storage: {
      getItem: () => JSON.stringify({ version: 3, model: s.state() }),
      setItem() {},
    },
  });
  assert.equal(
    runtime.load().tasks.some((task) => task.id === s.id),
    false,
  );
});
