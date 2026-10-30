import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../../src/mock/model.js';
import { getBoardColumn } from '../../src/mock/personal-board.js';

const create = (fields = {}) =>
  reduce(createInitialState(), { type: 'CREATE_TASK', title: '本地工作', ...fields });
const taskOf = (state) => state.tasks.at(-1);
const act = (state, type, fields = {}) =>
  reduce(state, { type, taskId: taskOf(state).id, ...fields });

test('仅标题即可创建待办本地任务，资料和示例执行历史不混入新任务', () => {
  const initial = createInitialState();
  const state = reduce(initial, { type: 'CREATE_TASK', title: '  整理需求  ' });
  const task = taskOf(state);
  assert.equal(task.title, '整理需求');
  assert.equal(task.project, '');
  assert.equal(task.repo, '');
  assert.equal(task.description, '');
  assert.deepEqual(task.references, []);
  assert.deepEqual(task.origin, { kind: 'local', system: 'reed' });
  assert.equal(task.workspace.ready, false);
  assert.equal(task.workspace.origin.repo, '');
  assert.equal(task.hasStarted, false);
  assert.equal(task.attention, 'idle');
  assert.equal(task.stage, null);
  assert.equal(getBoardColumn(task, state.sessions), 'todo');
  assert.deepEqual(task.accepted, []);
  assert.deepEqual(task.docs, []);
  assert.deepEqual(task.sessionIds, []);
  assert.equal(task.sessionId, null);
  assert.deepEqual(state.tasks.slice(0, initial.tasks.length), initial.tasks);
  assert.deepEqual(state.sessions, initial.sessions);
  assert.deepEqual(state.branches, initial.branches);
});

test('创建时保存独立描述与资料引用，去首尾空白且不保留调用方对象', () => {
  const references = [
    { kind: 'file', name: '  需求.pdf ', location: ' /docs/需求.pdf ' },
    { kind: 'link', name: ' 说明 ', location: ' https://example.test/spec ' },
  ];
  const state = create({
    project: ' 项目 A ',
    repo: ' repo-a ',
    description: ' 业务背景\n验收要求 ',
    references,
  });
  const task = taskOf(state);
  assert.equal(task.project, '项目 A');
  assert.equal(task.repo, 'repo-a');
  assert.equal(task.workspace.origin.repo, 'repo-a');
  assert.equal(task.description, '业务背景\n验收要求');
  assert.deepEqual(task.references, [
    { kind: 'file', name: '需求.pdf', location: '/docs/需求.pdf' },
    { kind: 'link', name: '说明', location: 'https://example.test/spec' },
  ]);
  references[0].name = '外部修改';
  assert.equal(task.references[0].name, '需求.pdf');
  assert.deepEqual(task.docs, []);
});

test('创建与补充上下文拒绝无效标题、选填字段及不完整或无效的引用且不修改输入', () => {
  const invalid = [
    { title: ' ' },
    { title: 3 },
    { project: {} },
    { repo: [] },
    { description: false },
    { references: {} },
    { references: [null] },
    { references: [{ kind: 'other', name: 'x', location: 'x' }] },
    { references: [{ kind: 'file', name: ' ', location: '/x' }] },
    { references: [{ kind: 'link', name: 'x', location: ' ' }] },
    { references: [{ kind: 'link', name: 'x', location: 'javascript:alert(1)' }] },
    { references: [{ kind: 'link', name: 'x', location: 'not-a-url' }] },
  ];
  for (const fields of invalid) {
    const state = create();
    const before = structuredClone(state);
    assert.throws(() => reduce(state, { type: 'CREATE_TASK', title: '新建', ...fields }));
    assert.throws(() => act(state, 'UPDATE_TASK_CONTEXT', fields));
    assert.deepEqual(state, before);
  }
});

test('本地任务后补上下文仅改指定资料，原阶段、验收、会话、分支、来源和文档历史保持', () => {
  let state = create({
    repo: 'repo-a',
    description: '原描述',
    references: [{ kind: 'file', name: '原稿', location: '/old' }],
  });
  state = act(state, 'START_TASK');
  state = act(state, 'BIND_SESSION', { host: 'Codex' });
  state = act(state, 'START_STAGE');
  state = act(state, 'FINISH_STAGE', { outcome: 'review' });
  const before = structuredClone(state);
  const updated = act(state, 'UPDATE_TASK_CONTEXT', {
    title: ' 新标题 ',
    project: ' 新项目 ',
    description: ' 新描述 ',
    references: [{ kind: 'link', name: '说明', location: 'https://example.test/new' }],
  });
  const task = taskOf(updated);
  assert.equal(task.title, '新标题');
  assert.equal(task.project, '新项目');
  assert.equal(task.description, '新描述');
  assert.deepEqual(task.references, [
    { kind: 'link', name: '说明', location: 'https://example.test/new' },
  ]);
  const {
    title: _title,
    project: _project,
    description: _description,
    references: _references,
    ...history
  } = task;
  const {
    title: _oldTitle,
    project: _oldProject,
    description: _oldDescription,
    references: _oldReferences,
    ...oldHistory
  } = taskOf(before);
  assert.deepEqual(history, oldHistory);
  assert.deepEqual(updated.sessions, before.sessions);
  assert.deepEqual(updated.branches, before.branches);
  assert.deepEqual(state, before);
  assert.throws(
    () => reduce(state, { type: 'UPDATE_TASK_CONTEXT', taskId: 'REQ-1042', title: '远端标题' }),
    /本地/,
  );
});

test('未绑定会话或工作区时可补充、更换和清空仓库，选填字段可独立清空', () => {
  let state = create();
  state = act(state, 'UPDATE_TASK_CONTEXT', {
    repo: ' repo-b ',
    description: '描述',
    project: '项目',
    references: [{ kind: 'file', name: '资料', location: '/tmp/file' }],
  });
  assert.equal(taskOf(state).repo, 'repo-b');
  assert.equal(taskOf(state).workspace.origin.repo, 'repo-b');
  state = act(state, 'UPDATE_TASK_CONTEXT', {
    repo: '',
    project: '',
    description: '',
    references: [],
  });
  assert.equal(taskOf(state).repo, '');
  assert.equal(taskOf(state).project, '');
  assert.equal(taskOf(state).description, '');
  assert.deepEqual(taskOf(state).references, []);
  assert.equal(taskOf(state).workspace.origin.repo, '');
});

test('已有会话、工作区、分支或执行归属时拒绝换仓库，但允许补充描述且不迁移关系', () => {
  const mutations = [
    (state) => {
      taskOf(state).sessionId = 'bound';
    },
    (state) => {
      taskOf(state).sessionIds = ['linked-history'];
    },
    (state) => {
      state.sessions.push({
        id: 'ended',
        taskId: taskOf(state).id,
        status: 'ended',
        origin: { kind: 'host', host: 'Codex' },
      });
    },
    (state) => {
      taskOf(state).workspace.ready = true;
    },
    (state) => {
      taskOf(state).workspace.path = '/work/old';
    },
    (state) => {
      taskOf(state).workspace.branch = 'reed/old';
    },
    (state) => {
      state.branches.push({
        id: 'branch-old',
        taskId: taskOf(state).id,
        repo: 'repo-a',
        origin: { kind: 'local', system: 'git', repo: 'repo-a' },
      });
    },
    ...['running', 'waiting', 'unknown'].map((attention) => (state) => {
      taskOf(state).attention = attention;
    }),
    ...['running', 'waiting', 'unknown'].map((status) => (state) => {
      state.sessions.push({
        id: 'active',
        taskId: taskOf(state).id,
        status,
        origin: { kind: 'host', host: 'Codex' },
      });
    }),
  ];
  for (const mutate of mutations) {
    const state = create({ repo: 'repo-a' });
    mutate(state);
    const before = structuredClone(state);
    assert.throws(
      () => act(state, 'UPDATE_TASK_CONTEXT', { repo: 'repo-b', title: '不应生效' }),
      /仓库|会话|工作区|执行/,
    );
    assert.deepEqual(state, before);
    const updated = act(state, 'UPDATE_TASK_CONTEXT', {
      repo: ' repo-a ',
      description: '补充背景',
    });
    assert.equal(taskOf(updated).description, '补充背景');
    assert.equal(taskOf(updated).repo, 'repo-a');
    assert.deepEqual(taskOf(updated).workspace, taskOf(before).workspace);
    assert.deepEqual(updated.sessions, before.sessions);
    assert.deepEqual(updated.branches, before.branches);
    assert.equal(taskOf(updated).attention, taskOf(before).attention);
  }
});

test('开始处理仅记录人工开工，转换到进行中且重复操作幂等，不伪造执行或验收', () => {
  const state = create();
  const started = act(state, 'START_TASK');
  const beforeTask = taskOf(state);
  assert.equal(taskOf(started).hasStarted, true);
  assert.equal(getBoardColumn(taskOf(started), started.sessions), 'in_progress');
  assert.deepEqual(taskOf(started), { ...beforeTask, status: 'in_progress', hasStarted: true });
  assert.deepEqual(started.sessions, state.sessions);
  assert.deepEqual(started.branches, state.branches);
  assert.deepEqual(act(started, 'START_TASK'), started);
  assert.equal(beforeTask.hasStarted, false);
});

test('暂停、归档和完成任务不能开始处理，已有执行状态与历史保持', () => {
  for (const status of ['review', 'archived', 'done']) {
    const state = create();
    taskOf(state).status = status;
    const before = structuredClone(state);
    assert.throws(() => act(state, 'START_TASK'), /task.start-state/);
    assert.deepEqual(state, before);
  }
  for (const attention of ['running', 'waiting', 'unknown', 'review', 'failed']) {
    const state = create();
    taskOf(state).attention = attention;
    const before = structuredClone(state);
    const result = act(state, 'START_TASK');
    assert.deepEqual(taskOf(result), {
      ...taskOf(before),
      status: 'in_progress',
      hasStarted: true,
    });
    assert.deepEqual(result.sessions, before.sessions);
    assert.deepEqual(result.branches, before.branches);
  }
});

test('编辑旧缓存的元信息不修补开工标记或失败产出身份', () => {
  const state = create();
  const task = taskOf(state);
  delete task.hasStarted;
  task.attention = 'failed';
  task.docs.push({
    id: 'legacy-result',
    title: '旧需求.md',
    version: 1,
    kind: '需求',
    stage: 0,
    body: '旧产出',
    origin: { kind: 'host', host: 'Codex' },
  });
  const before = structuredClone(state);
  const updated = act(state, 'UPDATE_TASK_CONTEXT', { description: '补充背景' });
  assert.equal(Object.hasOwn(taskOf(updated), 'hasStarted'), false);
  assert.deepEqual(taskOf(updated).docs, taskOf(before).docs);
  assert.equal(taskOf(updated).attention, 'failed');
  assert.deepEqual(taskOf(updated).accepted, taskOf(before).accepted);
  assert.deepEqual(state, before);
});

test('仅准备工作区要求可定位的仓库，补充前不生成分支且不限制人工处理', () => {
  let state = create();
  const before = structuredClone(state);
  assert.throws(() => act(state, 'PREPARE_WORKSPACE'), /仓库/);
  assert.deepEqual(state, before);
  state = act(state, 'START_TASK');
  state = act(state, 'ADD_TASK_ARTIFACT', {
    title: '需求.md',
    body: '无需仓库即可整理需求和验收标准',
  });
  assert.equal(taskOf(state).repo, '');
  assert.equal(taskOf(state).workspace.ready, false);
  state = act(state, 'UPDATE_TASK_CONTEXT', { repo: ' project/repo ' });
  state = act(state, 'PREPARE_WORKSPACE');
  assert.equal(taskOf(state).workspace.ready, true);
  assert.equal(taskOf(state).workspace.origin.repo, 'project/repo');
  assert.equal(state.branches.at(-1).repo, 'project/repo');
  assert.equal(taskOf(state).docs.length, 1);
  for (const repo of [' ', undefined, null, 7]) {
    const invalid = create();
    taskOf(invalid).repo = repo;
    assert.throws(() => act(invalid, 'PREPARE_WORKSPACE'), /仓库/);
  }
});

test('无仓库先完成需求和设计后仍可首次补充仓库，保留原会话再准备开发', () => {
  let state = act(create(), 'START_TASK');
  state = act(state, 'SET_TASK_WORKFLOW', { templateId: 'development' });
  for (let phase = 0; phase < 2; phase += 1) {
    state = act(state, 'BIND_SESSION', { host: 'Codex' });
    state = act(state, 'START_STAGE');
    state = act(state, 'FINISH_STAGE', { outcome: 'review' });
    const document = taskOf(state).docs.at(-1);
    state = act(state, 'ACKNOWLEDGE_STEP_COVERAGE', {
      documentId: document.id,
      documentVersion: document.version,
      coverageComplete: true,
    });
    state = act(state, 'ACCEPT_STAGE');
  }
  const before = structuredClone(state);
  state = act(state, 'UPDATE_TASK_CONTEXT', { repo: 'later-repo' });
  assert.equal(taskOf(state).stage, 2);
  assert.deepEqual(state.sessions, before.sessions);
  assert.deepEqual(taskOf(state).docs, taskOf(before).docs);
  state = act(state, 'PREPARE_WORKSPACE');
  assert.equal(taskOf(state).workspace.ready, true);
});

test('首次补仓库仍不能迁移活动执行或既有代码工作区', () => {
  const mutations = [
    ...['running', 'waiting', 'unknown'].map((attention) => (task) => {
      task.attention = attention;
    }),
    (task) => {
      task.workspace.ready = true;
    },
    (task) => {
      task.workspace.path = '/workspace/existing';
    },
  ];
  for (const mutate of mutations) {
    const state = create();
    mutate(taskOf(state));
    assert.throws(() => act(state, 'UPDATE_TASK_CONTEXT', { repo: 'late-repo' }), /仓库/);
  }
});
