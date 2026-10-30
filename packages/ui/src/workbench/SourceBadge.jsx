import { useWorkbenchRuntime } from './runtime-context.js';
import { useI18n } from './i18n.jsx';
import { YunxiaoMark } from './YunxiaoMark.jsx';
import { Plugs, Folder, GitBranch, ChatCircleDots, Info } from '@phosphor-icons/react';

import { Modal } from './ui.jsx';

export function SourceBadge({ model, entity, open, compact = false, interactive = true }) {
  const { getOriginInfo } = useWorkbenchRuntime().services;
  const { t } = useI18n();
  const info = getOriginInfo(model, entity, t);
  const Icon =
    info.kind === 'connector'
      ? Plugs
      : info.kind === 'host'
        ? ChatCircleDots
        : entity?.origin?.system === 'git'
          ? GitBranch
          : info.kind === 'local'
            ? Folder
            : Info;
  const yunxiao =
    info.kind === 'connector' &&
    model.connectors?.find((item) => item.id === info.connectorId)?.provider === 'yunxiao';
  const content = (
    <>
      {yunxiao ? <YunxiaoMark size={compact ? 16 : 18} /> : <Icon size={compact ? 12 : 14} />}
      <span>{info.label}</span>
    </>
  );
  const className = `origin-badge origin-${info.kind} ${compact ? 'compact' : ''}`;
  return interactive && open ? (
    <button
      type="button"
      className={className}
      title={info.detail}
      aria-label={t('查看来源：{label}', { label: info.label })}
      onClick={() => open(entity)}
    >
      {content}
    </button>
  ) : (
    <span className={className} title={info.detail}>
      {content}
    </span>
  );
}

export function OriginDialog({ ctx, modal, close }) {
  const { getOriginInfo, EDITIONS, WORK_ITEM_TYPES } = useWorkbenchRuntime().services;
  const { t } = useI18n();
  const info = getOriginInfo(ctx.model, { origin: modal.origin, project: modal.entityProject }, t);
  const connector = ctx.model.connectors?.find((item) => item.id === info.connectorId);
  const type =
    info.kind === 'connector'
      ? t('需求来源连接器')
      : info.kind === 'host'
        ? t('执行宿主')
        : modal.origin?.system === 'git'
          ? t('本地 Git')
          : info.kind === 'local'
            ? t('本地产出')
            : t('来源待确认');
  return (
    <Modal title={t('数据来源')} close={close}>
      <div className="modal-body origin-details">
        {modal.itemTitle && <p className="origin-item-title">{modal.itemTitle}</p>}
        <SourceBadge
          model={ctx.model}
          entity={{ origin: modal.origin, project: modal.entityProject }}
          interactive={false}
        />
        <dl>
          <dt>{t('来源类型')}</dt>
          <dd>{t(type)}</dd>
          {info.connectorId && (
            <>
              <dt>{t('连接实例')}</dt>
              <dd>{info.label}</dd>
              <dt>Connector ID</dt>
              <dd className="mono">{info.connectorId}</dd>
            </>
          )}
          {connector && (
            <>
              <dt>{t('组织版本')}</dt>
              <dd>{t(EDITIONS[connector.edition]) || t('历史配置未记录')}</dd>
              <dt>{t('账号身份')}</dt>
              <dd>{connector.principal || t('历史配置未记录')}</dd>
              <dt>{t('组织／空间')}</dt>
              <dd>
                {connector.organizationName ||
                  connector.organizationId ||
                  connector.endpoint ||
                  t('旧存档未记录')}
              </dd>
              {modal.entityProject && (
                <>
                  <dt>{t('所属项目')}</dt>
                  <dd>{modal.entityProject}</dd>
                  <dt>{t('来源工作项类型')}</dt>
                  <dd>
                    {t(
                      WORK_ITEM_TYPES.find((item) => item.id === modal.sourceWorkItemType)?.label,
                    ) || t('历史记录未保存')}
                  </dd>
                </>
              )}
              {connector.edition === 'region' && (
                <>
                  <dt>{t('实例地址')}</dt>
                  <dd className="mono">{connector.endpoint}</dd>
                </>
              )}
              <dt>{t('连接项目范围')}</dt>
              <dd>{connector.projects.join(t('、')) || t('待配置')}</dd>
              <dt>{t('可用状态')}</dt>
              <dd>
                {connector.legacy
                  ? t('历史来源，原配置待确认')
                  : !connector.enabled
                    ? t('已停用')
                    : connector.status === 'connected'
                      ? t('模拟已连接')
                      : connector.status === 'error'
                        ? t('模拟连接失败')
                        : t('等待测试连接')}
              </dd>
              <dt>{t('同步模式')}</dt>
              <dd>{connector.syncMode === 'bidirectional' ? t('双向同步') : t('仅拉取')}</dd>
            </>
          )}
          {modal.origin?.externalId && (
            <>
              <dt>{t('外部编号')}</dt>
              <dd>{modal.origin.externalId}</dd>
            </>
          )}
        </dl>
        <p className="footnote">{info.detail}</p>
        <p className="footnote">
          {t('来源描述这条数据的来处。关联到某个任务，不会改变它原来的来源。')}
        </p>
      </div>
      <footer className="modal-actions">
        <button className="quiet" onClick={close}>
          {t('返回')}
        </button>
        {info.connectorId && (
          <button className="primary" onClick={() => ctx.openConnectors(info.connectorId)}>
            {t('管理此连接')}
          </button>
        )}
      </footer>
    </Modal>
  );
}
