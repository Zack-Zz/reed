import { useWorkbenchRuntime } from './runtime-context.js';
import { useI18n } from './i18n.jsx';
import { Cloud, ArrowClockwise, Plugs } from '@phosphor-icons/react';

import { Modal, activity, syncLabel } from './ui.jsx';
import { SourceBadge } from './SourceBadge.jsx';

export function SyncDialog({ ctx, close }) {
  const {
    connectorReadable,
    connectorWritable,
    mappedTaskStatus,
    connectorStatus,
    STAGES,
    PROGRESS_STATES,
  } = useWorkbenchRuntime().services;
  const { t: tr } = useI18n();
  const { task, model, run } = ctx;
  const connector = model.connectors.find((item) => item.id === task.origin?.connectorId);
  const external = task.origin?.kind === 'connector';
  const inScope =
    connector?.projects.includes(task.project) &&
    connector.workItemType === task.sourceWorkItemType;
  const readable = connectorReadable(connector) && inScope,
    writable = connectorWritable(connector) && inScope;
  const mapped = mappedTaskStatus(connector, task, model.sessions);
  return (
    <Modal title={tr('来源同步')} close={close} wide>
      <div className="modal-body">
        <SourceBadge model={model} entity={task} open={ctx.showOrigin} />
        <div
          className={`notice ${['conflict', 'unknown'].includes(task.sync) ? 'warning' : 'subtle'}`}
        >
          <Cloud size={21} />
          <span>
            {external
              ? readable
                ? tr(syncLabel[task.sync])
                : tr('来源暂不可用')
              : tr('独立的本地任务')}
            <small>{tr('本地保存与远端同步分别记录，以下推送与回读均为本地模拟。')}</small>
          </span>
        </div>
        {external && (
          <>
            {!readable ? (
              <div className="notice">
                <Plugs size={21} />
                <span>
                  {connector && !inScope
                    ? tr('任务项目或类型不在同步范围')
                    : connector
                      ? tr(connectorStatus(connector))
                      : tr('连接身份未记录')}
                  <small>
                    {tr('来源数据保留，本地流程仍可继续。配置并核验连接后，再使用外部同步。')}
                  </small>
                </span>
                <button
                  className="secondary"
                  onClick={() => ctx.openConnectors(task.origin.connectorId)}
                >
                  {tr('配置连接器')}
                </button>
              </div>
            ) : (
              !writable && (
                <div className="notice">
                  <Plugs size={21} />
                  <span>
                    {connector.syncMode === 'read_only' ? tr('当前连接仅拉取') : tr('回写尚未就绪')}
                    <small>
                      {connector.syncMode === 'read_only'
                        ? tr('本地修改保留在 Reed。需要回写时，先启用双向同步。')
                        : tr('请检查状态映射与写入权限，并重新检测完整配置。')}
                    </small>
                  </span>
                  <button className="quiet" onClick={() => ctx.openConnectors(connector.id)}>
                    {tr('配置')}
                  </button>
                </div>
              )
            )}
            <div className="sync-diff">
              <div>
                <small>{tr('本地期望')}</small>
                <strong>{task.title}</strong>
                <p>
                  {tr(task.workflow?.stepLabels[task.stage] || 'task.processing')} ·{' '}
                  {tr(activity[task.attention])}
                </p>
              </div>
              <div>
                <small>{tr('{p0} · 模拟记录', { p0: connector?.name || tr('原始来源') })}</small>
                <strong>{task.remoteTitle || tr('尚未记录远端快照')}</strong>
                <p>
                  {task.sync === 'conflict'
                    ? tr('远端也有修改，等待逐项处理')
                    : tr('以最近一次模拟回读为准')}
                </p>
              </div>
            </div>
            <div className="sync-mapping-preview">
              <span>{tr('状态映射预览')}</span>
              <strong>
                {mapped
                  ? `${tr(PROGRESS_STATES.find((item) => item.id === mapped.progress)?.label)} → ${mapped.name}`
                  : tr('当前任务没有可用映射')}
              </strong>
              {mapped && (
                <small className="mono">
                  {task.project} · {mapped.id}
                </small>
              )}
              <small>
                {tr('{p0}。来源状态与本地阶段、验收分别保存。', {
                  p0: task.remoteStatus
                    ? tr('最近模拟回读：{p0}（{p1}）', {
                        p0: task.remoteStatus.name,
                        p1: task.remoteStatus.id,
                      })
                    : tr('尚无模拟状态回读记录'),
                })}
              </small>
            </div>
            {task.sync === 'unknown' ? (
              <>
                <p className="muted">{tr('当前值相同不能证明旧请求已结束。核查前不自动重发。')}</p>
                <button
                  className="secondary"
                  disabled={!readable}
                  onClick={() =>
                    run('SET_SYNC', { value: 'pending' }, '模拟核查已确认旧请求结束，可重新同步')
                  }
                >
                  {tr('模拟核查：旧请求已结束')}
                </button>
              </>
            ) : task.sync === 'conflict' && !task.remoteTitle ? (
              <button
                className="secondary"
                disabled={!readable}
                onClick={() => run('SET_SYNC', { value: 'conflict' }, '已生成新的模拟远端快照')}
              >
                {tr('重建模拟远端快照')}
              </button>
            ) : task.sync === 'conflict' ? (
              <div className="actions">
                <button
                  className="primary"
                  disabled={!writable}
                  onClick={() => run('RESOLVE_SYNC', { choice: 'local' }, '已保留本地值，等待推送')}
                >
                  {tr('保留本地并待推送')}
                </button>
                <button
                  className="secondary"
                  disabled={!readable}
                  onClick={() =>
                    run('RESOLVE_SYNC', { choice: 'remote' }, '已接受此连接的模拟远端值')
                  }
                >
                  {tr('接受远端')}
                </button>
                <button
                  className="quiet"
                  onClick={() => {
                    run('RESOLVE_SYNC', { choice: 'pause' });
                    close();
                  }}
                >
                  {tr('稍后处理')}
                </button>
              </div>
            ) : (
              <button
                className="primary"
                disabled={!writable}
                onClick={() => run('SET_SYNC', { value: 'synced' }, '模拟写入与回读完成')}
              >
                <ArrowClockwise size={16} />
                {tr('同步并回读')}
              </button>
            )}
            {readable && (
              <details className="demo-controls">
                <summary>{tr('体验其他同步结果')}</summary>
                <button
                  className="secondary"
                  onClick={() => run('SET_SYNC', { value: 'conflict' })}
                >
                  {tr('模拟双方修改冲突')}
                </button>
                <button className="secondary" onClick={() => run('SET_SYNC', { value: 'unknown' })}>
                  {tr('模拟写入结果未知')}
                </button>
              </details>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
