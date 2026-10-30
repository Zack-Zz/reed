import { useWorkbenchRuntime } from '../runtime-context.js';
import { useI18n } from '../i18n.jsx';
import {
  ChatCircleDots,
  GitBranch,
  CaretRight,
  ArrowUpRight,
  X,
  Plus,
  Folder,
} from '@phosphor-icons/react';
import { taskStatus, Status } from '../ui.jsx';
import { SourceBadge } from '../SourceBadge.jsx';

export function ResourceView({ ctx, view, scope, setScope, resource, setResource }) {
  const { STAGES } = useWorkbenchRuntime().services;
  const { t: tr } = useI18n();
  const { model, task, go, openTask, openForTask, native, setModal } = ctx;
  const sessionMode = view === 'sessions';
  const items = (sessionMode ? model.sessions : model.branches).filter(
    (r) =>
      !scope ||
      (sessionMode
        ? model.tasks.find((t) => t.id === scope)?.sessionIds.includes(r.id)
        : r.taskId === scope),
  );
  const item = items.find((r) => r.id === resource) || items.at(-1),
    owner = model.tasks.find((t) => t.id === item?.taskId);
  return (
    <section className="page resource-page">
      <header className="page-heading">
        <div>
          <h1>{sessionMode ? tr('会话') : tr('分支')}</h1>
          <p>
            {sessionMode
              ? tr('从每段讨论，找到它正在推进的工作。')
              : tr('从代码现场，回到任务与会话。')}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() =>
            openForTask(scope || owner?.id || task.id, sessionMode ? 'link-session' : 'prepare')
          }
        >
          <Plus size={16} />
          {sessionMode ? tr('关联历史会话') : tr('准备工作区')}
        </button>
      </header>
      {scope && (
        <button className="scope-chip" onClick={() => setScope(null)}>
          {tr('关联任务：')}
          {scope}
          <X size={13} />
        </button>
      )}
      <div className="resource-split">
        <div className="resource-list">
          {items.map((r) => (
            <button
              className={r.id === item?.id ? 'selected' : ''}
              key={r.id}
              onClick={() => setResource(r.id)}
            >
              {sessionMode ? <ChatCircleDots size={20} /> : <GitBranch size={20} />}
              <span>
                <strong>{r.title || r.name}</strong>
                <small>
                  <SourceBadge model={model} entity={r} compact interactive={false} /> ·{' '}
                  {sessionMode
                    ? tr(r.stepName || (r.stage == null ? 'task.processing' : STAGES[r.stage]))
                    : r.repo}
                </small>
                {sessionMode ? (
                  <Status value={r.status} />
                ) : (
                  <small>{r.status === 'busy' ? tr('当前会话使用中') : tr('工作区已就绪')}</small>
                )}
              </span>
            </button>
          ))}
        </div>
        {!item ? (
          <div className="empty">
            <Folder size={36} weight="light" />
            <h3>{tr('暂无关联内容')}</h3>
            <p>{tr('从任务的阶段准备区接入会话与工作区。')}</p>
            <button className="secondary" onClick={() => openTask(task.id)}>
              {tr('返回任务')}
            </button>
          </div>
        ) : (
          <div className="resource-detail">
            <header>
              <small>{sessionMode ? item.host : item.repo}</small>
              <h2 className={!sessionMode ? 'branch-heading' : ''}>{item.title || item.name}</h2>
            </header>
            {sessionMode && item.status === 'waiting' && (
              <div className="notice">
                <ChatCircleDots size={21} />
                <span>
                  {tr('需要你答复')}
                  <small>{owner?.notes.at(-1) || tr('请确认处理边界与当前设计。')}</small>
                </span>
              </div>
            )}
            <dl>
              <dt>{tr('数据来源')}</dt>
              <dd>
                <SourceBadge model={model} entity={item} open={ctx.showOrigin} />
              </dd>
              <dt>{tr('关联任务来源')}</dt>
              <dd>
                <SourceBadge model={model} entity={owner} open={ctx.showOrigin} />
              </dd>
              <dt>{tr('关联任务')}</dt>
              <dd>
                <button className="text-link" onClick={() => openTask(owner.id)}>
                  {owner.id} · {owner.title}
                  <CaretRight size={15} />
                </button>
              </dd>
              <dt>{tr('当前阶段')}</dt>
              <dd>
                {tr(owner.workflow?.stepLabels[owner.stage] || 'task.processing')} ·{' '}
                {tr(taskStatus(owner))}
              </dd>
              {sessionMode ? (
                <>
                  <dt>{tr('执行归属')}</dt>
                  <dd>
                    {owner.sessionId === item.id
                      ? tr('当前阶段执行会话')
                      : tr('历史关联，保留讨论与材料')}
                  </dd>
                  <dt>{tr('开发分支')}</dt>
                  <dd>
                    {item.branch ? (
                      <button className="text-link" onClick={() => go('branches', owner.id)}>
                        {item.branch}
                        <CaretRight size={15} />
                      </button>
                    ) : (
                      tr('此阶段未使用隔离分支')
                    )}
                  </dd>
                </>
              ) : (
                <>
                  <dt>{tr('隔离工作区')}</dt>
                  <dd className="mono">{item.path}</dd>
                  <dt>{tr('关联会话')}</dt>
                  <dd>
                    {item.sessionId ? (
                      <button
                        className="text-link"
                        onClick={() => go('sessions', owner.id, item.sessionId)}
                      >
                        {tr('打开关联会话')}
                        <CaretRight size={15} />
                      </button>
                    ) : (
                      tr('等待会话接入')
                    )}
                  </dd>
                  <dt>{tr('验证与交付')}</dt>
                  <dd>
                    {owner.accepted[3] ? tr('当前范围已通过验证') : tr('尚未通过全部验证')} ·{' '}
                    {item.pr || tr('未关联 PR')}
                  </dd>
                </>
              )}
            </dl>
            <div className="actions">
              <button
                className="primary"
                onClick={() =>
                  sessionMode ? native(item) : setModal({ type: 'workspace', branchId: item.id })
                }
              >
                {sessionMode ? tr('打开原生会话') : tr('打开工作区')}
                <ArrowUpRight size={14} />
              </button>
              <button className="quiet" onClick={() => openTask(owner.id)}>
                {tr('查看任务')}
              </button>
            </div>
            <p className="footnote">
              {sessionMode
                ? tr('演示中将打开会话预览，不会启动真实宿主。')
                : tr('打开目录与切换分支是不同操作，演示不会执行真实 Git 命令。')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
