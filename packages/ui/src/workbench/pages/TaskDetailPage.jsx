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
  syncLabel,
  taskStatus,
  taskTypeLabel,
  artifactOutcomeLabel,
  IconButton,
  Markdown,
  Status,
} from '../ui.jsx';
import { SourceBadge } from '../SourceBadge.jsx';
import { Select } from '../Select.jsx';
import { TaskContextSection } from '../TaskContextSection';

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
    </>
  );
}

function TaskActions({ ctx }) {
  const { t } = useI18n();
  const { task, run, setModal } = ctx;
  if (task.status === 'archived')
    return (
      <div className="notice">
        <CheckCircle size={20} />
        <span>
          {t('任务已归档')}
          <small>{t('历史与资源保留，恢复后仍为已完成。')}</small>
        </span>
        <button className="secondary" onClick={() => run('RESTORE_TASK', {}, '已恢复为已完成')}>
          {t('恢复归档')}
        </button>
      </div>
    );
  if (task.status === 'done')
    return (
      <div className="actions">
        <button className="secondary" onClick={() => run('ARCHIVE_TASK', {}, '任务已归档')}>
          {t('归档任务')}
        </button>
        <button className="quiet" onClick={() => setModal({ type: 'task-reopen' })}>
          {t('重新打开任务')}
        </button>
        <span className="action-help">{t('完成决定保留；继续工作需要记录原因。')}</span>
      </div>
    );
  if (task.status === 'review')
    return (
      <div className="actions">
        <button className="primary" onClick={() => setModal({ type: 'task-review' })}>
          {t('审阅并验收任务')}
        </button>
        <button className="secondary" onClick={() => setModal({ type: 'task-feedback' })}>
          {t('要求修改')}
        </button>
        <button
          className="quiet"
          onClick={() => setModal({ type: 'task-feedback', withdraw: true })}
        >
          {t('撤回评审')}
        </button>
      </div>
    );
  if (task.status === 'todo')
    return (
      <div className="actions">
        <button className="primary" onClick={() => run('START_TASK', {}, '已开始处理任务')}>
          {t('开始处理')}
        </button>
        {task.docs.length > 0 && (
          <button
            className="secondary"
            onClick={() => setModal({ type: 'task-review', startAndSubmit: true })}
          >
            {t('开始并提交评审')}
          </button>
        )}
        <span className="action-help">{t('开始处理不会自动启动 Agent。')}</span>
      </div>
    );
  return (
    <div className="actions">
      <button className="primary" onClick={() => setModal({ type: 'task-artifact' })}>
        {t('提交产物')}
      </button>
      <button className="secondary" onClick={() => setModal({ type: 'task-review' })}>
        {t('提交任务评审')}
      </button>
      <button className="quiet" onClick={() => setModal({ type: 'prepare' })}>
        {t('交给 Agent')}
      </button>
    </div>
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
  const { connectorReadable, getStageReview, getTaskTypes, currentStepDocuments, stepIsSkipped } =
    useWorkbenchRuntime().services;
  const { t } = useI18n();
  const { task, model, stage, setStage, setModal, go, run } = ctx;
  const [more, setMore] = useState(false);
  const TASK_TYPES = getTaskTypes(model, true).filter(
    (type) => type.enabled || type.id === task.taskType,
  );
  const editable = ['todo', 'in_progress'].includes(task.status);
  const localTask = task.origin?.kind === 'local' && task.origin.system === 'reed';
  const completion = task.completions?.at(-1);
  const pendingBasis =
    completion?.applicability === 'pending' ||
    (['done', 'archived'].includes(task.status) &&
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
    <div className="detail-layout">
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
                        setModal({ type: 'edit-title' });
                      }}
                    >
                      {t('编辑任务标题')}
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
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => {
                          setMore(false);
                          run('REQUEUE_TASK', {}, '任务已退回待办');
                        }}
                      >
                        {t('退回待办')}
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
                <button
                  onClick={() => {
                    setMore(false);
                    setModal({ type: 'timeline' });
                  }}
                >
                  <ListBullets size={16} />
                  {t('活动记录')}
                </button>
              </div>
            )}
          </div>
        </div>
        <h1>{task.title}</h1>
        <button className="quiet small" onClick={() => ctx.openRelations?.(task.id)}>
          {t('relation.open')}
        </button>
        <div className="task-meta-line">
          {editable ? (
            <Select
              className="task-type-select"
              aria-label={t('修改任务类型')}
              value={task.taskType || 'uncategorized'}
              onChange={(event) =>
                run('UPDATE_TASK_TYPE', { taskType: event.target.value }, '本地任务类型已更新')
              }
            >
              {TASK_TYPES.map(({ id, label, builtin }) => (
                <option key={id} value={id}>
                  {builtin ? t(label) : label}
                </option>
              ))}
            </Select>
          ) : (
            <span className="type-tag">{taskTypeLabel(task, model, t)}</span>
          )}
          <Status value={task.status} text={taskStatus(task)} />
          {task.paused && (
            <span className="status">
              <Pause size={12} />
              {t('已暂停')}
            </span>
          )}
          <span>{task.project || t('未归组')}</span>
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
        <section className="task-flow-section">
          <div className="section-title">
            <h2>{t('目标说明与验收条件')}</h2>
            {editable && (
              <button className="text-link" onClick={() => setModal({ type: 'task-scope' })}>
                {t('编辑目标与验收条件')}
              </button>
            )}
          </div>
          {task.goal ? (
            <Markdown body={task.goal} />
          ) : (
            <p className="muted">{t('先明确目标，提交评审前补齐可判断的验收条件。')}</p>
          )}
          <ul className="task-criteria">
            {(task.criteria || []).map((criterion) => (
              <li key={criterion.id}>
                <Circle size={10} />
                <span>{criterion.text}</span>
              </li>
            ))}
          </ul>
          {task.requirePassingResult && <p className="footnote">{t('本任务要求执行结果通过。')}</p>}
          {task.status === 'review' && (
            <p className="footnote">{t('评审依据已冻结，采用修改前请先撤回评审。')}</p>
          )}
          <TaskActions ctx={ctx} />
        </section>
        <section className="task-flow-section">
          <div className="section-title">
            <h2>{t('产物与评审')}</h2>
            {task.status === 'review' && (
              <button className="text-link" onClick={() => setModal({ type: 'task-review' })}>
                {t('查看冻结评审依据')}
              </button>
            )}
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
          ) : (
            <p className="muted">{t('尚无任务产物。人工整理或 Agent 结果均可作为交付。')}</p>
          )}
          {completion && (
            <p className="task-decision">
              <CheckCircle size={17} />
              {t('任务完成决定已保留')}
              <small>
                {t(
                  completion.applicability === 'pending'
                    ? '依据待复核'
                    : completion.applicability === 'superseded'
                      ? '已被后轮替代'
                      : '依据有效',
                )}
              </small>
            </p>
          )}
          {(task.reviews?.length || 0) > 0 && (
            <button className="quiet small" onClick={() => setModal({ type: 'task-history' })}>
              {t('查看评审与完成历史')}
            </button>
          )}
        </section>
        <section className="task-flow-section">
          <div className="section-title">
            <h2>{t('处理记录')}</h2>
            <button className="text-link" onClick={() => setModal({ type: 'timeline' })}>
              {t('活动记录')}
            </button>
          </div>
          <ExecutionNotice ctx={ctx} />
          {task.notes?.length ? (
            task.notes.map((note, index) => <p key={index}>{t(note)}</p>)
          ) : (
            <p className="muted">{t('人工处理与 Agent 执行的记录会保留在这里。')}</p>
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
                {task.workflow.steps?.[stage]?.mode === 'manual' ? (
                  <button className="secondary" onClick={() => setModal({ type: 'task-artifact' })}>
                    {t('提交产物')}
                  </button>
                ) : (
                  <button className="secondary" onClick={() => setModal({ type: 'prepare' })}>
                    {t('准备内部步骤')}
                  </button>
                )}
                {(task.attention === 'review' || stageDoc?.outcome === 'manual') && (
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
        <TaskContextSection
          task={task}
          edit={editable && localTask ? () => setModal({ type: 'task-context' }) : undefined}
        />
        <div className="mobile-resources">
          <h3>{t('关联资源')}</h3>
          <Resources ctx={ctx} />
        </div>
      </section>
      <aside className="inspector">
        <h2>{t('关联资源')}</h2>
        <Resources ctx={ctx} />
        <button
          className="quiet small inspector-history"
          onClick={() => setModal({ type: 'timeline' })}
        >
          <ListBullets size={15} />
          {t('查看活动记录 ·')}
          {model.events.filter((event) => event.taskId === task.id).length}
        </button>
        <div className="save-state">
          <CheckCircle size={18} />
          <span>
            {t(saved ? '本地已保存' : '保存失败，内容暂留内存')}
            <small>{t('演示数据 · 仅当前浏览器')}</small>
          </span>
        </div>
      </aside>
    </div>
  );
}
