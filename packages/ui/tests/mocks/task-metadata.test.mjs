import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../../src/mock/model.js';

const taskById = (model, id) => model.tasks.find((item) => item.id === id);

function contextTask() {
  const model = reduce(createInitialState(), { type: 'CREATE_TASK', title: '补充上下文' });
  const task = model.tasks.at(-1);
  task.createdAt = '2020-01-01T00:00:00.000Z';
  task.updatedAt = '2020-01-02T00:00:00.000Z';
  return { model, task };
}

for (const [field, value] of [
  ['project', '新的项目'],
  ['repo', '/synthetic/reed'],
  ['references', [{ kind: 'link', name: '说明', location: 'https://example.com/task' }]],
]) {
  test(`saving only task context ${field} advances modification time without rewriting creation time`, () => {
    const { model, task } = contextTask();
    const before = structuredClone(model);
    const next = reduce(model, { type: 'UPDATE_TASK_CONTEXT', taskId: task.id, [field]: value });
    const updated = taskById(next, task.id);
    assert.deepEqual(updated[field], value);
    assert.equal(updated.createdAt, task.createdAt);
    assert.ok(Date.parse(updated.updatedAt) > Date.parse(task.updatedAt));
    assert.deepEqual(model, before);
  });
}

test('saving unchanged normalized task context keeps modification time and the existing save activity', () => {
  const { model, task } = contextTask();
  task.project = '成员中心';
  task.repo = '/synthetic/reed';
  task.references = [{ kind: 'link', name: '说明', location: 'https://example.com/task' }];
  const events = structuredClone(model.events);
  for (const fields of [
    {},
    {
      title: ` ${task.title} `,
      project: ' 成员中心 ',
      repo: ' /synthetic/reed ',
      description: ' ',
      references: [{ kind: 'link', name: ' 说明 ', location: ' https://example.com/task ' }],
    },
  ]) {
    const next = reduce(model, { type: 'UPDATE_TASK_CONTEXT', taskId: task.id, ...fields });
    assert.equal(taskById(next, task.id).updatedAt, task.updatedAt);
    assert.equal(taskById(next, task.id).createdAt, task.createdAt);
    assert.equal(next.events.length, events.length + 1);
    assert.equal(next.events.at(-1).text, '已保存本地任务上下文');
  }
});

test('task metadata keeps creation/modification timestamps, priority and owner', async () => {
  let model = reduce(createInitialState(), {
    type: 'CREATE_TASK',
    title: '元数据任务',
    project: '成员中心',
  });
  const id = model.tasks.at(-1).id;
  let task = taskById(model, id);

  assert.equal(task.priority, null);
  assert.equal(task.owner, 'self');
  assert.ok(!Number.isNaN(Date.parse(task.createdAt)));
  assert.equal(task.updatedAt, task.createdAt);

  const createdAt = task.createdAt;
  await new Promise((resolve) => setTimeout(resolve, 5));
  model = reduce(model, {
    type: 'SAVE_TASK_BASICS',
    taskId: id,
    title: '元数据任务',
    taskType: 'uncategorized',
    description: '补充说明',
    priority: 'p1',
    owner: 'self',
  });
  task = taskById(model, id);
  assert.equal(task.priority, 'p1');
  assert.equal(task.owner, 'self');
  assert.ok(Date.parse(task.updatedAt) > Date.parse(createdAt));

  const updatedAt = task.updatedAt;
  await new Promise((resolve) => setTimeout(resolve, 5));
  model = reduce(model, { type: 'START_TASK', taskId: id });
  task = taskById(model, id);
  assert.equal(task.status, 'in_progress');
  assert.ok(Date.parse(task.updatedAt) > Date.parse(updatedAt));

  model = reduce(model, {
    type: 'SAVE_TASK_BASICS',
    taskId: id,
    title: '元数据任务',
    taskType: 'uncategorized',
    description: '补充说明',
    priority: null,
    owner: null,
  });
  task = taskById(model, id);
  assert.equal(task.priority, null);
  assert.equal(task.owner, null);
});
