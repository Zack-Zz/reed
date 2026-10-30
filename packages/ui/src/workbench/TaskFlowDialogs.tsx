import { toScopeCriteria } from './acceptance-criteria';
import { WorkflowChangeDialog } from './WorkflowChangeDialog';
import { useState } from 'react';
import { CheckCircle, WarningCircle, Plus, Trash } from '@phosphor-icons/react';
import { useWorkbenchRuntime } from './runtime-context';
import { useI18n } from './i18n.jsx';
import { Modal, Field, Markdown, artifactOutcomeLabel } from './ui.jsx';
import { Select } from './Select.jsx';
import { SourceBadge } from './SourceBadge.jsx';

/** Temporary mock presentation seam. These are not Core or wire DTOs. */
interface Criterion {
  id: string;
  text: string;
}
interface Artifact {
  origin?: Record<string, unknown>;
  id: string;
  title: string;
  version: number;
  body?: string;
  outcome?: string;
  stale?: boolean;
}
interface Review {
  taskTypeName?: string;
  status?: string;
  id?: string;
  snapshot?: string;
  goal?: string;
  criteria?: Criterion[];
  artifacts?: Artifact[];
}
interface Task {
  suggestedCriteria?: string[];
  stage?: number;
  scopeRevision?: number;
  id: string;
  status: string;
  goal?: string;
  criteria?: Criterion[];
  requirePassingResult?: boolean;
  workflow?: { templateId: string; version?: number; name: string; stepLabels: string[] };
  accepted?: boolean[];
  taskType?: string;
  docs: Artifact[];
  review?: Review | null;
  reviews?: Review[];
  completions?: { id: string; reviewId: string; applicability: string }[];
}
interface Gate {
  checks: { id: string; label: string; passed: boolean }[];
  allowed: boolean;
  snapshot: string;
  requiredRelations?: {
    relationId: string;
    taskId: string;
    title: string;
    completionId: string | null;
    scopeRevision: number | null;
    valid: boolean;
  }[];
}
interface Context {
  task: Task;
  model: unknown;
  modal: { type: string; withdraw?: boolean; startAndSubmit?: boolean; sourceDocId?: string };
  setModal: (modal: unknown) => void;
  run: (type: string, fields?: Record<string, unknown>, message?: string) => unknown;
}
interface Services {
  getTaskReview: (model: unknown, task: Task) => Gate;
  getTaskCompletion: (model: unknown, task: Task, options?: { acceptSteps: boolean }) => Gate;
}
const types = [
  'task-scope',
  'task-artifact',
  'task-review',
  'task-reopen',
  'task-feedback',
  'task-workflow',
  'task-history',
  'task-skip-step',
];

export function TaskFlowDialogs({ ctx }: { ctx: Context }) {
  if (!ctx.modal || !types.includes(ctx.modal.type)) return null;
  if (ctx.modal.type === 'task-workflow') return <WorkflowChangeDialog ctx={ctx} />;
  return (
    <TaskFlowDialog
      key={`${ctx.task.id}:${ctx.modal.type}:${ctx.modal.withdraw || false}`}
      ctx={ctx}
    />
  );
}

function TaskFlowDialog({ ctx }: { ctx: Context }) {
  const { t } = useI18n();
  const services = useWorkbenchRuntime().services as unknown as Services;
  const { task, modal, run } = ctx;
  const close = () => ctx.setModal(null);
  const [goal, setGoal] = useState(task.goal || '');
  const [criteria, setCriteria] = useState<Criterion[]>(() =>
    task.criteria?.length
      ? task.criteria.map((item) => ({ ...item }))
      : [{ id: `criterion-${(task.scopeRevision || 0) + 1}-1`, text: '' }],
  );
  const appendCriterion = (entries: Criterion[], text = '') => {
    const used = new Set([...(task.criteria || []), ...entries].map((entry) => entry.id));
    let index = entries.length + 1;
    const prefix = `criterion-${(task.scopeRevision || 0) + 1}`;
    while (used.has(`${prefix}-${index}`)) index++;
    return [...entries, { id: `${prefix}-${index}`, text }];
  };
  const [passing, setPassing] = useState(Boolean(task.requirePassingResult));
  const sourceArtifact = task.docs.find((doc) => doc.id === modal.sourceDocId);
  const [title, setTitle] = useState(sourceArtifact?.title || '');
  const [body, setBody] = useState(sourceArtifact?.body || '');
  const [outcome, setOutcome] = useState(
    sourceArtifact?.outcome &&
      ['manual', 'passed', 'failed', 'not_run'].includes(sourceArtifact.outcome)
      ? sourceArtifact.outcome
      : 'manual',
  );
  const [coverage, setCoverage] = useState(false);
  const [reason, setReason] = useState('');
  const [skipStage] = useState(task.stage);
  const [template, setTemplate] = useState(task.workflow?.templateId || '');
  const [confirmed, setConfirmed] = useState(false);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [acceptSteps, setAcceptSteps] = useState(false);
  const [error, setError] = useState('');
  const finish = (type: string, fields: Record<string, unknown>, message: string) => {
    if (run(type, fields, message)) close();
    else setError('任务或材料已发生变化，请重新核对流转条件。');
  };
  const scopeEditable = ['todo', 'in_progress'].includes(task.status);
  const ErrorMessage = () =>
    error ? (
      <p className="scope-note" role="alert">
        {t(error)}
      </p>
    ) : null;
  const Cancel = () => (
    <button type="button" className="quiet" onClick={close}>
      {t('取消')}
    </button>
  );

  if (modal.type === 'task-history')
    return (
      <Modal title={t('任务评审与完成历史')} close={close} wide>
        <div className="modal-body task-flow-review">
          {(task.reviews || [])
            .slice()
            .reverse()
            .map((review) => {
              const completion = task.completions?.find((item) => item.reviewId === review.id);
              return (
                <section className="task-flow-section" key={review.id}>
                  <h3>{review.id}</h3>
                  {review.taskTypeName && (
                    <p>
                      {t('config.types')} · {review.taskTypeName}
                    </p>
                  )}
                  <p className="muted">
                    {t(
                      review.status === 'accepted'
                        ? '已完成'
                        : review.status === 'submitted'
                          ? '评审中'
                          : '已撤回或要求修改',
                    )}
                    {completion ? ` · ${completion.id}` : ''}
                  </p>
                  {completion && (
                    <p>
                      {t(
                        completion.applicability === 'pending'
                          ? '完成依据待复核'
                          : completion.applicability === 'superseded'
                            ? '已被后轮替代'
                            : '依据有效',
                      )}
                    </p>
                  )}
                  <Markdown body={review.goal || ''} />
                  <ul>
                    {review.criteria?.map((criterion) => (
                      <li key={criterion.id}>{criterion.text}</li>
                    ))}
                  </ul>
                  {review.artifacts?.map((doc) => (
                    <details className="frozen-artifact" key={doc.id}>
                      <summary>
                        {doc.title} · V{doc.version}
                      </summary>
                      <SourceBadge
                        model={ctx.model}
                        entity={doc}
                        open={undefined}
                        interactive={false}
                      />
                      <Markdown body={doc.body || ''} />
                    </details>
                  ))}
                </section>
              );
            })}
        </div>
        <footer className="modal-actions">
          <button type="button" className="quiet" onClick={close}>
            {t('关闭')}
          </button>
        </footer>
      </Modal>
    );

  if (modal.type === 'task-scope')
    return (
      <Modal title={t('编辑目标与验收条件')} close={close} wide>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            finish(
              'SAVE_TASK_SCOPE',
              {
                goal,
                criteria: toScopeCriteria(criteria),
                requirePassingResult: passing,
              },
              '任务目标与验收条件已保存',
            );
          }}
        >
          <div className="modal-body task-flow-form">
            <label className="field">
              {t('任务目标')}
              <textarea
                name="goal"
                required
                rows={4}
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
              />
            </label>
            <section className="scope-criteria-editor" aria-label={t('必要验收条件')}>
              <div className="section-title">
                <h3>{t('必要验收条件')}</h3>
                <button
                  type="button"
                  className="quiet small"
                  onClick={() => setCriteria((items) => appendCriterion(items))}
                >
                  <Plus size={14} /> {t('selection.addCriterion')}
                </button>
              </div>
              {criteria.map((criterion, index) => (
                <div className="scope-criterion-row" key={criterion.id}>
                  <label className="field">
                    {t('selection.criterionNumber', { number: index + 1 })}
                    <textarea
                      name="criteria"
                      rows={2}
                      value={criterion.text}
                      placeholder={t('selection.criterionHint')}
                      onChange={(event) =>
                        setCriteria((items) =>
                          items.map((item) =>
                            item.id === criterion.id ? { ...item, text: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('selection.removeCriterion', { number: index + 1 })}
                    onClick={() =>
                      setCriteria((items) => items.filter((item) => item.id !== criterion.id))
                    }
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </section>
            <label className="move-confirm">
              <input
                type="checkbox"
                checked={passing}
                onChange={(event) => setPassing(event.target.checked)}
              />
              <span>
                {t('要求执行结果通过')}
                <small>{t('仅报告真实结果的任务可以不要求全绿，必要执行覆盖仍须完成。')}</small>
              </span>
            </label>
            <p className="footnote">
              {t('范围变更会使旧产物需要重新核对；已承诺的条件不可在验收时静默忽略。')}
            </p>
            {Boolean(task.suggestedCriteria?.length) && (
              <div className="scope-note">
                <p>{t('selection.suggestions')}</p>
                <button
                  type="button"
                  className="quiet small"
                  onClick={() =>
                    setCriteria((items) =>
                      (task.suggestedCriteria || []).reduce(
                        (next, text) =>
                          next.some((item) => item.text === text)
                            ? next
                            : appendCriterion(next, text),
                        items,
                      ),
                    )
                  }
                >
                  {t('selection.useSuggestions')}
                </button>
              </div>
            )}
            <ErrorMessage />
          </div>
          <footer className="modal-actions">
            <Cancel />
            <button
              className="primary"
              type="submit"
              disabled={
                !scopeEditable || !goal.trim() || !criteria.some((item) => item.text.trim())
              }
            >
              {t('保存任务范围')}
            </button>
          </footer>
        </form>
      </Modal>
    );

  if (modal.type === 'task-artifact')
    return (
      <Modal title={t('提交任务产物')} close={close} wide>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            finish(
              'ADD_TASK_ARTIFACT',
              { title, body, outcome, coverageComplete: coverage, sourceDocId: modal.sourceDocId },
              '任务产物已保存',
            );
          }}
        >
          <div className="modal-body task-flow-form">
            <Field
              label={t('产物标题')}
              name="title"
              required
              value={title}
              onChange={(event: { target: { value: string } }) => setTitle(event.target.value)}
            />
            <label className="field">
              {t('产物内容与执行说明')}
              <textarea
                name="body"
                required
                rows={10}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            <label className="field">
              {t('真实执行结果')}
              <Select
                value={outcome}
                onChange={(event: { target: { value: string } }) => setOutcome(event.target.value)}
              >
                <option value="manual">{t('人工提交')}</option>
                <option value="passed">{t('执行通过')}</option>
                <option value="failed">{t('执行失败')}</option>
                <option value="not_run">{t('未运行')}</option>
              </Select>
            </label>
            <label className="move-confirm">
              <input
                type="checkbox"
                checked={coverage}
                onChange={(event) => setCoverage(event.target.checked)}
              />
              <span>
                {t('已完成约定的必要工作与执行覆盖')}
                <small>{t('未运行或环境失败说明不能替代尚未完成的必要工作。')}</small>
              </span>
            </label>
            <p className="footnote">{t('人工提交记录材料与真实结果，不创建 Agent 执行记录。')}</p>
            <ErrorMessage />
          </div>
          <footer className="modal-actions">
            <Cancel />
            <button
              type="submit"
              className="primary"
              disabled={task.status !== 'in_progress' || !title.trim() || !body.trim()}
            >
              {t('保存产物')}
            </button>
          </footer>
        </form>
      </Modal>
    );

  if (
    modal.type === 'task-feedback' ||
    modal.type === 'task-reopen' ||
    modal.type === 'task-skip-step'
  ) {
    const reopening = modal.type === 'task-reopen';
    const heading =
      modal.type === 'task-skip-step'
        ? 'selection.skip'
        : reopening
          ? '重新打开任务'
          : modal.withdraw
            ? '撤回评审'
            : '要求修改';
    return (
      <Modal title={t(heading)} close={close}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            finish(
              modal.type === 'task-skip-step'
                ? 'SKIP_WORKFLOW_STEP'
                : reopening
                  ? 'REOPEN_TASK'
                  : modal.withdraw
                    ? 'WITHDRAW_TASK_REVIEW'
                    : 'REQUEST_TASK_CHANGES',
              { reason, expectedStage: skipStage },
              modal.type === 'task-skip-step'
                ? 'selection.step-skipped'
                : reopening
                  ? '任务已重新打开'
                  : '评审已退回处理中',
            );
          }}
        >
          <div className="modal-body task-flow-form">
            <p>
              {t(
                modal.type === 'task-skip-step'
                  ? 'selection.skipHint'
                  : reopening
                    ? '记录继续工作的原因与范围，原完成决定和证据保留。'
                    : '记录原因并保留原评审对象，采用新内容后需要重新提交。',
              )}
            </p>
            <label className="field">
              {t('原因与后续工作')}
              <textarea
                name="reason"
                required
                rows={5}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <ErrorMessage />
          </div>
          <footer className="modal-actions">
            <Cancel />
            <button type="submit" className="primary" disabled={!reason.trim()}>
              {t(heading)}
            </button>
          </footer>
        </form>
      </Modal>
    );
  }

  const completing = task.status === 'review';
  const gate = completing
    ? services.getTaskCompletion(ctx.model, task, { acceptSteps })
    : services.getTaskReview(ctx.model, task);
  const review = completing ? task.review : null;
  let snapshotData: { criteria?: Criterion[]; artifacts?: Artifact[]; goal?: string } = {};
  try {
    snapshotData = JSON.parse(gate.snapshot);
  } catch {
    /* Exact review fields remain usable. */
  }
  const frozenCriteria = review?.criteria || snapshotData.criteria || task.criteria || [];
  const frozenArtifacts =
    review?.artifacts || snapshotData.artifacts || task.docs.filter((doc) => !doc.stale);
  const allAccepted =
    frozenCriteria.length > 0 &&
    frozenCriteria.every((criterion) => accepted.includes(criterion.id));
  const pendingSteps = Boolean(
    task.workflow?.stepLabels.some((_, index) => !task.accepted?.[index]),
  );
  // The final click carries the snapshot displayed when this dialog opened.
  // A later model change must be surfaced and re-opened, never silently accepted.
  return (
    <ReviewDialog
      ctx={ctx}
      gate={gate}
      completing={completing}
      frozenGoal={review?.goal || snapshotData.goal || task.goal || ''}
      frozenCriteria={frozenCriteria}
      frozenArtifacts={frozenArtifacts}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
      accepted={accepted}
      setAccepted={setAccepted}
      acceptSteps={acceptSteps}
      setAcceptSteps={setAcceptSteps}
      pendingSteps={pendingSteps}
      allAccepted={allAccepted}
      error={error}
      setError={setError}
      close={close}
    />
  );
}

interface ReviewProps {
  ctx: Context;
  gate: Gate;
  completing: boolean;
  frozenGoal: string;
  frozenCriteria: Criterion[];
  frozenArtifacts: Artifact[];
  confirmed: boolean;
  setConfirmed: (value: boolean) => void;
  accepted: string[];
  setAccepted: (value: string[]) => void;
  acceptSteps: boolean;
  setAcceptSteps: (value: boolean) => void;
  pendingSteps: boolean;
  allAccepted: boolean;
  error: string;
  setError: (value: string) => void;
  close: () => void;
}
function ReviewDialog({
  ctx,
  gate,
  completing,
  frozenGoal,
  frozenCriteria,
  frozenArtifacts,
  confirmed,
  setConfirmed,
  accepted,
  setAccepted,
  acceptSteps,
  setAcceptSteps,
  pendingSteps,
  allAccepted,
  error,
  setError,
  close,
}: ReviewProps) {
  const { t } = useI18n();
  const [expectedSnapshot] = useState(gate.snapshot);
  const changed = expectedSnapshot !== gate.snapshot;
  const allowed = gate.allowed && !changed;
  const canSubmit =
    allowed && confirmed && (!completing || (allAccepted && (!pendingSteps || acceptSteps)));
  function submit() {
    if (!canSubmit) return;
    const next = ctx.run(
      completing ? 'COMPLETE_TASK' : 'SUBMIT_TASK_REVIEW',
      { expectedSnapshot, ...(completing ? { criterionIds: accepted, acceptSteps } : {}) },
      completing ? '任务验收通过，已完成' : '任务已提交评审',
    );
    if (next) close();
    else setError('任务或材料已发生变化，请重新核对流转条件。');
  }
  return (
    <Modal
      title={t(
        completing ? '任务级验收' : ctx.task.status === 'todo' ? '开始并提交评审' : '提交任务评审',
      )}
      close={close}
      wide
    >
      <div className="modal-body task-flow-review">
        <p className="footnote">
          {t(
            completing
              ? '以下是本次提交的冻结依据。逐项确认整件任务的必要验收条件。'
              : '提交将固定本轮目标、验收条件与产物版本。',
          )}
        </p>
        <h3>{t('本次评审目标')}</h3>
        <Markdown body={frozenGoal} />
        <h3>{t('必要验收条件')}</h3>
        <div className="task-review-criteria">
          {frozenCriteria.map((criterion) =>
            completing ? (
              <label className="move-confirm" key={criterion.id}>
                <input
                  type="checkbox"
                  name={criterion.id}
                  checked={accepted.includes(criterion.id)}
                  onChange={(event) =>
                    setAccepted(
                      event.target.checked
                        ? [...accepted, criterion.id]
                        : accepted.filter((id) => id !== criterion.id),
                    )
                  }
                />
                <span>{criterion.text}</span>
              </label>
            ) : (
              <p key={criterion.id}>{criterion.text}</p>
            ),
          )}
        </div>
        <h3>{t('固定产物版本')}</h3>
        {frozenArtifacts.map((doc) => (
          <details className="frozen-artifact" key={`${doc.id}:${doc.version}`}>
            <summary>
              {doc.title} · V{doc.version}
              <span>{t(artifactOutcomeLabel(doc))}</span>
            </summary>
            <SourceBadge model={ctx.model} entity={doc} open={undefined} interactive={false} />
            <Markdown body={doc.body || ''} />
          </details>
        ))}
        {Boolean(gate.requiredRelations?.length) && (
          <section className="task-flow-section">
            <h3>{t('relation.reviewResults')}</h3>
            {gate.requiredRelations?.map((binding) => (
              <div className="task-required-result" key={binding.relationId}>
                <strong>{binding.title}</strong>
                <small>
                  {binding.completionId
                    ? t('relation.resultIdentity', {
                        taskId: binding.taskId,
                        scope: binding.scopeRevision ?? '—',
                        completion: binding.completionId,
                      })
                    : binding.taskId}
                </small>
                <span className={binding.valid ? 'check-passed' : 'check-missing'}>
                  {t(
                    binding.valid
                      ? 'relation.resultValid'
                      : binding.completionId
                        ? 'relation.resultInvalid'
                        : 'relation.noAcceptedResult',
                  )}
                </span>
              </div>
            ))}
          </section>
        )}
        <div className="move-checks">
          {gate.checks.map((check) => (
            <div key={check.id} className={check.passed ? 'check-passed' : 'check-missing'}>
              {check.passed ? <CheckCircle size={17} /> : <WarningCircle size={17} />}
              <span>{t(check.label)}</span>
            </div>
          ))}
        </div>
        {completing && pendingSteps && (
          <label className="move-confirm">
            <input
              type="checkbox"
              checked={acceptSteps}
              onChange={(event) => setAcceptSteps(event.target.checked)}
            />
            <span>
              {t('同时确认已完成工作的待确认内部步骤')}
              <small>{t('仅合并人工确认，不能代替尚未完成的必要工作。')}</small>
            </span>
          </label>
        )}
        {allowed && (
          <label className="move-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              {t(
                completing
                  ? '我已核对整件任务的范围、真实结果与全部必要交付，确认通过。'
                  : ctx.task.status === 'todo'
                    ? '我明确开始处理，并提交以上范围与成果供任务级评审。'
                    : '我确认必要工作已完成，提交以上范围与成果供任务级评审。',
              )}
            </span>
          </label>
        )}
        {!allowed && (
          <p className="scope-note">
            {t(
              changed
                ? '依据已变化，请关闭后重新核对本次评审。'
                : '卡片保持原位。补齐条件后，再提交这次流转。',
            )}
          </p>
        )}
        {error && (
          <p className="scope-note" role="alert">
            {t(error)}
          </p>
        )}
      </div>
      <footer className="modal-actions">
        <button type="button" className="quiet" onClick={close}>
          {t('取消')}
        </button>
        <button type="button" className="primary" disabled={!canSubmit} onClick={submit}>
          {t(completing ? '确认全部条件并完成' : '确认提交评审')}
        </button>
      </footer>
    </Modal>
  );
}
