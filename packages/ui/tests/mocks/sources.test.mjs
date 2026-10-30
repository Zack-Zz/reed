import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../src/mock/model.js';
import { DEMO_CONNECTOR_ID, getOriginInfo, normalizeState } from '../../src/mock/sources.js';

test('来源迁移深克隆且幂等，旧云效仅挂到保留的未知配置占位连接', () => {
  const old = createInitialState();
  delete old.connectors;
  old.tasks.forEach((task) => { delete task.origin; task.docs.forEach((document) => { delete document.origin; }); });
  delete old.sessions[0].origin;
  delete old.branches[0].origin;
  const before = structuredClone(old);
  const state = normalizeState(old);
  assert.deepEqual(old, before);
  assert.deepEqual(normalizeState(state), state);
  assert.notEqual(state.tasks[0].origin.connectorId, DEMO_CONNECTOR_ID);
  assert.equal(state.tasks[0].origin.connectorId, 'connector-yunxiao-legacy');
  const legacy = state.connectors.find((item) => item.id === 'connector-yunxiao-legacy');
  assert.equal(legacy.enabled, false);
  assert.equal(legacy.status, 'unconfigured');
  assert.equal(legacy.legacy, true);
  assert.ok(state.connectors.some((item) => item.id === DEMO_CONNECTOR_ID));
  assert.equal(getOriginInfo(state, state.tasks[0].docs[0]).label, '来源待确认');
  assert.equal(getOriginInfo(state, state.sessions[0]).label, 'Codex');
  assert.equal(getOriginInfo(state, state.branches[0]).label, '本地 Git');
});

test('来源缺失不从 task 或 kind 推断，引用丢失的连接保留精确 id', () => {
  const state = createInitialState();
  assert.equal(getOriginInfo(state, { taskId: state.tasks[0].id, kind: '需求' }).kind, 'unknown');
  const info = getOriginInfo(state, { origin: { kind: 'connector', connectorId: 'lost-id', externalId: 'REQ-1' } });
  assert.equal(info.connectorId, 'lost-id');
  assert.match(info.label, /未知连接/);
  assert.match(info.detail, /lost-id/);
  assert.equal(getOriginInfo(state, state.tasks.find((task) => task.source === '本地')).label, '本地 · Reed');
});

test('来源显示跟随连接名称但固定 id，保留现有 origin 和所有历史状态', () => {
  const state = createInitialState();
  const before = structuredClone(state);
  state.connectors[0].name = '重新命名';
  state.connectors[0].enabled = false;
  const info = getOriginInfo(state, state.tasks[0]);
  assert.equal(info.label, '重新命名');
  assert.equal(info.connectorId, DEMO_CONNECTOR_ID);
  assert.match(info.detail, /示例组织/);
  assert.match(info.detail, /停用/);
  assert.deepEqual(normalizeState(state).tasks, before.tasks);
  assert.deepEqual(normalizeState(state).tasks[0].origin, before.tasks[0].origin);
});

test('旧缓存连接重名时来源标签附稳定 ID，原名原 ID 与实体来源保持不变', () => {
  const old = createInitialState();
  old.connectors[0].name = ' Team Alpha ';
  old.connectors.push({ ...structuredClone(old.connectors[0]), id: 'connector-other', name: 'team ALPHA' });
  const before = structuredClone(old);
  const state = normalizeState(old);
  const first = getOriginInfo(state, state.tasks[0]);
  const second = getOriginInfo(state, { origin: { kind: 'connector', connectorId: 'connector-other', externalId: 'REQ-1042' } });
  assert.notEqual(first.label, second.label);
  assert.ok(first.label.includes(DEMO_CONNECTOR_ID));
  assert.ok(second.label.includes('connector-other'));
  assert.deepEqual(state, before);
  assert.deepEqual(old, before);
});

test('历史活动未记录来源时保持未知，不凭关联任务推断为 Reed 操作', () => {
  const old = createInitialState();
  delete old.events[0].origin;
  const restored = normalizeState(old);
  assert.equal(restored.events[0].origin.kind, 'unknown');
  assert.equal(getOriginInfo(restored, restored.events[0]).label, '来源待确认');
  assert.equal(restored.events[1].origin.system, 'reed');
});

test('Region 来源即使没有组织显示名，也展示实际实例地址与账号', () => {
  const state = createInitialState();
  state.connectors[0].edition = 'region';
  state.connectors[0].endpoint = 'https://demo-instance.example.test';
  state.connectors[0].organizationId = '';
  state.connectors[0].organizationName = '';
  const info = getOriginInfo(state, state.tasks[0]);
  assert.match(info.detail, /https:\/\/demo-instance.example.test/);
  assert.match(info.detail, /demo.member/);
});
