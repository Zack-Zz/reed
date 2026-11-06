import { useEffect, useRef } from 'react';
import { ArrowUpRight, CaretRight, ChatCircleDots, X } from '@phosphor-icons/react';
import { useI18n } from './i18n.jsx';
import { IconButton, taskStatus } from './ui.jsx';
import { SourceBadge } from './SourceBadge.jsx';

/** 项目/任务共用的会话与分支详情抽屉；内容承接原顶层会话分支视图。 */
export interface ResourceViewTarget {
  kind: 'session' | 'branch';
  id: string;
}
interface ResourceDrawerCtx {
  model: any;
  setModal: (modal: any) => void;
  // 资源抽屉跳任务必须走专用入口：先关闭抽屉再导航，避免顶层抽屉挡住目标。
  openTaskFromResource?: (id: string) => void;
  native: (session: any) => void;
  showOrigin: (entity: any) => void;
}
interface ResourceDrawerProps {
  ctx: ResourceDrawerCtx;
  view: ResourceViewTarget;
  close: () => void;
}
export function ResourceDrawer({ ctx, view, close }: ResourceDrawerProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  const { model } = ctx;
  const sessionMode = view.kind === 'session';
  const item = (sessionMode ? model.sessions : model.branches).find(
    (entry: any) => entry.id === view.id,
  );
  const owner = model.tasks.find((task: any) => task.id === item?.taskId);
  const linkedSession =
    !sessionMode && item?.sessionId
      ? model.sessions.find((entry: any) => entry.id === item.sessionId)
      : null;
  const localDeviceId = model.devices?.find((device: any) => device.isLocal)?.id ?? 'device-this';
  const originDevice = model.devices?.find((device: any) => device.id === item?.originDeviceId);
  const remoteSession = Boolean(
    sessionMode && originDevice && item.originDeviceId !== localDeviceId,
  );
  return (
    <dialog
      ref={ref}
      className="resource-drawer"
      aria-label={t(item ? item.title || item.name : '资源详情')}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
    >
      <header className="drawer-header">
        <span>
          {sessionMode ? <ChatCircleDots size={17} /> : <code>{item?.repo}</code>}
          <strong>{item ? item.title || item.name : t('资源不存在')}</strong>
        </span>
        <div>
          <IconButton label={t('关闭详情')} onClick={close}>
            <X size={19} />
          </IconButton>
        </div>
      </header>
      {!item ? (
        <div className="drawer-content">
          <p className="muted">{t('该会话或分支已不存在。')}</p>
        </div>
      ) : (
        <div className="drawer-content">
          {sessionMode && item.status === 'waiting' && (
            <div className="notice">
              <ChatCircleDots size={21} />
              <span>
                {t('需要你答复')}
                <small>{owner?.notes.at(-1) || t('请确认处理边界与当前设计。')}</small>
              </span>
            </div>
          )}
          <dl className="resource-detail">
            <dt>{t('数据来源')}</dt>
            <dd>
              <SourceBadge model={model} entity={item} open={ctx.showOrigin} />
            </dd>
            {owner && (
              <>
                <dt>{t('关联任务')}</dt>
                <dd>
                  <button
                    className="text-link"
                    onClick={() => ctx.openTaskFromResource?.(owner.id)}
                  >
                    {owner.id} · {owner.title}
                    <CaretRight size={15} />
                  </button>
                </dd>
                <dt>{t('任务状态')}</dt>
                <dd>{t(taskStatus(owner))}</dd>
              </>
            )}
            {sessionMode ? (
              <>
                <dt>{t('执行归属')}</dt>
                <dd>
                  {owner && owner.sessionId === item.id
                    ? t('当前阶段执行会话')
                    : t('历史关联，保留讨论与材料')}
                </dd>
                <dt>{t('开发分支')}</dt>
                <dd>{item.branch ? <code>{item.branch}</code> : t('此阶段未使用隔离分支')}</dd>
                <dt>{t('来源设备')}</dt>
                <dd>{originDevice ? originDevice.name : t('本机')}</dd>
              </>
            ) : (
              <>
                <dt>{t('隔离工作区')}</dt>
                <dd className="mono">{item.path}</dd>
                <dt>{t('关联会话')}</dt>
                <dd>
                  {linkedSession ? (
                    <button className="text-link" onClick={() => ctx.native(linkedSession)}>
                      {linkedSession.title}
                      <CaretRight size={15} />
                    </button>
                  ) : (
                    t('等待会话接入')
                  )}
                </dd>
                <dt>{t('验证与交付')}</dt>
                <dd>
                  {owner?.accepted?.[3] ? t('当前范围已通过验证') : t('尚未通过全部验证')} ·{' '}
                  {item.pr || t('未关联 PR')}
                </dd>
              </>
            )}
          </dl>
          <div className="actions">
            {sessionMode ? (
              remoteSession ? (
                <button
                  className="primary"
                  disabled
                  title={`${t('原生会话保存在')} ${originDevice.name} · ${t('本机无法直接打开')}`}
                >
                  {t('打开原生会话')}
                  <ArrowUpRight size={14} />
                </button>
              ) : (
                <button className="primary" onClick={() => ctx.native(item)}>
                  {t('打开原生会话')}
                  <ArrowUpRight size={14} />
                </button>
              )
            ) : (
              <button
                className="primary"
                onClick={() => ctx.setModal({ type: 'workspace', branchId: item.id })}
              >
                {t('打开工作区')}
                <ArrowUpRight size={14} />
              </button>
            )}
            {owner && (
              <button className="quiet" onClick={() => ctx.openTaskFromResource?.(owner.id)}>
                {t('查看任务')}
              </button>
            )}
          </div>
          {remoteSession && (
            <p className="footnote basis-warning">
              {t('原生会话保存在')} {originDevice.name} · {t('本机无法直接打开')}
            </p>
          )}
          <p className="footnote">
            {sessionMode
              ? t('演示中将打开会话预览，不会启动真实宿主。')
              : t('打开目录与切换分支是不同操作，演示不会执行真实 Git 命令。')}
          </p>
        </div>
      )}
    </dialog>
  );
}
