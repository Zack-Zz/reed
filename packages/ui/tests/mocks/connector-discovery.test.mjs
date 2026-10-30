import test from 'node:test';
import assert from 'node:assert/strict';
import { getMockDiscoveryCandidates, createDiscoveredDraft, findMatchingConnector } from '../../src/mock/connector-discovery.js';
import { DEFAULT_ENDPOINT, projectFixtures, suggestedMappings } from '../../src/mock/connectors.js';

const candidate = (fields = {}) => ({ id: 'local-center', name: '云效 · 产品团队', edition: 'center', organizationId: 'demo-team', organizationName: '产品团队', endpoint: DEFAULT_ENDPOINT, principal: 'demo.member', sourceLabel: '模拟本机 CLI 配置', foundFields: ['组织 ID', '模拟账号'], ready: true, ...fields });

test('发现提供三份独立的本地模拟候选，不携带令牌或连接检测结果', () => {
  const candidates = getMockDiscoveryCandidates();
  assert.equal(candidates.length, 3);
  assert.equal(candidates.filter(item => item.edition === 'center').length, 2);
  assert.equal(candidates.filter(item => item.edition === 'region').length, 1);
  const incomplete = candidates.find(item => !item.ready);
  assert.equal(incomplete.edition, 'center');
  assert.equal(incomplete.organizationId, '');
  for (const item of candidates) {
    assert.deepEqual(Object.keys(item).sort(), ['id', 'name', 'edition', 'organizationId', 'organizationName', 'endpoint', 'principal', 'sourceLabel', 'foundFields', 'ready'].sort());
    assert.ok(item.foundFields.length && item.foundFields.every(field => typeof field === 'string'));
    assert.match(item.sourceLabel, /模拟/);
  }
  candidates[0].name = '已编辑';
  candidates[0].foundFields.push('已编辑');
  assert.notEqual(getMockDiscoveryCandidates()[0].name, '已编辑');
  assert.ok(!getMockDiscoveryCandidates()[0].foundFields.includes('已编辑'));
});

test('空结果与本地服务不可用均保留明确的模拟语义', () => {
  assert.deepEqual(getMockDiscoveryCandidates('empty'), []);
  assert.throws(() => getMockDiscoveryCandidates('unavailable'), /模拟.*本地服务.*不可用/);
});

for (const edition of ['center', 'region']) test(`${edition} 草稿正确预填、默认只读且没有冒充检测通过`, () => {
  const input = candidate({ edition, endpoint: edition === 'center' ? '' : 'https://DEMO-REGION.example.test/' });
  const draft = createDiscoveredDraft(input);
  assert.equal(draft.name, input.name);
  assert.equal(draft.edition, edition);
  assert.equal(draft.organizationId, input.organizationId);
  assert.equal(draft.organizationName, input.organizationName);
  assert.equal(draft.endpoint, edition === 'center' ? DEFAULT_ENDPOINT : 'https://demo-region.example.test');
  assert.equal(draft.principal, input.principal);
  assert.deepEqual(draft.projects, projectFixtures(edition).slice(0, 1));
  assert.equal(draft.workItemType, 'requirement');
  assert.equal(draft.syncMode, 'read_only');
  assert.equal(draft.mockAccess, 'full');
  assert.equal(draft.mockCli, 'ready');
  assert.deepEqual(draft.statusMappings, suggestedMappings(edition, draft.projects, 'requirement'));
  assert.deepEqual(draft.setupSource, { kind: 'discovered', candidateId: input.id, label: input.sourceLabel });
  assert.deepEqual(Object.keys(draft).sort(), ['name', 'edition', 'organizationId', 'organizationName', 'endpoint', 'principal', 'projects', 'workItemType', 'syncMode', 'mockAccess', 'mockCli', 'statusMappings', 'setupSource'].sort());
});

test('缺组织 ID 的候选仍生成可编辑草稿，不篡改输入或带出额外字段', () => {
  const input = candidate({ organizationId: '', ready: false, token: 'fake-secret', checks: [{ status: 'passed' }], status: 'connected', enabled: true, arbitrary: { nested: true } });
  const before = structuredClone(input);
  const existing = [{ name: '其他连接' }], originalExisting = structuredClone(existing);
  const draft = createDiscoveredDraft(input, existing);
  assert.equal(draft.organizationId, '');
  for (const field of ['id', 'token', 'checks', 'status', 'enabled', 'arbitrary', 'ready', 'foundFields']) assert.ok(!(field in draft), field);
  assert.ok(!JSON.stringify(draft).includes('fake-secret'));
  draft.organizationId = '补齐组织';
  draft.projects.push('补充项目');
  draft.statusMappings[draft.projects[0]].todo = '改动映射';
  assert.deepEqual(input, before);
  assert.deepEqual(existing, originalExisting);
  assert.notDeepEqual(createDiscoveredDraft(input).statusMappings, draft.statusMappings);
});

test('名称去重忽略首尾空白和大小写，递增查找空闲后缀', () => {
  const input = candidate({ name: '  Demo Team  ' });
  const existing = [{ name: 'demo team' }, { name: ' DEMO TEAM（2） ' }, { name: '其他名称' }];
  assert.equal(createDiscoveredDraft(input, existing).name, 'Demo Team（3）');
  assert.equal(createDiscoveredDraft(candidate({ name: '新连接' }), existing).name, '新连接');
});

test('未知版本与不安全或不完整的实例地址在生成草稿时被拒绝', () => {
  assert.throws(() => createDiscoveredDraft(candidate({ edition: 'other' })), /版本/);
  for (const endpoint of ['', 'http://demo.example.test', 'https://user:pass@demo.example.test', 'https://demo.example.test?token=fake', 'https://demo.example.test#token', 'not-a-url']) {
    assert.throws(() => createDiscoveredDraft(candidate({ edition: 'region', endpoint })), /HTTPS|实例|地址/, endpoint);
  }
  assert.throws(() => createDiscoveredDraft(candidate({ endpoint: 'https://demo.example.test?token=fake' })), /HTTPS|实例|地址/);
});

test('中心版通过组织与账号匹配已有连接，忽略展示名称和历史来源', () => {
  const input = candidate({ organizationId: ' demo-team ', principal: ' demo.member ' });
  const legacy = { ...candidate(), id: 'legacy', legacy: true };
  const existing = { ...candidate(), id: 'existing', name: '已改名', endpoint: '' };
  const connectors = [legacy, { ...existing, id: 'wrong-principal', principal: 'other.member' }, { ...existing, id: 'wrong-org', organizationId: 'another-team' }, { ...existing, id: 'wrong-edition', edition: 'region' }, existing];
  const before = structuredClone(connectors);
  assert.equal(findMatchingConnector(input, connectors), existing);
  assert.deepEqual(connectors, before);
  assert.equal(findMatchingConnector(input, [legacy]), null);
});

test('中心版身份同时包含服务地址，空地址与默认服务等价，显式不同地址不匹配', () => {
  const input = candidate();
  const existing = { ...input, id: 'existing', endpoint: '' };
  assert.equal(findMatchingConnector(input, [existing]), existing);
  assert.equal(findMatchingConnector({ ...input, endpoint: '' }, [{ ...existing, endpoint: DEFAULT_ENDPOINT }])?.id, 'existing');
  assert.equal(findMatchingConnector(input, [{ ...existing, endpoint: 'https://another-service.example.test' }]), null);
  assert.equal(findMatchingConnector({ ...input, endpoint: 'https://another-service.example.test' }, [existing]), null);
  const custom = { ...existing, endpoint: 'https://CUSTOM.example.test:443/team/' };
  assert.equal(findMatchingConnector({ ...input, endpoint: 'https://custom.example.test/team' }, [custom]), custom);
  assert.equal(findMatchingConnector({ ...input, endpoint: 'https://custom.example.test?token=fake' }, [{ ...custom, endpoint: 'https://custom.example.test?token=fake' }]), null);
});

test('Region 通过规范化 HTTPS 实例地址与账号匹配，保留路径身份', () => {
  const input = candidate({ edition: 'region', endpoint: ' https://DEMO.example.test:443/team/ ', organizationId: '' });
  const existing = { ...input, id: 'existing', endpoint: 'https://demo.example.test/team' };
  assert.equal(findMatchingConnector(input, [{ ...existing, endpoint: 'https://demo.example.test/other' }, { ...existing, principal: 'another.member' }, existing]), existing);
  assert.equal(findMatchingConnector(input, [{ ...existing, endpoint: 'https://demo.example.test/Team' }]), null);
});

test('不完整身份和不安全实例不能误匹配；没有相同配置时返回 null', () => {
  for (const input of [candidate({ organizationId: '' }), candidate({ principal: '' }), candidate({ edition: 'other' }), candidate({ edition: 'region', endpoint: '' }), candidate({ edition: 'region', endpoint: 'https://demo.example.test?token=fake' })]) {
    assert.equal(findMatchingConnector(input, [{ ...input, id: 'existing' }]), null);
  }
  assert.equal(findMatchingConnector(candidate(), []), null);
});
