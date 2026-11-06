import { createConfiguration } from './configuration.ts';
import { normalizeConnector, EDITIONS } from './connectors.js';
import { normalizeTask } from './task-lifecycle.js';
import { refreshRelationEvidence } from './relation-evidence.js';

export const DEMO_CONNECTOR_ID = 'connector-yunxiao-demo';
const LEGACY_CONNECTOR_ID = 'connector-yunxiao-legacy';

export const createDemoConnector = () =>
  normalizeConnector({
    id: DEMO_CONNECTOR_ID,
    provider: 'yunxiao',
    name: '云效 · 示例组织',
    organizationId: 'demo-org',
    organizationName: '示例组织',
    endpoint: '',
    projects: ['成员中心'],
    syncMode: 'bidirectional',
    status: 'connected',
    enabled: true,
  });
const localOrigin = () => ({ kind: 'local', system: 'reed' });
const gitOrigin = (repo) => ({ kind: 'local', system: 'git', repo });

// Old caches never recorded a Connector identity. Keep that uncertainty rather
// than silently attributing their remote data to a newly configured instance.
const DEFAULT_AGENTS = [
  { id: 'codex', name: 'Codex' },
  { id: 'claude-code', name: 'Claude Code' },
  { id: 'zcode', name: 'ZCode' },
];
const normalizeDirectoryPath = (path) =>
  String(path ?? '')
    .trim()
    .replace(/\/+$/, '');
export function normalizeState(state) {
  const next = structuredClone(state);
  next.relations ??= [];
  next.configuration ??= createConfiguration();
  next.connectors ??= [createDemoConnector()];
  next.connectors = next.connectors.map(normalizeConnector);
  // 项目工作区建模集合：目录与 Agent 工作区可能后于旧快照存在，缺省时补空。
  next.projects ??= [];
  next.directories ??= [];
  next.agents ??= structuredClone(DEFAULT_AGENTS);
  next.agentWorkspaces ??= [];
  next.directories = next.directories.map((directory) => ({
    ...directory,
    path: normalizeDirectoryPath(directory.path),
  }));
  let needsLegacy = false;
  for (const task of next.tasks ?? []) {
    normalizeTask(task);
    if (!task.origin) {
      if (task.source === '云效') {
        task.origin = {
          kind: 'connector',
          connectorId: LEGACY_CONNECTOR_ID,
          externalId: task.externalId,
        };
        needsLegacy = true;
      } else task.origin = task.source === '本地' ? localOrigin() : { kind: 'unknown' };
    }
    for (const document of task.docs ?? []) document.origin ??= { kind: 'unknown' };
    if (task.workspace) task.workspace.origin ??= gitOrigin(task.repo);
    // 先恢复全部本地项目，再统一回填身份，避免本地/外部任务的排列影响加载结果。
    // 来源项目名仍属于外部事实，不据此自动创建 Reed 项目。
    if (
      !task.projectId &&
      task.project &&
      task.origin?.kind === 'local' &&
      task.origin.system === 'reed' &&
      !next.projects.some((item) => item.name === task.project)
    ) {
      let number = next.projects.length + 1;
      while (next.projects.some((item) => item.id === `project-${number}`)) number += 1;
      next.projects.push({ id: `project-${number}`, name: task.project });
    }
  }
  for (const task of next.tasks ?? []) {
    // 展示镜像：projectId ↔ project 名称、workspace.directoryId ↔ repo 名称。
    // 身份优先：目录只认任务所属项目内的唯一匹配；跨项目、歧义或失效身份
    // 丢弃后重解，不按仓库显示名选第一项。
    if (task.projectId) {
      const project = next.projects.find((item) => item.id === task.projectId);
      if (project) task.project = project.name;
    } else if (task.project) {
      task.projectId = next.projects.find((item) => item.name === task.project)?.id ?? null;
    }
    if (task.workspace) {
      const linked = task.workspace.directoryId
        ? next.directories.find((item) => item.id === task.workspace.directoryId)
        : null;
      const trusted =
        linked && linked.kind === 'git' && linked.projectId === (task.projectId ?? null);
      if (!trusted) {
        const matches = task.repo
          ? next.directories.filter(
              (item) =>
                item.kind === 'git' &&
                item.projectId === (task.projectId ?? null) &&
                item.name === task.repo,
            )
          : [];
        task.workspace.directoryId = matches.length === 1 ? matches[0].id : null;
      }
      const directory = task.workspace.directoryId
        ? next.directories.find((item) => item.id === task.workspace.directoryId)
        : null;
      if (directory?.kind === 'git') task.repo = directory.name;
    }
  }
  // 设备维度补默认值：本地样例/旧草稿没有 devices 集合时按单机补齐。
  next.devices ??= [{ id: 'device-this', name: '本机', isLocal: true }];
  for (const device of next.devices) {
    device.isLocal ??= device.id === 'device-this';
  }
  for (const workspace of next.agentWorkspaces ?? []) {
    workspace.deviceId ??= next.devices[0]?.id ?? 'device-this';
  }
  for (const session of next.sessions ?? []) {
    if (session.agentWorkspaceId) {
      const workspace = next.agentWorkspaces.find((item) => item.id === session.agentWorkspaceId);
      const agent = workspace && next.agents.find((item) => item.id === workspace.agentId);
      if (agent) session.host = agent.name;
    }
    session.origin ??= session.host ? { kind: 'host', host: session.host } : { kind: 'unknown' };
    const workspace = session.agentWorkspaceId
      ? next.agentWorkspaces.find((item) => item.id === session.agentWorkspaceId)
      : undefined;
    session.originDeviceId ??= workspace?.deviceId ?? next.devices[0]?.id ?? 'device-this';
  }
  for (const branch of next.branches ?? [])
    branch.origin ??= branch.repo || branch.path ? gitOrigin(branch.repo) : { kind: 'unknown' };
  for (const event of next.events ?? []) event.origin ??= { kind: 'unknown' };
  if (needsLegacy && !next.connectors.some((item) => item.id === LEGACY_CONNECTOR_ID)) {
    next.connectors.push({
      id: LEGACY_CONNECTOR_ID,
      provider: 'yunxiao',
      name: '云效 · 旧演示来源',
      organizationId: '',
      organizationName: '',
      endpoint: '',
      projects: [],
      syncMode: 'read_only',
      status: 'unconfigured',
      enabled: false,
      legacy: true,
    });
  }
  refreshRelationEvidence(next);
  return next;
}

export function getOriginInfo(
  state,
  entity,
  t = (key, values = {}) =>
    key.replace(/\{(\w+)\}/g, (whole, name) =>
      Object.hasOwn(values, name) ? String(values[name]) : whole,
    ),
) {
  const origin = entity?.origin;
  if (origin?.kind === 'connector') {
    const connector = state.connectors?.find((item) => item.id === origin.connectorId);
    if (!connector)
      return {
        kind: 'connector',
        label: t('未知连接'),
        detail: t('连接 {id} 不存在；外部编号 {externalId}', {
          id: origin.connectorId || t('未记录'),
          externalId: origin.externalId || t('未记录'),
        }),
        connectorId: origin.connectorId,
        status: 'unconfigured',
      };
    const status =
      {
        connected: '模拟已连接',
        disconnected: '未连接',
        error: '模拟连接失败',
        unconfigured: '待配置',
      }[connector.status] || '状态待确认';
    const detail = [
      connector.legacy
        ? t('旧缓存未记录原连接配置')
        : connector.edition === 'region'
          ? t('实例：{value}', { value: connector.endpoint || t('未记录') })
          : t('组织：{value}', {
              value: connector.organizationName || connector.organizationId || t('未记录'),
            }),
      t(EDITIONS[connector.edition] || '版本未记录'),
      t('账号：{value}', { value: connector.principal || t('未记录') }),
      t('项目：{value}', {
        value: entity.project || connector.projects?.join('、') || t('未记录'),
      }),
      t(connector.enabled ? '已启用' : '已停用'),
      t(status),
      t(connector.syncMode === 'bidirectional' ? '双向同步' : '只读'),
      origin.externalId ? t('外部编号：{value}', { value: origin.externalId }) : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const duplicatedName = state.connectors.some(
      (item) =>
        item.id !== connector.id &&
        item.name?.trim().toLowerCase() === connector.name?.trim().toLowerCase(),
    );
    const label = duplicatedName ? `${connector.name} · ${connector.id}` : connector.name;
    return {
      kind: 'connector',
      label,
      detail,
      connectorId: connector.id,
      status: connector.status,
    };
  }
  if (origin?.kind === 'local' && origin.system === 'reed')
    return {
      kind: 'local',
      label: t('本地 · Reed'),
      detail: t(origin.actor === 'manual' ? 'Reed 本地手工保存' : 'Reed 本地数据与操作'),
    };
  if (origin?.kind === 'local' && origin.system === 'git')
    return {
      kind: 'local',
      label: t('本地 Git'),
      detail: [origin.repo, entity.path].filter(Boolean).join(' · ') || t('本地模拟 Git 工作区'),
    };
  if (origin?.kind === 'host' && origin.host)
    return {
      kind: 'host',
      label: origin.host,
      detail: t('{host} 模拟会话或产出，未经真实宿主执行', { host: origin.host }),
    };
  return {
    kind: 'unknown',
    label: t('来源待确认'),
    detail: t('未记录该实体的来源，不能从关联任务推断'),
  };
}
