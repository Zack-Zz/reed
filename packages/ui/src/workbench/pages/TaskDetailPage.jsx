import { useState } from 'react';
import {
  FileText,
  ChatCircleDots,
  GitBranch,
  DotsThree,
  Circle,
  Pause,
  ListBullets,
  WarningCircle,
} from '@phosphor-icons/react';
import { useWorkbenchRuntime } from '../runtime-context.js';
import { useI18n } from '../i18n.jsx';
import {
  activity,
  taskEventText,
  syncLabel,
  taskTypeLabel,
  artifactOutcomeLabel,
  IconButton,
  Markdown,
  Priority,
  formatTimestamp,
} from '../ui.jsx';
import { SourceBadge } from '../SourceBadge.jsx';
import { TaskContextSection } from '../TaskContextSection';
import { TaskRelationsSummary } from '../TaskRelationsSummary';
import { TaskStatusControl } from '../TaskStatusControl';
import { TaskComments } from '../TaskComments';

function Resources({ ctx }) {
  const { t } = useI18n();
  const { task, model, setModal, go, run } = ctx;
  const editable = ['todo', 'in_progress'].includes(task.status);
  const sessions = model.sessions.filter((session) => task.sessionIds.includes(session.id));
  return (
    <>
      {task.docs.length > 0 && (
        <section className="task-resource-group">
          <h3>{t('minimal.linkedDocuments')}</h3>
          <div className="task-artifacts">
            {task.docs
              .slice()
              .reverse()
              .map((doc) => (
                <div className="task-artifact" key={doc.id}>
                  <button
                    className="resource-row"
                    onClick={() => setModal({ type: 'document', docId: doc.id })}
                  >
                    <FileText size={18} />
                    <span>
                      <strong>
                        {doc.title} · V{doc.version}
                      </strong>
                      <small>
                        {t(artifactOutcomeLabel(doc))}
                        {' · '}
                        {t(
                          doc.supersededWorkflow
                            ? 'selection.historical'
                            : doc.stale
                              ? '依据待复核'
                              : '当前范围',
                        )}
                      </small>
                    </span>
                    <span className="text-link">{t('打开原文')}</span>
                  </button>
                  {editable && doc.stale && (
                    <button
                      className="quiet small"
                      onClick={() => {
                        run(
                          'REUSE_TASK_ARTIFACT',
                          {
                            documentId: doc.id,
                            expectedScopeRevision: task.scopeRevision,
                          },
                          '已复用任务产物',
                        );
                      }}
                    >
                      {t('核对并复用此版本')}
                    </button>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}
      {sessions.length > 0 && (
        <section className="task-resource-group">
          <h3>{t('关联会话')}</h3>
          {sessions.slice(-2).map((session) => (
            <button
              className="resource-row"
              key={session.id}
              onClick={() => go('sessions', task.id, session.id)}
            >
              <ChatCircleDots size={18} />
              <span>
                <strong>{session.title}</strong>
                <small>{t(activity[session.status])}</small>
              </span>
            </button>
          ))}
        </section>
      )}
      {!task.docs.length && !sessions.length && <p className="muted">{t('尚无关联内容')}</p>}
      <div className="task-resource-actions">
        <button className="quiet small" onClick={() => setModal({ type: 'associations' })}>
          {t('查看全部关联')}
        </button>
        <button
          className="workspace-preview"
          onClick={() =>
            task.workspace.ready ? go('branches', task.id) : setModal({ type: 'associations' })
          }
        >
          <GitBranch size={18} />
          <span>
            {task.workspace.ready ? task.workspace.branch : t('尚未关联工作区')}
            <small>{t(task.workspace.verified ? '目录已核对' : '关联不代表执行权限')}</small>
          </span>
        </button>
        {task.status === 'in_progress' && (
          <button className="quiet small" onClick={() => setModal({ type: 'prepare' })}>
            {t('交给 Agent')}
          </button>
        )}
      </div>
    </>
  );
}

function ExecutionNotice({ ctx }) {
  const { task, setModal, run } = ctx;
  const { t } = useI18n();
  if (!['running', 'waiting', 'unknown', 'failed'].includes(task.attention)) return null;
  const action =
    task.attention === 'unknown'
      ? 'reconcile'
      : task.attention === 'waiting'
        ? 'native'
        : 'execution';
  return (
    <div className={`notice ${task.attention === 'failed' ? 'danger' : ''}`}>
      <WarningCircle size={19} />
      <span>
        {t(activity[task.attention])}
        <small>{t('执行事实与任务生命周期分别记录。')}</small>
      </span>
      <button
        className="quiet"
        onClick={() => {
          if (task.attention === 'failed') {
            if (run('RETRY_STAGE')) setModal({ type: 'prepare' });
          } else setModal({ type: action, sessionId: task.sessionId });
        }}
      >
        {t(
          task.attention === 'unknown'
            ? '核查执行'
            : task.attention === 'waiting'
              ? '前往答复'
              : task.attention === 'failed'
                ? '准备重试'
                : '查看执行',
        )}
      </button>
    </div>
  );
}

export function TaskDetail({ ctx, saved }) {
  const { connectorReadable } = useWorkbenchRuntime().services;
  const { t, locale } = useI18n();
  const { task, model, setModal, go, run } = ctx;
  const [more, setMore] = useState(false);
  const editable = ['todo', 'in_progress'].includes(task.status);
  const hasScope = Boolean(task.goal || task.criteria?.length || task.requirePassingResult);
  const localTask = task.origin?.kind === 'local' && task.origin.system === 'reed';
  const hasContext = Boolean(task.project || task.repo || task.references?.length);
  const hasResources = Boolean(task.docs.length || task.sessionIds.length || task.workspace.ready);
  const taskEvents = model.events.filter((event) => event.taskId === task.id);
  const completion = task.completions?.at(-1);
  const pendingBasis =
    ['done', 'archived'].includes(task.status) &&
    (completion?.applicability === 'pending' ||
      task.docs.some((doc) => doc.stale && !doc.supersededWorkflow));
  return (
    <div className="detail-layout task-detail">
      <section className="task-main">
        <div className="breadcrumbs">
          <button onClick={() => go(ctx.taskOrigin)}>
            {ctx.taskOrigin === 'personal'
              ? t('我的看板')
              : ctx.taskOrigin === 'relations'
                ? t('relation.title')
                : task.project || t('未归组')}
          </button>
          <span>/</span>
          <span>{task.externalId || task.id}</span>
          <div className="source-status-group">
            <SourceBadge model={model} entity={task} open={ctx.showOrigin} />
            {task.origin?.kind === 'connector' && (
              <button
                className={`source-status sync-${task.sync}`}
                onClick={() => setModal({ type: 'sync' })}
              >
                {connectorReadable(
                  model.connectors.find((item) => item.id === task.origin.connectorId),
                )
                  ? t(syncLabel[task.sync])
                  : t('来源暂不可用')}
              </button>
            )}
          </div>
          <div className="task-menu">
            <IconButton label={t('任务更多操作')} onClick={() => setMore(!more)}>
              <DotsThree size={23} />
            </IconButton>
            {more && (
              <div className="popover">
                {editable && (
                  <>
                    <button
                      onClick={() => {
                        setMore(false);
                        setModal({ type: 'task-basics' });
                      }}
                    >
                      {t('minimal.edit')}
                    </button>
                    {localTask && (
                      <button
                        onClick={() => {
                          setMore(false);
                          setModal({ type: 'task-context' });
                        }}
                      >
                        {t('完善任务信息')}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMore(false);
                        run('TOGGLE_PAUSE');
                      }}
                    >
                      <Pause size={16} />
                      {t(task.paused ? '恢复任务' : '暂停任务')}
                    </button>
                  </>
                )}
                {(task.reviews?.length || task.completions?.length) > 0 && (
                  <button
                    onClick={() => {
                      setMore(false);
                      setModal({ type: 'task-history' });
                    }}
                  >
                    <ListBullets size={16} />
                    {t('minimal.completionHistory')}
                  </button>
                )}
                <button
                  onClick={() => {
                    setMore(false);
                    setModal({ type: 'timeline' });
                  }}
                >
                  <ListBullets size={16} />
                  {t('minimal.allActivity')}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="task-heading">
          <h1>{task.title}</h1>
          {editable && (
            <button className="quiet small" onClick={() => setModal({ type: 'task-basics' })}>
              {t('minimal.edit')}
            </button>
          )}
        </div>
        <div className="task-meta-line">
          <span className="type-tag">
            {t('minimal.typeValue', { type: taskTypeLabel(task, model, t) })}
          </span>
          <Priority value={task.priority} />
          <span className="task-owner">
            {t('负责人')} · {task.owner === 'self' ? t('minimal.you') : t('未指定')}
          </span>
          <TaskStatusControl key={task.id} ctx={ctx} />
          {task.paused && (
            <span className="status">
              <Pause size={12} />
              {t('已暂停')}
            </span>
          )}
          {task.project && <span>{task.project}</span>}
        </div>
        {task.migrationNotice && (
          <p className="scope-note" role="status">
            {t(task.migrationNotice)}
          </p>
        )}
        {pendingBasis && (
          <p className="scope-note" role="status">
            {t('完成依据待复核')}
            <small>{t('保留历史完成事实；补做或采用新范围前请重新打开任务。')}</small>
          </p>
        )}
        <ExecutionNotice ctx={ctx} />
        <div className="detail-reading">
          <section
            className={`task-flow-section task-content${task.description ? '' : ' task-supplement-empty'}`}
          >
            <div className="section-title">
              <h2>{t('minimal.content')}</h2>
              {editable && !task.description && (
                <button className="text-link" onClick={() => setModal({ type: 'task-basics' })}>
                  {t('minimal.addContent')}
                </button>
              )}
            </div>
            {task.description ? (
              <Markdown body={task.description} />
            ) : (
              <p className="muted">{t('minimal.noContent')}</p>
            )}
          </section>
          <section
            className={`task-flow-section task-scope${hasScope ? '' : ' task-supplement-empty'}`}
          >
            <div className="section-title">
              <h2>{t('目标说明与验收条件')}</h2>
              {editable && (
                <button className="text-link" onClick={() => setModal({ type: 'task-scope' })}>
                  {t(hasScope ? '编辑目标与验收条件' : '添加目标与验收条件')}
                </button>
              )}
            </div>
            {task.goal ? (
              <Markdown body={task.goal} />
            ) : (
              <p className="muted">{t('未填写任务目标。')}</p>
            )}
            {!task.criteria?.length && <p className="muted">{t('minimal.noCriteria')}</p>}
            <ul className="task-criteria">
              {(task.criteria || []).map((criterion) => (
                <li key={criterion.id}>
                  <Circle size={10} />
                  <span>{criterion.text}</span>
                </li>
              ))}
            </ul>
            {task.requirePassingResult && (
              <p className="footnote">{t('本任务要求执行结果通过。')}</p>
            )}
            {task.status === 'review' && <p className="footnote">{t('minimal.reviewEditHint')}</p>}
          </section>
          {completion && (
            <section className="task-flow-section task-completion-record">
              <div className="section-title">
                <h2>{t('完成记录')}</h2>
                <button className="text-link" onClick={() => setModal({ type: 'task-history' })}>
                  {t('minimal.completionHistory')}
                </button>
              </div>
              {task.completedAt && (
                <p>
                  {t('完成于')}{' '}
                  <time dateTime={task.completedAt}>
                    {formatTimestamp(task.completedAt, locale)}
                  </time>
                </p>
              )}
              {completion.applicability === 'pending' && (
                <p className="scope-note">{t('完成依据待复核')}</p>
              )}
            </section>
          )}
          <TaskComments key={task.id} ctx={ctx} />
          <section className="task-flow-section">
            <div className="section-title">
              <h2>{t('minimal.history')}</h2>
              <button className="text-link" onClick={() => setModal({ type: 'timeline' })}>
                {t('minimal.allActivity')}
              </button>
            </div>
            <ol className="task-activity-list">
              {taskEvents
                .slice(-4)
                .reverse()
                .map((event) => (
                  <li key={event.id}>
                    <span>{taskEventText(event, t)}</span>
                    <small>{t(event.time)}</small>
                  </li>
                ))}
            </ol>
            {task.notes?.length > 0 && (
              <details className="task-note-details">
                <summary>{t('minimal.notes')}</summary>
                {task.notes.map((note, index) => (
                  <p key={index}>{t(note)}</p>
                ))}
              </details>
            )}
          </section>
        </div>
        <footer className="task-footer">
          {(task.createdAt || task.updatedAt) && (
            <p className="task-timestamps">
              {task.createdAt && (
                <span>
                  {t('创建于')}{' '}
                  <time dateTime={task.createdAt}>{formatTimestamp(task.createdAt, locale)}</time>
                </span>
              )}
              {task.createdAt && task.updatedAt && <span aria-hidden="true">·</span>}
              {task.updatedAt && (
                <span>
                  {t('最近修改')}{' '}
                  <time dateTime={task.updatedAt}>{formatTimestamp(task.updatedAt, locale)}</time>
                </span>
              )}
            </p>
          )}
        </footer>
        <div className={`save-state${saved ? '' : ' save-state-error'}`} role="status">
          <span>
            {t(saved ? '本地已保存' : '保存失败，内容暂留内存')}
            <small>{t('演示数据 · 仅当前浏览器')}</small>
          </span>
        </div>
      </section>
      <aside className="task-support" aria-label={t('任务流与资源')}>
        <TaskRelationsSummary
          ctx={ctx}
          onLink={editable ? () => setModal({ type: 'relation-link', taskId: task.id }) : undefined}
        />
        {hasContext && (
          <TaskContextSection
            task={task}
            showDescription={false}
            edit={editable && localTask ? () => setModal({ type: 'task-context' }) : undefined}
          />
        )}
        {hasResources && (
          <section className="task-linked-resources">
            <h2>{t('关联资源')}</h2>
            <Resources ctx={ctx} />
            <button
              className="quiet small inspector-history"
              onClick={() => setModal({ type: 'timeline' })}
            >
              <ListBullets size={15} />
              {t('minimal.allActivityCount', { count: taskEvents.length })}
            </button>
          </section>
        )}
      </aside>
    </div>
  );
}
