import { useState } from 'react';
import {
  FileText,
  ChatCircleDots,
  GitBranch,
  DotsThree,
  CheckCircle,
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
} from '../ui.jsx';
import { SourceBadge } from '../SourceBadge.jsx';
import { TaskContextSection } from '../TaskContextSection';
import { TaskRelationsSummary } from '../TaskRelationsSummary';
import { TaskStatusControl } from '../TaskStatusControl';
import { TaskComments } from '../TaskComments';

function Resources({ ctx }) {
  const { t } = useI18n();
  const { task, model, setModal, go } = ctx;
  const sessions = model.sessions.filter((session) => task.sessionIds.includes(session.id));
  return (
    <>
      {task.docs
        .slice(-4)
        .reverse()
        .map((doc) => (
          <button
            key={doc.id}
            className="resource-row"
            onClick={() => setModal({ type: 'document', docId: doc.id })}
          >
            <FileText size={21} />
            <span>
              <strong>
                {doc.title} · V{doc.version}
              </strong>
              <small>{t(doc.stale ? '依据待复核' : '任务产物')}</small>
            </span>
            <span className="text-link">{t('打开')}</span>
          </button>
        ))}
      {sessions.slice(-2).map((session) => (
        <button
          className="resource-row"
          key={session.id}
          onClick={() => go('sessions', task.id, session.id)}
        >
          <ChatCircleDots size={21} />
          <span>
            <strong>{session.title}</strong>
            <small>{t(activity[session.status])}</small>
          </span>
        </button>
      ))}
      {!task.docs.length && !sessions.length && <p className="muted">{t('尚无关联内容')}</p>}
      <button className="quiet small" onClick={() => setModal({ type: 'associations' })}>
        {t('查看全部关联')}
      </button>
      <button
        className="workspace-preview"
        onClick={() =>
          task.workspace.ready ? go('branches', task.id) : setModal({ type: 'associations' })
        }
      >
        <GitBranch size={19} />
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
  const { connectorReadable, getStageReview, currentStepDocuments, stepIsSkipped } =
    useWorkbenchRuntime().services;
  const { t } = useI18n();
  const { task, model, stage, setStage, setModal, go, run } = ctx;
  const [more, setMore] = useState(false);
  const editable = ['todo', 'in_progress'].includes(task.status);
  const localTask = task.origin?.kind === 'local' && task.origin.system === 'reed';
  const hasContext = Boolean(task.project || task.repo || task.references?.length);
  const hasResources = Boolean(task.docs.length || task.sessionIds.length || task.workspace.ready);
  const taskEvents = model.events.filter((event) => event.taskId === task.id);
  const completion = task.completions?.at(-1);
  const pendingBasis =
    ['done', 'archived'].includes(task.status) &&
    (completion?.applicability === 'pending' ||
      task.docs.some((doc) => doc.stale && !doc.supersededWorkflow));
  const stageDoc = task.workflow ? currentStepDocuments(task, stage).at(-1) : null;
  const stageChecks = task.workflow ? getStageReview(model, task) : null;
  const skipRecord =
    task.workflow && stepIsSkipped(task, stage)
      ? [...(task.stepSkips || [])]
          .reverse()
          .find(
            (skip) =>
              skip.stepId === task.workflow.steps?.[stage]?.id &&
              skip.instanceId === task.workflow.instanceId &&
              skip.scopeRevision === task.scopeRevision &&
              skip.applicability === 'valid',
          )
      : null;
  return (
    <div className={`detail-layout${!hasResources ? ' task-detail-basic' : ''}`}>
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
                    <button
                      onClick={() => {
                        setMore(false);
                        setModal({ type: 'task-workflow' });
                      }}
                    >
                      {t('选择内部流程')}
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
        <section className="task-flow-section task-content">
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
          className={`task-flow-section${task.goal || task.criteria?.length || task.requirePassingResult ? '' : ' task-supplement-empty'}`}
        >
          <div className="section-title">
            <h2>{t('minimal.criteria')}</h2>
            {editable && (
              <button className="text-link" onClick={() => setModal({ type: 'task-scope' })}>
                {t(
                  task.goal || task.criteria?.length || task.requirePassingResult
                    ? 'minimal.editCriteria'
                    : 'minimal.addCriteria',
                )}
              </button>
            )}
          </div>
          {task.goal && <Markdown body={task.goal} />}
          {!task.criteria?.length && <p className="muted">{t('minimal.noCriteria')}</p>}
          <ul className="task-criteria">
            {(task.criteria || []).map((criterion) => (
              <li key={criterion.id}>
                <Circle size={10} />
                <span>{criterion.text}</span>
              </li>
            ))}
          </ul>
          {task.requirePassingResult && <p className="footnote">{t('本任务要求执行结果通过。')}</p>}
          {task.status === 'review' && <p className="footnote">{t('minimal.reviewEditHint')}</p>}
        </section>
        {task.docs.length > 0 && (
          <section className="task-flow-section">
            <div className="section-title">
              <h2>{t('minimal.linkedDocuments')}</h2>
            </div>
            {task.docs.length ? (
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
                        <FileText size={20} />
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
                              { documentId: doc.id, expectedScopeRevision: task.scopeRevision },
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
            ) : null}
          </section>
        )}
        <TaskRelationsSummary
          ctx={ctx}
          onLink={editable ? () => setModal({ type: 'relation-link', taskId: task.id }) : undefined}
        />
        <TaskComments key={task.id} ctx={ctx} />
        <section className="task-flow-section">
          <div className="section-title">
            <h2>{t('minimal.history')}</h2>
            <button className="text-link" onClick={() => setModal({ type: 'timeline' })}>
              {t('minimal.allActivity')}
            </button>
          </div>
          <ExecutionNotice ctx={ctx} />
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
        {task.workflow && (
          <section className="task-flow-section optional-workflow">
            <div className="section-title">
              <h2>
                {t('内部流程')} ·{' '}
                {['development', 'testing'].includes(task.workflow.templateId)
                  ? t(task.workflow.name)
                  : task.workflow.name}{' '}
                {task.workflow.version ? `· V${task.workflow.version}` : ''}
              </h2>
              {editable && (
                <button className="text-link" onClick={() => setModal({ type: 'task-workflow' })}>
                  {t('管理流程')}
                </button>
              )}
            </div>
            <p className="footnote">{t('内部步骤确认不会自动提交或完成任务。')}</p>
            <nav className="stage-nav" aria-label={t('内部流程步骤')}>
              {task.workflow.stepLabels.map((label, index) => (
                <button
                  key={task.workflow.steps?.[index]?.id || index}
                  className={`${stage === index ? 'selected' : ''} ${task.accepted?.[index] ? 'accepted' : ''}`}
                  onClick={() => setStage(index)}
                >
                  {task.accepted?.[index] ? <CheckCircle size={17} /> : <Circle size={17} />}
                  <span>
                    {['development', 'testing'].includes(task.workflow.templateId)
                      ? t(label)
                      : label}
                    <small>
                      {t(
                        stepIsSkipped(task, index)
                          ? 'selection.skipped'
                          : task.accepted?.[index]
                            ? '已确认'
                            : index === task.stage
                              ? '当前步骤'
                              : '待开始',
                      )}
                    </small>
                  </span>
                </button>
              ))}
            </nav>
            {skipRecord && (
              <p className="scope-note">
                {t('selection.skipRecorded', { reason: skipRecord.reason })}
              </p>
            )}
            {task.workflow.steps?.[stage] && (
              <div className="workflow-step-requirements">
                <strong>{t('selection.requirements')}</strong>
                <p>
                  {['development', 'testing'].includes(task.workflow.templateId)
                    ? t(task.workflow.steps[stage].goal)
                    : task.workflow.steps[stage].goal}
                </p>
                <p>{task.workflow.steps[stage].instructions}</p>
                {task.workflow.steps[stage].outputs.map((text, index) => (
                  <p key={`output-${index}`}>{text}</p>
                ))}
                {task.workflow.steps[stage].checks.map((text, index) => (
                  <p key={`check-${index}`}>{text}</p>
                ))}
              </div>
            )}
            {task.status === 'in_progress' &&
              stage === task.stage &&
              task.workflow.steps?.[stage]?.required === false &&
              !task.accepted?.[stage] && (
                <button
                  className="quiet small"
                  onClick={() => setModal({ type: 'task-skip-step' })}
                >
                  {t('selection.skip')}
                </button>
              )}
            {task.status === 'in_progress' &&
              stage === task.stage &&
              task.workflow.steps &&
              stageDoc?.origin?.kind === 'host' &&
              !stageDoc.stale &&
              !['running', 'waiting', 'unknown'].includes(task.attention) && (
                <label className="move-confirm">
                  <input
                    type="checkbox"
                    checked={stageDoc.coverageComplete === true}
                    onChange={(e) =>
                      run('ACKNOWLEDGE_STEP_COVERAGE', {
                        documentId: stageDoc.id,
                        documentVersion: stageDoc.version,
                        coverageComplete: e.target.checked,
                      })
                    }
                  />
                  {t('selection.coverageConfirm')}
                </label>
              )}
            {stageDoc && (
              <>
                <button
                  className="text-link"
                  onClick={() => setModal({ type: 'document', docId: stageDoc.id })}
                >
                  {stageDoc.title} · V{stageDoc.version}
                </button>
                <Markdown body={stageDoc.body} preview />
              </>
            )}
            {task.status === 'in_progress' && Number.isInteger(stage) && stage <= task.stage && (
              <button className="quiet small" onClick={() => setModal({ type: 'reopen', stage })}>
                {t('返工此步骤')}
              </button>
            )}
            {task.status === 'in_progress' && stage === task.stage && (
              <div className="actions">
                {task.workflow.steps?.[stage]?.mode !== 'agent' && (
                  <button className="secondary" onClick={() => setModal({ type: 'task-artifact' })}>
                    {t('提交产物')}
                  </button>
                )}
                {task.workflow.steps?.[stage]?.mode !== 'manual' && (
                  <button className="secondary" onClick={() => setModal({ type: 'prepare' })}>
                    {t('准备内部步骤')}
                  </button>
                )}
                {(task.attention === 'review' || stageDoc) && (
                  <button
                    className="secondary"
                    disabled={!stageChecks?.checks.every((check) => check.passed)}
                    title={stageChecks?.checks
                      .filter((check) => !check.passed)
                      .map((check) => t(check.label))
                      .join(' · ')}
                    onClick={() => {
                      const next = run(
                        'ACCEPT_STAGE',
                        {
                          expectedStage: task.stage,
                          documentId: stageDoc?.id,
                          documentVersion: stageDoc?.version,
                        },
                        '内部步骤已确认',
                      );
                      if (next) setStage(next.tasks.find((item) => item.id === task.id).stage);
                    }}
                  >
                    {t('确认内部步骤')}
                  </button>
                )}
              </div>
            )}
          </section>
        )}
        {Boolean(task.workflowHistory?.length) && (
          <details className="workflow-history">
            <summary>
              {t('selection.history')} · {task.workflowHistory.length}
            </summary>
            {task.workflowHistory.map((history, index) => (
              <div key={index}>
                <strong>
                  {history.workflow?.name || t('无内部流程')}{' '}
                  {history.workflow ? `· V${history.workflow.version || 1}` : ''}
                </strong>
                <p>{history.reason}</p>
                <ul>
                  {history.workflow?.stepLabels.map((name, i) => {
                    const step = history.workflow.steps?.[i];
                    const skips = (history.stepSkips || []).filter(
                      (skip) =>
                        step?.id &&
                        skip.instanceId === history.workflow.instanceId &&
                        skip.stepId === step.id,
                    );
                    const skipped =
                      history.accepted[i] &&
                      step?.required === false &&
                      skips.some((skip) => skip.applicability === 'valid');
                    return (
                      <li key={step?.id || i}>
                        {name} (
                        {t(
                          skipped ? 'selection.skipped' : history.accepted[i] ? '已确认' : '待开始',
                        )}
                        )
                        {skips.map((skip, skipIndex) => (
                          <p className="footnote" key={skipIndex}>
                            {skip.applicability !== 'valid' && (
                              <span>{t('selection.invalidatedSkip')} · </span>
                            )}
                            {t('selection.skipRecorded', { reason: skip.reason })}
                          </p>
                        ))}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </details>
        )}
        {hasContext && (
          <TaskContextSection
            task={task}
            showDescription={false}
            edit={editable && localTask ? () => setModal({ type: 'task-context' }) : undefined}
          />
        )}
        {hasResources && (
          <div className="mobile-resources">
            <h3>{t('关联资源')}</h3>
            <Resources ctx={ctx} />
          </div>
        )}
        <div className={`save-state${saved ? '' : ' save-state-error'}`} role="status">
          <span>
            {t(saved ? '本地已保存' : '保存失败，内容暂留内存')}
            <small>{t('演示数据 · 仅当前浏览器')}</small>
          </span>
        </div>
      </section>
      {hasResources && (
        <aside className="inspector">
          <h2>{t('关联资源')}</h2>
          <Resources ctx={ctx} />
          <button
            className="quiet small inspector-history"
            onClick={() => setModal({ type: 'timeline' })}
          >
            <ListBullets size={15} />
            {t('minimal.allActivityCount', { count: taskEvents.length })}
          </button>
        </aside>
      )}
    </div>
  );
}
