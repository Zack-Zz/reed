import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../../src/mock/model.js';

const add = (fields = {}) => reduce(createInitialState(), { type: 'CREATE_CONNECTOR', name: 'Region · 产品团队', edition: 'region', endpoint: 'https://demo-region.example.test', organizationId: '', organizationName: '产品团队', principal: 'demo.member', projects: ['移动工作台'], workItemType: 'requirement', syncMode: 'bidirectional', mockAccess: 'full', mockCli: 'ready', ...fields });
const check = (state) => reduce(state, { type: 'TEST_CONNECTOR', connectorId: state.connectors.at(-1).id, outcome: 'connected' });

test('Region 配置不要求组织 ID，固定官方 CLI 驱动，实例地址必填', () => {
  const state = add();
  assert.equal(state.connectors.at(-1).edition, 'region');
  assert.equal(state.connectors.at(-1).driver, 'aliyun-cli');
  assert.equal(state.connectors.at(-1).organizationId, '');
  assert.throws(() => add({ endpoint: '' }), /实例|地址/);
  assert.throws(() => add({ edition: 'other' }), /版本/);
  assert.throws(() => add({ driver: 'arbitrary-shell' }), /CLI|驱动/);
});

test('中心版要求组织 ID，配置检测逐步记录，CLI 成功不等于认证成功', () => {
  assert.throws(() => add({ edition: 'center', endpoint: '', organizationId: '' }), /组织/);
  let state = check(add({ mockAccess: 'expired' }));
  const connector = state.connectors.at(-1);
  assert.equal(connector.status, 'error');
  assert.equal(connector.checks.find(item => item.id === 'cli').status, 'passed');
  assert.equal(connector.checks.find(item => item.id === 'auth').status, 'failed');
  assert.equal(connector.checks.find(item => item.id === 'projects').status, 'blocked');
  assert.throws(() => reduce(state, { type: 'IMPORT_TASK', connectorId: connector.id, externalId: 'R-1', title: '不能导入' }), /连接/);
  state = reduce(state, { type: 'UPDATE_CONNECTOR', connectorId: connector.id, mockAccess: 'full' });
  assert.equal(state.connectors.at(-1).status, 'disconnected');
  state = check(state);
  assert.equal(state.connectors.at(-1).status, 'connected');
});

test('只读权限可导入，双向写入检测失败仍不能推送；其他连接不受影响', () => {
  let state = check(add({ mockAccess: 'read_only' }));
  const connector = state.connectors.at(-1);
  assert.equal(connector.status, 'connected');
  assert.equal(connector.checks.find(item => item.id === 'write').status, 'failed');
  state = reduce(state, { type: 'IMPORT_TASK', connectorId: connector.id, project: '移动工作台', externalId: 'R-2', title: '只读任务' });
  const taskId = state.tasks.at(-1).id;
  assert.throws(() => reduce(state, { type: 'SET_SYNC', taskId, value: 'synced' }), /写入|权限/);
  assert.equal(state.connectors[0].status, 'connected');
  assert.ok(state.connectors[0].checks.every(item => item.status === 'passed'));
});

test('映射缺失与错误终态不能获得写入能力，映射采用准确远端状态 ID', () => {
  let state = check(add({ statusMappings: { '移动工作台': { todo: 'region-new', in_progress: 'region-active', review: 'region-review', done: '' } } }));
  const connectorId = state.connectors.at(-1).id;
  assert.equal(state.connectors.at(-1).checks.find(item => item.id === 'mapping').status, 'failed');
  state = reduce(state, { type: 'IMPORT_TASK', connectorId, externalId: 'R-3', title: '映射任务' });
  const taskId = state.tasks.at(-1).id;
  assert.throws(() => reduce(state, { type: 'SET_SYNC', taskId, value: 'synced' }), /映射/);
  state = reduce(state, { type: 'UPDATE_CONNECTOR', connectorId, statusMappings: { '移动工作台': { todo: 'region-new', in_progress: 'region-active', review: 'region-review', done: 'region-active' } } });
  state = check(state);
  assert.equal(state.connectors.at(-1).checks.find(item => item.id === 'mapping').status, 'failed');
  state = reduce(state, { type: 'UPDATE_CONNECTOR', connectorId, statusMappings: { '移动工作台': { todo: 'region-new', in_progress: 'region-active', review: 'region-review', done: 'region-closed' } } });
  assert.throws(() => reduce(state, { type: 'SET_SYNC', taskId, value: 'synced' }), /检测|写入/);
  state = check(state);
  assert.equal(state.connectors.at(-1).checks.find(item => item.id === 'mapping').status, 'passed');
  const before = structuredClone(state.tasks.at(-1));
  state = reduce(state, { type: 'SET_SYNC', taskId, value: 'synced' });
  assert.deepEqual(state.tasks.at(-1).accepted, before.accepted);
  assert.equal(state.tasks.at(-1).stage, before.stage);
});

test('已有数据的连接不可换账号或版本，改名保留检测与映射，新增连接不接管来源', () => {
  let state = check(add());
  const connectorId = state.connectors.at(-1).id;
  state = reduce(state, { type: 'IMPORT_TASK', connectorId, externalId: 'R-4', title: '关联来源' });
  for (const fields of [{ principal: 'another.member' }, { edition: 'center', organizationId: 'other' }]) {
    assert.throws(() => reduce(state, { type: 'UPDATE_CONNECTOR', connectorId, ...fields }), /身份|引用|新连接/);
  }
  const before = structuredClone(state.connectors.at(-1));
  state = reduce(state, { type: 'UPDATE_CONNECTOR', connectorId, name: '重命名 Region' });
  assert.deepEqual(state.connectors.at(-1).checks, before.checks);
  assert.deepEqual(state.connectors.at(-1).statusMappings, before.statusMappings);
  assert.equal(state.tasks.at(-1).origin.connectorId, connectorId);
});

test('CLI 不可用中止后续检测，停用的连接不能靠测试重新启用，拒绝模拟权限的非法值', () => {
  let state = check(add({ mockCli: 'missing' }));
  assert.equal(state.connectors.at(-1).checks[0].status, 'failed');
  assert.ok(state.connectors.at(-1).checks.slice(1).every(item => item.status === 'blocked'));
  const connectorId = state.connectors.at(-1).id;
  state = reduce(state, { type: 'TOGGLE_CONNECTOR', connectorId });
  assert.throws(() => check(state), /停用/);
  assert.throws(() => add({ mockAccess: 'anything' }), /模拟|权限/);
});

test('模拟同步使用任务项目对应的状态 ID 并回读，保留本地阶段与验收事实', () => {
  let state = check(add());
  const connectorId = state.connectors.at(-1).id;
  state = reduce(state, { type: 'IMPORT_TASK', connectorId, externalId: 'R-5', title: '状态映射回读' });
  const taskId = state.tasks.at(-1).id;
  const before = structuredClone(state.tasks.at(-1));
  state = reduce(state, { type: 'SET_SYNC', taskId, value: 'synced' });
  assert.equal(state.tasks.at(-1).remoteStatus.id, 'region-new');
  assert.equal(state.tasks.at(-1).remoteStatus.project, '移动工作台');
  assert.equal(state.tasks.at(-1).remoteStatus.connectorId, connectorId);
  assert.deepEqual(state.tasks.at(-1).accepted, before.accepted);
  assert.equal(state.tasks.at(-1).stage, before.stage);
});

test('移出同步范围的任务保留来源与本地工作，拒绝后续推送和接受远端', () => {
  let state = check(add());
  const connectorId = state.connectors.at(-1).id;
  state = reduce(state, { type: 'IMPORT_TASK', connectorId, externalId: 'R-6', title: '范围收窄' });
  const taskId = state.tasks.at(-1).id;
  state = reduce(state, { type: 'UPDATE_CONNECTOR', connectorId, projects: ['交付平台'], statusMappings: { '交付平台': state.connectors.at(-1).statusMappings['移动工作台'] } });
  state = check(state);
  assert.throws(() => reduce(state, { type: 'SET_SYNC', taskId, value: 'synced' }), /范围|项目/);
  state = reduce(state, { type: 'SET_SYNC', taskId, value: 'conflict' });
  assert.throws(() => reduce(state, { type: 'RESOLVE_SYNC', taskId, choice: 'remote' }), /范围|项目/);
  state = reduce(state, { type: 'UPDATE_TASK', taskId, title: '本地仍能修改' });
  assert.equal(state.tasks.at(-1).origin.connectorId, connectorId);
  assert.equal(state.tasks.at(-1).title, '本地仍能修改');
});

test('切换工作项类型不重新解释已导入任务，原类型不在范围时不能同步', () => {
  let state = check(add());
  const connectorId = state.connectors.at(-1).id;
  state = reduce(state, { type: 'IMPORT_TASK', connectorId, externalId: 'R-7', title: '需求原类型' });
  const taskId = state.tasks.at(-1).id;
  assert.equal(state.tasks.at(-1).sourceWorkItemType, 'requirement');
  state = reduce(state, { type: 'UPDATE_CONNECTOR', connectorId, workItemType: 'bug', statusMappings: { '移动工作台': { todo: 'region-new-bug', in_progress: 'region-active-bug', review: 'region-review-bug', done: 'region-closed-bug' } } });
  state = check(state);
  assert.throws(() => reduce(state, { type: 'SET_SYNC', taskId, value: 'synced' }), /类型|范围/);
  assert.equal(state.tasks.at(-1).sourceWorkItemType, 'requirement');
});

test('同连接不同项目的展示编号不会误打开另一项目的任务', () => {
  let state = check(add({ projects: ['移动工作台', '交付平台'] }));
  const connectorId = state.connectors.at(-1).id;
  for (const project of ['移动工作台', '交付平台']) state = reduce(state, { type: 'IMPORT_TASK', connectorId, project, externalId: 'REQ-PROJECT', title: `${project}的需求` });
  const imported = state.tasks.filter(task => task.externalId === 'REQ-PROJECT');
  assert.equal(imported.length, 2);
  assert.notEqual(imported[0].id, imported[1].id);
  assert.deepEqual(imported.map(task => task.project), ['移动工作台', '交付平台']);
  const repeated = reduce(state, { type: 'IMPORT_TASK', connectorId, project: '交付平台', externalId: 'REQ-PROJECT', title: '重复导入' });
  assert.equal(repeated.tasks.length, state.tasks.length);
});

test('本机发现只保存配置来处，不把生成草稿视作检测通过或附带发现原文', () => {
  const setupSource = { kind: 'discovered', candidateId: 'mock-local-region', label: 'CLI 环境变量', extra: '不应保存的发现原文' };
  let state = add({ setupSource });
  const connector = state.connectors.at(-1);
  assert.deepEqual(connector.setupSource, { kind: 'discovered', candidateId: 'mock-local-region', label: 'CLI 环境变量' });
  assert.equal(connector.status, 'disconnected');
  assert.deepEqual(connector.checks, []);
  state = reduce(state, { type: 'UPDATE_CONNECTOR', connectorId: connector.id, name: '编辑发现的默认配置' });
  assert.deepEqual(state.connectors.at(-1).setupSource, connector.setupSource);
  assert.throws(() => add({ setupSource: { kind: 'arbitrary' } }), /配置来源/);
});
