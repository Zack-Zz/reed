import { getBoardColumn } from './personal-board.js';

// Pure, local fixtures. Nothing in this module starts a process or sends a request.
export const PROGRESS_STATES = [
  { id: 'todo', label: '待办' },
  { id: 'in_progress', label: '进行中' },
  { id: 'review', label: '评审中' },
  { id: 'done', label: '完成' },
];
export const WORK_ITEM_TYPES = [
  { id: 'requirement', label: '需求' },
  { id: 'task', label: '任务' },
  { id: 'bug', label: '缺陷' },
];
export const EDITIONS = { center: '中心版', region: 'Region 版' };
export const MOCK_ACCESS = {
  full: '正常 · 读写权限',
  read_only: '仅有读取权限',
  expired: '令牌已过期',
  denied: '无项目访问权限',
};
export const DEFAULT_ENDPOINT = 'https://openapi-rdc.aliyuncs.com';
export const CHECK_LABELS = {
  cli: '官方 CLI 与插件',
  auth: '令牌与账号',
  identity: '组织／实例身份',
  projects: '项目读取权限',
  mapping: '工作项与状态映射',
  write: '写入能力',
};

export function remoteStatuses(edition, workItemType = 'requirement') {
  const suffix = workItemType === 'requirement' ? '' : `-${workItemType}`;
  return (
    edition === 'region'
      ? [
          ['new', '待处理', 'todo'],
          ['active', '处理中', 'in_progress'],
          ['review', '待评审', 'review'],
          ['closed', '已关闭', 'done'],
        ]
      : [
          ['todo', '待办', 'todo'],
          ['doing', '进行中', 'in_progress'],
          ['review', '评审中', 'review'],
          ['done', '已完成', 'done'],
        ]
  ).map(([id, name, category]) => ({ id: `${edition}-${id}${suffix}`, name, category }));
}
export function suggestedMappings(edition, projects, workItemType) {
  const statuses = remoteStatuses(edition, workItemType);
  return Object.fromEntries(
    projects.map((project) => [
      project,
      Object.fromEntries(
        PROGRESS_STATES.map((state) => [
          state.id,
          statuses.find((status) => status.category === state.id).id,
        ]),
      ),
    ]),
  );
}
export function projectFixtures(edition) {
  return edition === 'region' ? ['移动工作台', '交付平台'] : ['成员中心', '基础服务', '管理门户'];
}
export function mappingIssues(connector) {
  const statuses = remoteStatuses(connector.edition, connector.workItemType);
  return connector.projects.flatMap((project) =>
    PROGRESS_STATES.flatMap((state) => {
      const value = connector.statusMappings?.[project]?.[state.id];
      const target = statuses.find((item) => item.id === value);
      if (!target) return [`${project} · ${state.label}尚未映射有效的云效状态`];
      if ((state.id === 'done') !== (target.category === 'done'))
        return [`${project} · 完成状态只能与云效终态对应`];
      return [];
    }),
  );
}
export function mockConnectionCheck(connector) {
  let blocked = false;
  const checks = [];
  const step = (id, passed, detail, required = true) => {
    const status = blocked ? 'blocked' : !required ? 'not_required' : passed ? 'passed' : 'failed';
    checks.push({
      id,
      label: CHECK_LABELS[id],
      status,
      detail: blocked ? '前置检测未通过，未继续检测' : detail,
    });
    if (required && !passed) blocked = true;
  };
  step(
    'cli',
    connector.mockCli !== 'missing',
    connector.mockCli === 'missing'
      ? '模拟未找到 aliyun 或云效插件；配置后重新检测。'
      : '模拟检测：aliyun 3.5.2 · aliyun-cli-devops 0.7.0',
  );
  step(
    'auth',
    connector.mockAccess !== 'expired',
    connector.mockAccess === 'expired'
      ? '模拟 PAT 已过期；切换为有效的演示令牌后重试。'
      : `模拟 PAT 有效 · ${connector.principal}`,
  );
  step(
    'identity',
    Boolean(connector.edition === 'region' ? connector.endpoint : connector.organizationId),
    connector.edition === 'region'
      ? `模拟实例：${connector.endpoint}`
      : `模拟组织：${connector.organizationId}`,
  );
  step(
    'projects',
    connector.mockAccess !== 'denied' && connector.projects.length > 0,
    connector.mockAccess === 'denied'
      ? '模拟账号无项目读取权限，请调整演示权限。'
      : `可读取 ${connector.projects.length} 个模拟项目`,
  );
  const readable = !blocked;
  const issues = mappingIssues(connector);
  step('mapping', issues.length === 0, issues[0] || '已按项目与工作项类型核对准确状态 ID');
  step(
    'write',
    connector.mockAccess === 'full',
    connector.syncMode === 'read_only'
      ? '仅拉取模式，无需写入检测'
      : connector.mockAccess === 'read_only'
        ? '模拟令牌只有读取权限，不能回写工作项。'
        : '模拟写权限检查通过；未执行真实写入或创建测试数据。',
    connector.syncMode === 'bidirectional',
  );
  return { checks, status: readable ? 'connected' : 'error' };
}
export function normalizeConnector(connector) {
  if (connector.legacy) return connector;
  const edition = connector.edition || 'center';
  const workItemType = connector.workItemType || 'requirement';
  const next = {
    driver: 'aliyun-cli',
    edition,
    principal: 'demo.member',
    mockAccess: 'full',
    mockCli: 'ready',
    workItemType,
    setupSource: { kind: 'unknown' },
    statusMappings: suggestedMappings(edition, connector.projects || [], workItemType),
    ...connector,
  };
  if (!next.checks)
    next.checks = next.status === 'connected' ? mockConnectionCheck(next).checks : [];
  return next;
}
export const canReadConnector = (connector) =>
  Boolean(connector?.enabled && !connector.legacy && connector.status === 'connected');
export const canWriteConnector = (connector) =>
  canReadConnector(connector) &&
  connector.syncMode === 'bidirectional' &&
  !mappingIssues(connector).length &&
  connector.checks?.find((item) => item.id === 'write')?.status === 'passed';
export function mappedTaskStatus(connector, task, sessions = []) {
  if (
    !connector ||
    !connector.projects.includes(task.project) ||
    task.sourceWorkItemType !== connector.workItemType
  )
    return null;
  const progress = getBoardColumn(
    task.status === 'archived' ? { ...task, status: 'done' } : task,
    sessions,
  );
  const id = connector.statusMappings?.[task.project]?.[progress];
  const status = remoteStatuses(connector.edition, connector.workItemType).find(
    (item) => item.id === id,
  );
  return status
    ? {
        id: status.id,
        name: status.name,
        progress,
        connectorId: connector.id,
        project: task.project,
        workItemType: connector.workItemType,
      }
    : null;
}

const requireThat = (value, reason) => {
  if (!value) throw new Error(reason);
};
const text = (value, label) => {
  requireThat(typeof value === 'string' && value.trim(), `请填写${label}`);
  return value.trim();
};
function rejectCredentials(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    requireThat(
      !/token|password|apikey|secret|authorization|credential/i.test(key.replace(/[_-]/g, '')),
      '本地模拟连接不接收或保存凭据',
    );
    rejectCredentials(nested);
  }
}
function config(input) {
  const edition = input.edition || 'center';
  requireThat(Object.hasOwn(EDITIONS, edition), '请选择云效版本：中心版或 Region 版');
  requireThat(
    input.driver === undefined || input.driver === 'aliyun-cli',
    '演示仅支持官方 CLI 驱动',
  );
  const name = text(input.name, '连接名称');
  const organizationId = edition === 'center' ? text(input.organizationId, '组织 ID') : '';
  const organizationName =
    typeof input.organizationName === 'string' ? input.organizationName.trim() : '';
  requireThat(
    input.endpoint === undefined || typeof input.endpoint === 'string',
    '连接地址必须是 HTTPS 地址',
  );
  let endpoint = input.endpoint?.trim() || '';
  requireThat(edition !== 'region' || endpoint, 'Region 版请填写实例地址');
  if (endpoint) {
    let url;
    try {
      url = new URL(endpoint);
    } catch {
      throw new Error('连接地址必须是合法 HTTPS 地址');
    }
    requireThat(
      url.protocol === 'https:' &&
        url.hostname &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        !endpoint.includes('?') &&
        !endpoint.includes('#'),
      '连接地址仅允许不含凭据、查询参数或片段的 HTTPS 地址',
    );
    endpoint = endpoint.replace(/\/$/, '');
  }
  requireThat(Array.isArray(input.projects) && input.projects.length > 0, '请至少配置一个项目');
  const projects = [...new Set(input.projects.map((project) => text(project, '项目名称')))];
  requireThat(['read_only', 'bidirectional'].includes(input.syncMode), '同步模式必须为只读或双向');
  const workItemType = input.workItemType || 'requirement';
  requireThat(
    WORK_ITEM_TYPES.some((item) => item.id === workItemType),
    '请选择有效工作项类型',
  );
  const mockAccess = input.mockAccess || 'full',
    mockCli = input.mockCli || 'ready';
  requireThat(
    Object.hasOwn(MOCK_ACCESS, mockAccess) && ['ready', 'missing'].includes(mockCli),
    '请选择有效模拟权限或 CLI 场景',
  );
  const principal =
    input.principal === undefined ? 'demo.member' : text(input.principal, '模拟账号');
  const statusMappings =
    input.statusMappings === undefined
      ? suggestedMappings(edition, projects, workItemType)
      : input.statusMappings;
  requireThat(
    statusMappings && typeof statusMappings === 'object' && !Array.isArray(statusMappings),
    '状态映射格式无效',
  );
  const cleanedMappings = Object.fromEntries(
    projects.map((project) => [
      project,
      Object.fromEntries(
        PROGRESS_STATES.map((state) => {
          const value = statusMappings[project]?.[state.id] ?? '';
          requireThat(typeof value === 'string', '状态映射必须使用远端状态 ID');
          return [state.id, value];
        }),
      ),
    ]),
  );
  const source = input.setupSource || { kind: 'manual' };
  requireThat(['manual', 'discovered', 'unknown'].includes(source.kind), '配置来源无效');
  const setupSource =
    source.kind === 'discovered'
      ? {
          kind: 'discovered',
          candidateId: text(source.candidateId, '发现候选标识'),
          label: text(source.label, '配置来源说明'),
        }
      : { kind: source.kind };
  return {
    name,
    edition,
    driver: 'aliyun-cli',
    organizationId,
    organizationName,
    endpoint,
    principal,
    projects,
    syncMode: input.syncMode,
    workItemType,
    mockAccess,
    mockCli,
    statusMappings: cleanedMappings,
    setupSource,
  };
}
function hasReference(value, id) {
  if (!value || typeof value !== 'object') return false;
  if (value.origin?.kind === 'connector' && value.origin.connectorId === id) return true;
  return Object.values(value).some((nested) => hasReference(nested, id));
}
const identity = (connector) =>
  JSON.stringify([
    connector.edition,
    connector.organizationId,
    connector.endpoint,
    connector.principal,
  ]);
const access = (connector) => JSON.stringify([connector.mockCli, connector.mockAccess]);
const scope = (connector) =>
  JSON.stringify([
    connector.projects,
    connector.workItemType,
    connector.statusMappings,
    connector.syncMode,
  ]);
export function applyConnectorAction(state, action) {
  if (
    !['CREATE_CONNECTOR', 'UPDATE_CONNECTOR', 'TEST_CONNECTOR', 'TOGGLE_CONNECTOR'].includes(
      action.type,
    )
  )
    return false;
  rejectCredentials(action);
  const uniqueName = (name, id) =>
    requireThat(
      !state.connectors.some(
        (item) => item.id !== id && item.name.trim().toLowerCase() === name.toLowerCase(),
      ),
      '连接名称已存在，请使用唯一名称',
    );
  if (action.type === 'CREATE_CONNECTOR') {
    const fields = config(action);
    uniqueName(fields.name);
    let number = state.connectors.length + 1;
    while (state.connectors.some((item) => item.id === `connector-${number}`)) number += 1;
    state.connectors.push({
      id: `connector-${number}`,
      provider: 'yunxiao',
      ...fields,
      status: 'disconnected',
      enabled: true,
      checks: [],
    });
    return true;
  }
  const connector = state.connectors.find((item) => item.id === action.connectorId);
  requireThat(connector, '找不到指定 Connector 连接');
  if (connector.legacy) {
    requireThat(
      action.type === 'UPDATE_CONNECTOR' &&
        Object.keys(action).every((key) => ['type', 'connectorId', 'name', 'taskId'].includes(key)),
      '旧演示来源仅允许改名，原连接配置未记录',
    );
    const name = text(action.name, '连接名称');
    uniqueName(name, connector.id);
    connector.name = name;
    return true;
  }
  if (action.type === 'UPDATE_CONNECTOR') {
    const fields = config({ ...connector, ...action });
    uniqueName(fields.name, connector.id);
    const changedIdentity = identity(fields) !== identity(connector);
    const referenced = hasReference(
      {
        tasks: state.tasks,
        sessions: state.sessions,
        branches: state.branches,
        events: state.events,
      },
      connector.id,
    );
    requireThat(
      !referenced || !changedIdentity,
      '已有数据引用此连接，不能修改账号、组织、版本或地址身份，请创建新连接',
    );
    if (changedIdentity || access(fields) !== access(connector)) {
      connector.status = 'disconnected';
      connector.checks = [];
    } else if (scope(fields) !== scope(connector))
      connector.checks = connector.checks.filter((item) => !['mapping', 'write'].includes(item.id));
    Object.assign(connector, fields);
  } else if (action.type === 'TEST_CONNECTOR') {
    requireThat(connector.enabled, '连接已停用，请先启用');
    requireThat(['connected', 'error'].includes(action.outcome), '无效的模拟连接测试结果');
    Object.assign(
      connector,
      mockConnectionCheck(
        action.outcome === 'error' ? { ...connector, mockAccess: 'expired' } : connector,
      ),
    );
  } else connector.enabled = !connector.enabled;
  return true;
}
