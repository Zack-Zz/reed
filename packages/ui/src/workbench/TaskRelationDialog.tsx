import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from './ui.jsx';
import { Select } from './Select.jsx';
import { useI18n } from './i18n.jsx';
import { useWorkbenchRuntime } from './runtime-context';
import type { RelationKind, RelationsContext, RelationsModel } from './relations-layout';

export function TaskRelationDialog({ ctx }: { ctx: RelationsContext }) {
  if (!ctx.modal || !['relation-create', 'relation-link'].includes(ctx.modal.type)) return null;
  return (
    <RelationForm
      key={`${ctx.modal.taskId}:${ctx.modal.type}:${ctx.modal.relationKind}`}
      ctx={ctx}
    />
  );
}
function RelationForm({ ctx }: { ctx: RelationsContext }) {
  const { t } = useI18n();
  const { modal, model } = ctx;
  const source = model.tasks.find((task) => task.id === modal?.taskId);
  const creating = modal?.type === 'relation-create';
  const [kind, setKind] = useState<RelationKind>(
    creating && modal?.relationKind === 'dependency' ? 'child' : modal?.relationKind || 'child',
  );
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('uncategorized');
  const [project, setProject] = useState(source?.project || '');
  const [targetTaskId, setTargetTaskId] = useState('');
  const [reason, setReason] = useState('');
  const [required, setRequired] = useState(modal?.required === true && kind !== 'related');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const { getTaskTypes } = useWorkbenchRuntime().services as {
    getTaskTypes: (model: unknown) => { id: string; label: string; builtin: boolean }[];
  };
  const taskTypes = getTaskTypes(model);
  const close = () => ctx.setModal(null);
  const scopeChange = required && kind !== 'related';
  const changeKind = (nextKind: RelationKind) => {
    setKind(nextKind);
    setRequired(false);
    setConfirmed(false);
    setError('');
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !source) return;
    if (creating && !title.trim()) {
      setError('relation.invalidTitle');
      return;
    }
    if (!creating && !targetTaskId) {
      setError('relation.invalidTarget');
      return;
    }
    if (scopeChange && !confirmed) {
      setError('relation.confirmRequired');
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      let failed = false;
      const next = ctx.act?.(
        {
          type: creating ? 'CREATE_RELATED_TASK' : 'LINK_TASK',
          taskId: source.id,
          relationKind: kind,
          required: scopeChange,
          confirmScopeChange: scopeChange && confirmed,
          ...(creating
            ? { title: title.trim(), taskType, project: project.trim() }
            : { targetTaskId, reason: reason.trim() }),
        },
        undefined,
        (message) => {
          failed = true;
          setError(message);
        },
      ) as RelationsModel | null;
      if (failed || !next) {
        if (!failed) setError('relation.saveFailed');
        return;
      }
      const created = creating ? next.tasks.at(-1) : null;
      if (creating && !created) {
        setError('relation.saveFailed');
        return;
      }
      close();
      if (created) ctx.openTask(created.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'relation.saveFailed');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return (
    <Modal
      title={t(
        creating
          ? kind === 'related'
            ? 'relation.addRelated'
            : 'relation.addChild'
          : 'relation.linkExisting',
      )}
      close={close}
    >
      {!source ? (
        <div className="modal-body">
          <p role="alert">{t('relation.missingTask')}</p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="modal-body relation-form">
            <div className="relation-source">
              <span>{t('relation.fromTask')}</span>
              <strong>{source.title}</strong>
              <small className="mono">{source.id}</small>
            </div>
            <label className="field">
              {t('relation.kind')}
              <Select
                aria-label={t('relation.kind')}
                value={kind}
                onChange={(event: { target: { value: string } }) =>
                  changeKind(event.target.value as RelationKind)
                }
              >
                <option value="child">{t('relation.child')}</option>
                <option value="related">{t('relation.related')}</option>
                {!creating && <option value="dependency">{t('relation.dependency')}</option>}
              </Select>
            </label>
            <p className="footnote relation-kind-explainer">
              {t(
                kind === 'dependency'
                  ? required
                    ? 'relation.requiredDependencyDescription'
                    : 'relation.optionalDependencyDescription'
                  : `relation.${kind}Description`,
              )}
            </p>
            {creating ? (
              <>
                <label className="field">
                  {t('relation.titleField')}
                  <input
                    autoFocus
                    name="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t('relation.titlePlaceholder')}
                    required
                  />
                </label>
                <div className="relation-form-columns">
                  <label className="field">
                    {t('relation.typeField')}
                    <Select
                      aria-label={t('relation.typeField')}
                      value={taskType}
                      onChange={(event: { target: { value: string } }) =>
                        setTaskType(event.target.value)
                      }
                    >
                      {taskTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.builtin ? t(type.label) : type.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="field">
                    {t('relation.projectField')}
                    <input
                      name="project"
                      value={project}
                      onChange={(event) => setProject(event.target.value)}
                      placeholder={t('relation.projectPlaceholder')}
                    />
                  </label>
                </div>
                <p className="footnote">{t('relation.createNote')}</p>
              </>
            ) : (
              <>
                <label className="field">
                  {t('relation.target')}
                  <Select
                    aria-label={t('relation.target')}
                    value={targetTaskId}
                    onChange={(event: { target: { value: string } }) =>
                      setTargetTaskId(event.target.value)
                    }
                  >
                    <option value="">{t('relation.chooseTarget')}</option>
                    {model.tasks
                      .filter((task) => task.id !== source.id)
                      .map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.id} · {task.title}
                        </option>
                      ))}
                  </Select>
                </label>
                <label className="field">
                  {t('relation.reason')}
                  <textarea
                    name="reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t('relation.reasonPlaceholder')}
                    rows={2}
                  />
                </label>
              </>
            )}
            {kind !== 'related' && (
              <label className="relation-check">
                <input
                  type="checkbox"
                  name="required"
                  checked={required}
                  onChange={(event) => {
                    setRequired(event.target.checked);
                    setConfirmed(false);
                  }}
                />
                <span>
                  {t(kind === 'child' ? 'relation.requiredChild' : 'relation.requiredDependency')}
                </span>
              </label>
            )}
            {scopeChange && (
              <div className="relation-scope-warning">
                <p>{t(kind === 'child' ? 'relation.scopeChild' : 'relation.scopeDependency')}</p>
                <label className="relation-check">
                  <input
                    type="checkbox"
                    name="confirmScopeChange"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    required
                  />
                  <span>
                    {t(kind === 'child' ? 'relation.confirmChild' : 'relation.confirmDependency')}
                  </span>
                </label>
              </div>
            )}
            <p className="footnote">{t('relation.noAutomation')}</p>
            {error && (
              <p className="relation-error" role="alert">
                {t(error)}
              </p>
            )}
          </div>
          <footer className="modal-actions">
            <button className="quiet" type="button" onClick={close}>
              {t('relation.cancel')}
            </button>
            <button
              className="primary"
              type="submit"
              disabled={
                saving || (creating ? !title.trim() : !targetTaskId) || (scopeChange && !confirmed)
              }
            >
              {t(creating ? 'relation.create' : 'relation.link')}
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
