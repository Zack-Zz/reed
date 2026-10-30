import { useRef, useState } from 'react';
import { useI18n } from './i18n.jsx';
import { Modal } from './ui.jsx';
import { useWorkbenchRuntime } from './runtime-context';
import { WorkflowPicker } from './WorkflowPicker';
import type { WorkflowSelection } from './WorkflowPicker';
import type { TemplateVersion } from './configuration-types';
interface Task {
  id: string;
  status: string;
  taskType?: string;
  goal?: string;
  scopeRevision?: number;
  criteria?: { id: string; text: string }[];
  workflow?: { templateId: string; version?: number; name: string; stepLabels: string[] } | null;
  docs: {
    id: string;
    title: string;
    body?: string;
    version?: number;
    stale?: boolean;
    supersededWorkflow?: boolean;
  }[];
}
interface Context {
  task: Task;
  model: unknown;
  setModal: (modal: unknown) => void;
  run: (type: string, fields?: Record<string, unknown>, message?: string) => unknown;
}
export function WorkflowChangeDialog({ ctx }: { ctx: Context }) {
  const { t } = useI18n();
  const { task } = ctx;
  const services = useWorkbenchRuntime().services as {
    getWorkflowChange: (
      model: unknown,
      task: Task,
    ) => { snapshot: string; allowed: boolean; carriedCriteria: { id: string; text: string }[] };
    resolveTemplate: (model: unknown, id: string, version?: number) => TemplateVersion;
  };
  const gate = services.getWorkflowChange(ctx.model, task);
  const [expectedSnapshot] = useState(gate.snapshot),
    [selection, setSelection] = useState<WorkflowSelection>({
      templateId: task.workflow?.templateId || null,
      templateVersion: task.workflow?.version || 1,
    });
  const [confirmed, setConfirmed] = useState(false),
    [reason, setReason] = useState(''),
    [reuse, setReuse] = useState<string[]>([]),
    [error, setError] = useState('');
  const submitting = useRef(false);
  const changing = Boolean(task.workflow || task.docs.length || task.scopeRevision);
  const changed = gate.snapshot !== expectedSnapshot;
  const same =
    (task.workflow?.templateId || null) === selection.templateId &&
    (task.workflow?.version || 1) === (selection.templateVersion || 1);
  const permitted =
    gate.allowed && !changed && !same && (!changing || (confirmed && reason.trim()));
  const close = () => ctx.setModal(null);
  function submit() {
    if (!permitted || submitting.current) return;
    submitting.current = true;
    try {
      const next = ctx.run(
        'SET_TASK_WORKFLOW',
        {
          ...selection,
          expectedSnapshot,
          confirmChange: confirmed,
          reason,
          reuseDocumentIds: reuse,
        },
        'task.workflow-saved',
      );
      if (next) close();
      else setError('selection.changed');
    } finally {
      submitting.current = false;
    }
  }
  return (
    <Modal title={t('选择内部流程')} close={close} wide>
      <div className="modal-body workflow-change-form">
        <p className="footnote">{t('selection.changeHint')}</p>
        {task.workflow && (
          <p className="scope-note">
            {t('selection.currentVersion', {
              name: task.workflow.name,
              version: task.workflow.version || 1,
            })}
          </p>
        )}
        <WorkflowPicker
          model={ctx.model}
          taskType={task.taskType}
          value={selection}
          onChange={(next) => {
            setSelection(next);
            setConfirmed(false);
            setError('');
          }}
        />
        {changing && (
          <>
            <section className="workflow-impact">
              <h3>{t('selection.impact')}</h3>
              <p>{t('selection.resetHint')}</p>
              <p>{t('selection.carryHint')}</p>
              {gate.carriedCriteria.length ? (
                <ul>
                  {gate.carriedCriteria.map((c) => (
                    <li key={c.id}>{c.text}</li>
                  ))}
                </ul>
              ) : (
                <p className="footnote">{t('selection.noCarry')}</p>
              )}
              <p className="footnote">{t('selection.taskAcceptance')}</p>
            </section>
            {task.docs.some((d) => !d.supersededWorkflow && !d.stale) && (
              <section className="workflow-impact">
                <h3>{t('selection.reuse')}</h3>
                <p className="footnote">{t('selection.reuseHint')}</p>
                {task.docs
                  .filter((d) => !d.supersededWorkflow && !d.stale)
                  .map((d) => (
                    <div key={d.id} className="workflow-reuse">
                      <details>
                        <summary>
                          {d.title} · V{d.version}
                        </summary>
                        <p className="workflow-original">{d.body}</p>
                      </details>
                      <label className="move-confirm">
                        <input
                          type="checkbox"
                          checked={reuse.includes(d.id)}
                          onChange={(e) =>
                            setReuse(
                              e.target.checked
                                ? [...reuse, d.id]
                                : reuse.filter((id) => id !== d.id),
                            )
                          }
                        />
                        {t('selection.reuseConfirm')}
                      </label>
                    </div>
                  ))}
              </section>
            )}
            <label className="field">
              {t('selection.reason')}
              <textarea
                rows={3}
                name="workflowReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label className="move-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              {t('selection.confirmImpact')}
            </label>
          </>
        )}
        {!gate.allowed && (
          <p role="alert" className="scope-note">
            {t('selection.stateBlocked')}
          </p>
        )}
        {changed && (
          <p role="alert" className="scope-note">
            {t('selection.changed')}
          </p>
        )}
        {error && (
          <p role="alert" className="scope-note">
            {t(error)}
          </p>
        )}
      </div>
      <footer className="modal-actions">
        <button type="button" className="quiet" onClick={close}>
          {t('取消')}
        </button>
        <button type="button" className="primary" disabled={!permitted} onClick={submit}>
          {t('采用流程选择')}
        </button>
      </footer>
    </Modal>
  );
}
