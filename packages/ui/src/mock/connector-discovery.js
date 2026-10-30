import { DEFAULT_ENDPOINT, projectFixtures, suggestedMappings } from './connectors.js';

// Static demo data only. Discovery never inspects the machine or invokes a CLI.
const mockCandidates = [
  {
    id: 'mock-local-center',
    name: '云效 · 本机中心版',
    edition: 'center',
    organizationId: 'demo-local-team',
    organizationName: '本机演示团队',
    endpoint: DEFAULT_ENDPOINT,
    principal: 'demo.local.member',
    sourceLabel: '模拟本机 CLI · 中心版配置',
    foundFields: ['组织 ID', '模拟账号身份', '模拟 PAT 已配置（不显示值）'],
    ready: true,
  },
  {
    id: 'mock-local-region',
    name: '云效 · 本机 Region',
    edition: 'region',
    organizationId: '',
    organizationName: 'Region 演示团队',
    endpoint: 'https://demo-region.example.test',
    principal: 'demo.region.member',
    sourceLabel: '模拟本机 CLI · Region 配置',
    foundFields: ['HTTPS 实例地址', '模拟账号身份', '模拟 PAT 已配置（不显示值）'],
    ready: true,
  },
  {
    id: 'mock-local-incomplete',
    name: '云效 · 待补齐组织',
    edition: 'center',
    organizationId: '',
    organizationName: '',
    endpoint: DEFAULT_ENDPOINT,
    principal: 'demo.other.member',
    sourceLabel: '模拟本机 CLI · 不完整配置',
    foundFields: ['模拟账号身份', '模拟 PAT 已配置（不显示值）'],
    ready: false,
  },
];

export function getMockDiscoveryCandidates(scenario = 'found') {
  if (scenario === 'unavailable')
    throw new Error('模拟本地服务不可用，请稍后重试或选择自定义配置。');
  if (scenario === 'empty') return [];
  return structuredClone(mockCandidates);
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

function normalizeEndpoint(value) {
  const input = text(value);
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error('请输入有效的 HTTPS 实例地址。');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    input.includes('?') ||
    input.includes('#')
  ) {
    throw new Error('HTTPS 实例地址不能包含账号密码、查询参数或片段。');
  }
  return url.href.replace(/\/+$/, '');
}

function uniqueName(value, connectors) {
  const base = text(value) || '云效 · 发现的配置';
  const names = new Set(connectors.map((connector) => text(connector.name).toLowerCase()));
  let name = base,
    suffix = 2;
  while (names.has(name.toLowerCase())) name = `${base}（${suffix++}）`;
  return name;
}

export function createDiscoveredDraft(candidate, existingConnectors = []) {
  const { edition } = candidate;
  if (!['center', 'region'].includes(edition)) throw new Error('不支持的云效版本。');
  const endpoint = normalizeEndpoint(
    text(candidate.endpoint) || (edition === 'center' ? DEFAULT_ENDPOINT : ''),
  );
  const projects = projectFixtures(edition).slice(0, 1);
  const workItemType = 'requirement';
  // Deliberately enumerate form fields; discoveries are not saved connectors.
  return {
    name: uniqueName(candidate.name, existingConnectors),
    edition,
    organizationId: text(candidate.organizationId),
    organizationName: text(candidate.organizationName),
    endpoint,
    principal: text(candidate.principal),
    projects,
    workItemType,
    syncMode: 'read_only',
    mockAccess: 'full',
    mockCli: 'ready',
    statusMappings: suggestedMappings(edition, projects, workItemType),
    setupSource: {
      kind: 'discovered',
      candidateId: text(candidate.id),
      label: text(candidate.sourceLabel),
    },
  };
}

function identityOf(candidate) {
  if (!candidate || !['center', 'region'].includes(candidate.edition) || !text(candidate.principal))
    return null;
  if (candidate.edition === 'center' && !text(candidate.organizationId)) return null;
  try {
    const endpoint = normalizeEndpoint(
      text(candidate.endpoint) || (candidate.edition === 'center' ? DEFAULT_ENDPOINT : ''),
    );
    return candidate.edition === 'center'
      ? JSON.stringify([text(candidate.organizationId), endpoint])
      : endpoint;
  } catch {
    return null;
  }
}

export function findMatchingConnector(candidate, connectors) {
  const identity = identityOf(candidate);
  if (!identity) return null;
  return (
    connectors.find(
      (connector) =>
        !connector.legacy &&
        connector.edition === candidate.edition &&
        text(connector.principal) === text(candidate.principal) &&
        identityOf(connector) === identity,
    ) || null
  );
}
