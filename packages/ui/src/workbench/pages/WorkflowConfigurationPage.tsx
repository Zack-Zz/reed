import { templateContentKey } from '../../template-definition';
import { Select } from '../Select.jsx';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CaretLeft,
  Copy,
  Plus,
  X,
  CheckSquare,
  FileText,
  Code,
  Flask,
  Lightbulb,
  SealCheck,
  Tag,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n.jsx';
import type {
  ConfigurationModel,
  TaskTypeDefinition,
  TemplateDefinition,
  TemplateVersion,
  WorkflowConfigurationPageProps,
  WorkflowStep,
  WorkflowTemplate,
} from '../configuration-types';

const blankDefinition = (): TemplateDefinition => ({
  name: '',
  description: '',
  steps: [],
  suggestedCriteria: [],
});
const cloneDefinition = (definition: TemplateDefinition): TemplateDefinition => ({
  ...definition,
  steps: definition.steps.map((step) => ({
    ...step,
    outputs: [...step.outputs],
    checks: [...step.checks],
  })),
  suggestedCriteria: [...definition.suggestedCriteria],
});
const definitionOf = (template: WorkflowTemplate) =>
  template.draft || template.versions.at(-1) || blankDefinition();
const lines = (value: string) => value.split('\n');
const cleanLines = (values: string[]) => values.map((line) => line.trim()).filter(Boolean);
const cleanDefinition = (value: TemplateDefinition): TemplateDefinition => ({
  ...value,
  name: value.name.trim(),
  description: value.description.trim(),
  suggestedCriteria: cleanLines(value.suggestedCriteria),
  steps: value.steps.map((step) => ({
    ...step,
    name: step.name.trim(),
    goal: step.goal.trim(),
    instructions: step.instructions.trim(),
    outputs: cleanLines(step.outputs),
    checks: cleanLines(step.checks),
  })),
});
/** Keep keyboard focus within the active in-page overlay, restoring it on close. */
function ConfigurationOverlay({ children, close }: { children: ReactNode; close: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement;
    const element = root.current;
    const focusable = () =>
      Array.from(
        element?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const items = focusable(),
        first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    element?.addEventListener('keydown', key);
    return () => {
      element?.removeEventListener('keydown', key);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className="configuration-overlay"
      ref={root}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {children}
    </div>
  );
}
function Label({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const { t } = useI18n();
  return (
    <label className="field configuration-field">
      <span>{t(label)}</span>
      {children}
      {hint && <small>{t(hint)}</small>}
    </label>
  );
}
interface TemplateFieldsProps {
  definition: TemplateDefinition;
  onChange: (definition: TemplateDefinition) => void;
  readOnly?: boolean;
  builtin?: boolean;
}
/** Shared editable/preview presentation; values never import mock rules. */
export function ConfigurationTemplateFields({
  definition,
  onChange,
  readOnly = false,
  builtin = false,
}: TemplateFieldsProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(definition.steps[0]?.id || '');
  const counter = useRef(0);
  const active = definition.steps.find((step) => step.id === selected) || definition.steps[0];
  const text = (value: string) => (builtin ? t(value) : value);
  const patch = (value: Partial<TemplateDefinition>) => onChange({ ...definition, ...value });
  const patchStep = (value: Partial<WorkflowStep>) => {
    if (active)
      patch({
        steps: definition.steps.map((step) =>
          step.id === active.id ? { ...step, ...value } : step,
        ),
      });
  };
  function addStep() {
    let id: string;
    do {
      id = `custom-step-${++counter.current}`;
    } while (definition.steps.some((step) => step.id === id));
    patch({
      steps: [
        ...definition.steps,
        {
          id,
          name: t('config.newStep'),
          goal: '',
          instructions: '',
          outputs: [],
          checks: [],
          required: true,
          mode: 'either',
          requiresCode: false,
        },
      ],
    });
    setSelected(id);
  }
  function moveStep(direction: number) {
    if (!active) return;
    const index = definition.steps.findIndex((step) => step.id === active.id);
    const target = index + direction;
    if (target < 0 || target >= definition.steps.length) return;
    const steps = [...definition.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    patch({ steps });
  }
  return (
    <div className="configuration-template-fields">
      <section className="configuration-card configuration-basic">
        <h2>{t('config.basic')}</h2>
        <div className="configuration-form-grid">
          <Label label="config.name">
            <input
              required
              readOnly={readOnly}
              value={text(definition.name)}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </Label>
          <Label label="config.description">
            <textarea
              readOnly={readOnly}
              rows={2}
              value={text(definition.description)}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </Label>
        </div>
      </section>
      <section className="configuration-step-workspace" aria-label={t('config.steps')}>
        <aside className="configuration-step-list">
          <header>
            <h2>{t('config.steps')}</h2>
            {!readOnly && (
              <button type="button" onClick={addStep}>
                <Plus size={14} />
                {t('config.addStep')}
              </button>
            )}
          </header>
          <ol>
            {definition.steps.map((step, index) => (
              <li key={step.id}>
                <button
                  type="button"
                  className={active?.id === step.id ? 'selected' : ''}
                  aria-current={active?.id === step.id ? 'step' : undefined}
                  onClick={() => setSelected(step.id)}
                >
                  <span className="configuration-step-number">{index + 1}</span>
                  <span>
                    {text(step.name) || t('config.newStep')}
                    <small>{t(step.required ? 'config.required' : 'config.optional')}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {!definition.steps.length && <p className="configuration-empty">{t('config.noSteps')}</p>}
        </aside>
        <section className="configuration-step-editor" aria-label={t('config.stepSettings')}>
          {active ? (
            <>
              <header>
                <h2>{t('config.stepSettings')}</h2>
                {!readOnly && (
                  <div className="configuration-actions">
                    <button
                      type="button"
                      title={t('config.moveUp')}
                      aria-label={t('config.moveUp')}
                      disabled={definition.steps[0].id === active.id}
                      onClick={() => moveStep(-1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      title={t('config.moveDown')}
                      aria-label={t('config.moveDown')}
                      disabled={definition.steps.at(-1)?.id === active.id}
                      onClick={() => moveStep(1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="configuration-danger"
                      onClick={() => {
                        const steps = definition.steps.filter((step) => step.id !== active.id);
                        patch({ steps });
                        setSelected(steps[0]?.id || '');
                      }}
                    >
                      {t('config.delete')}
                    </button>
                  </div>
                )}
              </header>
              <div className="configuration-form-grid">
                <Label label="config.stepName">
                  <input
                    required
                    readOnly={readOnly}
                    value={text(active.name)}
                    onChange={(event) => patchStep({ name: event.target.value })}
                  />
                </Label>
                <Label label="config.goal">
                  <textarea
                    required
                    readOnly={readOnly}
                    rows={2}
                    value={text(active.goal)}
                    onChange={(event) => patchStep({ goal: event.target.value })}
                  />
                </Label>
                <Label label="config.instructions">
                  <textarea
                    readOnly={readOnly}
                    rows={3}
                    value={text(active.instructions)}
                    onChange={(event) => patchStep({ instructions: event.target.value })}
                  />
                </Label>
                <div className="configuration-two-columns">
                  <Label label="config.outputs" hint="config.lineHint">
                    <textarea
                      readOnly={readOnly}
                      rows={4}
                      value={active.outputs.map(text).join('\n')}
                      onChange={(event) => patchStep({ outputs: lines(event.target.value) })}
                    />
                  </Label>
                  <Label label="config.checks" hint="config.lineHint">
                    <textarea
                      readOnly={readOnly}
                      rows={4}
                      value={active.checks.map(text).join('\n')}
                      onChange={(event) => patchStep({ checks: lines(event.target.value) })}
                    />
                  </Label>
                </div>
                <div className="configuration-two-columns">
                  <Label label="config.required">
                    <Select
                      disabled={readOnly}
                      value={String(active.required)}
                      aria-label={t('config.required')}
                      onChange={(event: { target: { value: string } }) =>
                        patchStep({ required: event.target.value === 'true' })
                      }
                    >
                      <option value="true">{t('config.required')}</option>
                      <option value="false">{t('config.optional')}</option>
                    </Select>
                  </Label>
                  <Label label="config.mode">
                    <Select
                      disabled={readOnly}
                      value={active.mode}
                      aria-label={t('config.mode')}
                      onChange={(event: { target: { value: string } }) =>
                        patchStep({ mode: event.target.value as WorkflowStep['mode'] })
                      }
                    >
                      {(['manual', 'agent', 'either'] as const).map((mode) => (
                        <option key={mode} value={mode}>
                          {t(`config.${mode}`)}
                        </option>
                      ))}
                    </Select>
                  </Label>
                </div>
                <label className="configuration-checkbox">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={active.requiresCode}
                    onChange={(event) => patchStep({ requiresCode: event.target.checked })}
                  />
                  {t('config.requiresCode')}
                </label>
              </div>
            </>
          ) : (
            <p className="configuration-empty">{t('config.noSteps')}</p>
          )}
        </section>
      </section>
      <section className="configuration-card">
        <Label label="config.criteria" hint="config.criteriaHint">
          <textarea
            readOnly={readOnly}
            rows={4}
            placeholder={t('config.lineHint')}
            value={definition.suggestedCriteria.map(text).join('\n')}
            onChange={(event) => patch({ suggestedCriteria: lines(event.target.value) })}
          />
        </Label>
      </section>
    </div>
  );
}
interface TemplateEditing {
  id?: string;
  revision?: number;
  builtin: boolean;
  definition: TemplateDefinition;
  baseline: string;
  previewVersion?: number;
}
type TypeEditing = {
  id?: string;
  builtin: boolean;
  name: string;
  description: string;
  icon: string;
  recommendedTemplateIds: string[];
  baseline: string;
};
export function WorkflowConfigurationPage({
  model,
  act,
  close,
  initialTab = 'types',
  onDirtyChange,
}: WorkflowConfigurationPageProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState(initialTab);
  const [typeEditing, setTypeEditing] = useState<TypeEditing | null>(null);
  const [editing, setEditing] = useState<TemplateEditing | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const [deleting, setDeleting] = useState<{ type: 'type' | 'template'; id: string } | null>(null);
  const typeValue = typeEditing && {
    name: typeEditing.name,
    description: typeEditing.description,
    icon: typeEditing.icon,
    recommendedTemplateIds: typeEditing.recommendedTemplateIds,
  };
  const dirty = Boolean(
    (editing &&
      !editing.builtin &&
      !editing.previewVersion &&
      JSON.stringify(editing.definition) !== editing.baseline) ||
    (typeEditing && JSON.stringify(typeValue) !== typeEditing.baseline),
  );
  const dirtyCallback = useRef(onDirtyChange);
  dirtyCallback.current = onDirtyChange;
  useEffect(() => {
    dirtyCallback.current?.(dirty);
  }, [dirty]);
  useEffect(
    () => () => {
      dirtyCallback.current?.(false);
    },
    [],
  );
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    globalThis.addEventListener('beforeunload', beforeUnload);
    return () => globalThis.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  const requestLeave = (next: () => void) => {
    if (busy) return;
    if (dirty) setLeave(() => next);
    else next();
  };
  const usage = (id: string, kind: 'type' | 'template') =>
    model.tasks.filter((task) =>
      kind === 'type'
        ? task.taskType === id ||
          task.typeHistory?.includes(id) ||
          task.reviews?.some((review) => review.taskType === id)
        : [
            task.workflow,
            ...(task.workflowHistory || []).map((history) => history.workflow),
            ...(task.scopeHistory || []).map((history) => history.workflow),
          ].some((workflow) => workflow?.templateId === id),
    ).length;
  const nameOf = (template: WorkflowTemplate) =>
    template.builtin ? t(definitionOf(template).name) : definitionOf(template).name;
  function openType(type?: TaskTypeDefinition) {
    const value = {
      name: type?.name || '',
      description: type?.description || '',
      icon: type?.icon || '',
      recommendedTemplateIds: [...(type?.recommendedTemplateIds || [])],
    };
    setTypeEditing({
      ...value,
      id: type?.id,
      builtin: type?.builtin || false,
      baseline: JSON.stringify(value),
    });
    setError('');
    setNotice('');
  }
  function openTemplate(template?: WorkflowTemplate, version?: TemplateVersion) {
    const definition = cloneDefinition(
      version || (template ? definitionOf(template) : blankDefinition()),
    );
    setEditing({
      id: template?.id,
      revision: template?.revision,
      builtin: template?.builtin || false,
      definition,
      baseline: JSON.stringify(definition),
      previewVersion: version?.version,
    });
    setHistory(null);
    setError('');
    setNotice('');
  }
  async function command(
    value: { type: string; [key: string]: unknown },
    message?: string,
    after?: (next: ConfigurationModel) => void,
  ) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    let failure = '';
    try {
      const result = await Promise.resolve(
        act(value, undefined, (message) => {
          failure = message;
          setError(message);
        }),
      );
      if (!result || failure) {
        if (!failure) setError('config.operationFailed');
        return;
      }
      if (message) setNotice(message);
      after?.(result as ConfigurationModel);
    } catch {
      setError('config.operationFailed');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function saveType() {
    if (!typeEditing) return;
    if (!typeEditing.name.trim()) {
      setError('config.nameRequired');
      return;
    }
    void command(
      {
        type: 'SAVE_TASK_TYPE',
        definition: { id: typeEditing.id, ...typeValue, name: typeEditing.name.trim() },
      },
      'config.typeSaved',
      () => setTypeEditing(null),
    );
  }
  function saveTemplate(publish: boolean) {
    if (!editing || editing.builtin || editing.previewVersion) return;
    const definition = cleanDefinition(editing.definition);
    if (!definition.name) {
      setError('config.nameRequired');
      return;
    }
    if (publish && !definition.steps.length) {
      setError('config.stepsRequired');
      return;
    }
    if (publish && definition.steps.some((step) => !step.name)) {
      setError('config.stepNameRequired');
      return;
    }
    if (publish && definition.steps.some((step) => !step.goal)) {
      setError('config.stepGoalRequired');
      return;
    }
    if (publish && definition.steps.some((step) => step.required && !step.outputs.length)) {
      setError('config.requiredOutputs');
      return;
    }
    void command(
      {
        type: 'SAVE_WORKFLOW_TEMPLATE',
        templateId: editing.id,
        definition,
        publish,
        expectedRevision: editing.revision ?? 0,
      },
      publish ? 'config.templatePublished' : 'config.templateSaved',
      (next) => {
        const saved = editing.id
          ? next.configuration.templates.find((template) => template.id === editing.id)
          : next.configuration.templates.at(-1);
        if (saved) {
          const value = cloneDefinition(definitionOf(saved));
          setEditing({
            id: saved.id,
            revision: saved.revision,
            builtin: saved.builtin,
            definition: value,
            baseline: JSON.stringify(value),
          });
        } else setError('config.operationFailed');
      },
    );
  }
  function copyTemplate(template: WorkflowTemplate, version?: number) {
    void command(
      { type: 'COPY_WORKFLOW_TEMPLATE', templateId: template.id, ...(version ? { version } : {}) },
      'config.copied',
      (next) => {
        const copied = next.configuration.templates.at(-1);
        if (copied && copied.id !== template.id) {
          openTemplate(copied);
          setNotice('config.copied');
        }
      },
    );
  }
  const editingTemplate = editing?.id
    ? model.configuration.templates.find((template) => template.id === editing.id)
    : undefined;
  const unchangedPublished = Boolean(
    editing &&
    editingTemplate?.versions.length &&
    templateContentKey(editing.definition) === templateContentKey(editingTemplate.versions.at(-1)!),
  );
  return (
    <section className="page configuration-page">
      <header className="page-heading configuration-heading">
        <div>
          <button
            className="text-link configuration-back"
            disabled={busy}
            onClick={() =>
              requestLeave(
                editing
                  ? () => {
                      setEditing(null);
                      setError('');
                      setNotice('');
                    }
                  : close,
              )
            }
          >
            <CaretLeft size={14} />
            {t(editing ? 'config.backTemplates' : 'config.back')}
          </button>
          <h1>
            {editing
              ? editing.previewVersion
                ? t('config.preview')
                : editing.builtin
                  ? t('config.view')
                  : editing.id
                    ? t('config.editTemplate')
                    : t('config.newTemplate')
              : t('config.title')}
          </h1>
          <p>{t(editing ? 'config.templateHint' : 'config.subtitle')}</p>
        </div>
        {!editing && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => (tab === 'types' ? openType() : openTemplate())}
          >
            <Plus size={16} />
            {t(tab === 'types' ? 'config.newType' : 'config.newTemplate')}
          </button>
        )}
      </header>
      {error && (
        <p role="alert" className="configuration-error">
          {t(error)}
        </p>
      )}
      {notice && (
        <p role="status" className="configuration-notice">
          {t(notice)}
        </p>
      )}
      {editing ? (
        <>
          <div className="configuration-editor-toolbar">
            <span className="configuration-badges">
              <span className="configuration-badge">
                {t(editing.builtin ? 'config.builtin' : 'config.custom')}
              </span>
              <span>
                {editing.previewVersion
                  ? t('config.version', { version: editing.previewVersion })
                  : !dirty && editingTemplate?.versions.length && !editingTemplate.draft
                    ? t('config.currentVersion', {
                        version: editingTemplate.versions.at(-1)?.version,
                      })
                    : t('config.draft')}
              </span>
            </span>
            <div className="configuration-actions">
              {editingTemplate && (
                <button disabled={busy} onClick={() => setHistory(editingTemplate.id)}>
                  {t('config.history')}
                </button>
              )}
              {(editing.builtin || editing.previewVersion) && editingTemplate ? (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    requestLeave(() => copyTemplate(editingTemplate, editing.previewVersion))
                  }
                >
                  <Copy size={14} />
                  {t('config.copy')}
                </button>
              ) : (
                <>
                  <button disabled={busy} onClick={() => saveTemplate(false)}>
                    {t(busy ? 'config.saving' : 'config.saveDraft')}
                  </button>
                  <button
                    className="primary"
                    disabled={busy || unchangedPublished}
                    onClick={() => saveTemplate(true)}
                  >
                    {t('config.publish')}
                  </button>
                </>
              )}
            </div>
          </div>
          {unchangedPublished && !editing.builtin && (
            <p className="configuration-hint">{t('config.template-no-changes')}</p>
          )}
          {editing.builtin && <p className="configuration-hint">{t('config.builtinHint')}</p>}
          <fieldset className="configuration-editor-fieldset" disabled={busy}>
            <ConfigurationTemplateFields
              key={`${editing.id || 'new'}:${editing.previewVersion || 'draft'}`}
              definition={editing.definition}
              readOnly={editing.builtin || Boolean(editing.previewVersion)}
              builtin={editing.builtin}
              onChange={(definition) => setEditing({ ...editing, definition })}
            />
          </fieldset>
        </>
      ) : (
        <>
          <div role="tablist" aria-label={t('config.title')} className="configuration-tabs">
            {(['types', 'templates'] as const).map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                id={`configuration-tab-${value}`}
                aria-controls={`configuration-panel-${value}`}
                onClick={() => requestLeave(() => setTab(value))}
              >
                {t(`config.${value}`)}
                <span>
                  {value === 'types'
                    ? model.configuration.taskTypes.length
                    : model.configuration.templates.length}
                </span>
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`configuration-panel-${tab}`}
            aria-labelledby={`configuration-tab-${tab}`}
          >
            <p className="configuration-hint">
              {t(tab === 'types' ? 'config.typeHint' : 'config.templateHint')}
            </p>
            <div className="configuration-list">
              {tab === 'types'
                ? [...model.configuration.taskTypes]
                    .sort((a, b) => a.order - b.order)
                    .map((type, index, types) => {
                      const count = usage(type.id, 'type');
                      return (
                        <article className="configuration-row" key={type.id}>
                          <div className="configuration-row-body">
                            <div className="configuration-row-title">
                              <span className="configuration-symbol">
                                {(() => {
                                  const Icon = (
                                    {
                                      task: CheckSquare,
                                      requirement: Lightbulb,
                                      development: Code,
                                      test: Flask,
                                      verification: SealCheck,
                                      documentation: FileText,
                                    } as Record<string, typeof Tag>
                                  )[type.icon];
                                  return Icon ? (
                                    <Icon size={19} />
                                  ) : type.icon && /[^\x00-\x7F]/.test(type.icon) ? (
                                    type.icon
                                  ) : (
                                    <Tag size={19} />
                                  );
                                })()}
                              </span>
                              <h2>{type.builtin ? t(type.name) : type.name}</h2>
                              <span className="configuration-badge">
                                {t(type.builtin ? 'config.builtin' : 'config.custom')}
                              </span>
                              <span
                                className={`configuration-state ${type.enabled ? '' : 'muted'}`}
                              >
                                {t(type.enabled ? 'config.enabled' : 'config.disabled')}
                              </span>
                            </div>
                            <p>
                              {(type.builtin ? t(type.description) : type.description) ||
                                t('config.noDescription')}
                            </p>
                            <small>{t(count ? 'config.used' : 'config.unused', { count })}</small>
                          </div>
                          <div className="configuration-actions">
                            <button
                              disabled={busy || index === 0}
                              title={t('config.moveUp')}
                              aria-label={t('config.moveUp')}
                              onClick={() =>
                                void command({
                                  type: 'MOVE_TASK_TYPE',
                                  typeId: type.id,
                                  direction: 'up',
                                })
                              }
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              disabled={busy || index === types.length - 1}
                              title={t('config.moveDown')}
                              aria-label={t('config.moveDown')}
                              onClick={() =>
                                void command({
                                  type: 'MOVE_TASK_TYPE',
                                  typeId: type.id,
                                  direction: 'down',
                                })
                              }
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button disabled={busy} onClick={() => openType(type)}>
                              {t('config.edit')}
                            </button>
                            <button
                              disabled={busy || (type.id === 'uncategorized' && type.enabled)}
                              onClick={() =>
                                void command({
                                  type: 'SET_TASK_TYPE_ENABLED',
                                  typeId: type.id,
                                  enabled: !type.enabled,
                                })
                              }
                            >
                              {t(type.enabled ? 'config.disable' : 'config.enable')}
                            </button>
                            {!type.builtin && (
                              <button
                                className="configuration-danger"
                                disabled={busy || count > 0}
                                title={t('config.typeDeleteHint')}
                                onClick={() => setDeleting({ type: 'type', id: type.id })}
                              >
                                {t('config.delete')}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })
                : model.configuration.templates.map((template) => {
                    const definition = definitionOf(template),
                      latest = template.versions.at(-1),
                      count = usage(template.id, 'template');
                    return (
                      <article className="configuration-row" key={template.id}>
                        <div className="configuration-row-body">
                          <div className="configuration-row-title">
                            <h2>{nameOf(template) || t('config.untitled')}</h2>
                            <span className="configuration-badge">
                              {t(template.builtin ? 'config.builtin' : 'config.custom')}
                            </span>
                            <span
                              className={`configuration-state ${template.enabled ? '' : 'muted'}`}
                            >
                              {t(template.enabled ? 'config.enabled' : 'config.disabled')}
                            </span>
                          </div>
                          <p>
                            {(template.builtin
                              ? t(definition.description)
                              : definition.description) || t('config.noDescription')}
                          </p>
                          <div className="configuration-row-meta">
                            <span>
                              {latest
                                ? t('config.currentVersion', { version: latest.version })
                                : t('config.unpublished')}
                            </span>
                            {template.draft && (
                              <span className="configuration-badge">{t('config.draft')}</span>
                            )}
                            <span>{t('config.stepCount', { count: definition.steps.length })}</span>
                            <small>{t(count ? 'config.used' : 'config.unused', { count })}</small>
                          </div>
                        </div>
                        <div className="configuration-actions">
                          <button disabled={busy} onClick={() => openTemplate(template)}>
                            {t(template.builtin ? 'config.view' : 'config.editDraft')}
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => copyTemplate(template)}
                            title={t('config.copy')}
                          >
                            <Copy size={14} />
                            <span>{t('config.copy')}</span>
                          </button>
                          <button
                            disabled={busy || !template.versions.length}
                            onClick={() => setHistory(template.id)}
                          >
                            {t('config.history')}
                          </button>
                          <button
                            disabled={busy || !template.versions.length}
                            onClick={() =>
                              void command({
                                type: 'SET_WORKFLOW_TEMPLATE_ENABLED',
                                templateId: template.id,
                                enabled: !template.enabled,
                              })
                            }
                          >
                            {t(template.enabled ? 'config.disable' : 'config.enable')}
                          </button>
                          {!template.builtin && (
                            <button
                              className="configuration-danger"
                              disabled={busy || count > 0 || Boolean(template.versions.length)}
                              title={t('config.templateDeleteHint')}
                              onClick={() => setDeleting({ type: 'template', id: template.id })}
                            >
                              {t('config.delete')}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
            </div>
            {!(tab === 'types' ? model.configuration.taskTypes : model.configuration.templates)
              .length && (
              <p className="configuration-empty">
                {t(tab === 'types' ? 'config.noTypes' : 'config.noTemplates')}
              </p>
            )}
          </div>
        </>
      )}
      {typeEditing && (
        <ConfigurationOverlay close={() => requestLeave(() => setTypeEditing(null))}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t(typeEditing.id ? 'config.editType' : 'config.newType')}
            className="configuration-type-drawer"
          >
            <header>
              <h2>{t(typeEditing.id ? 'config.editType' : 'config.newType')}</h2>
              <button
                disabled={busy}
                aria-label={t('config.close')}
                onClick={() => requestLeave(() => setTypeEditing(null))}
              >
                <X size={18} />
              </button>
            </header>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveType();
              }}
            >
              <fieldset disabled={busy} className="configuration-form-grid">
                <Label label="config.name">
                  <input
                    required
                    value={typeEditing.builtin ? t(typeEditing.name) : typeEditing.name}
                    onChange={(event) =>
                      setTypeEditing({ ...typeEditing, name: event.target.value })
                    }
                  />
                </Label>
                <Label label="config.description">
                  <textarea
                    rows={3}
                    value={
                      typeEditing.builtin ? t(typeEditing.description) : typeEditing.description
                    }
                    onChange={(event) =>
                      setTypeEditing({ ...typeEditing, description: event.target.value })
                    }
                  />
                </Label>
                <Label label="config.icon">
                  <input
                    maxLength={8}
                    value={typeEditing.icon}
                    onChange={(event) =>
                      setTypeEditing({ ...typeEditing, icon: event.target.value })
                    }
                  />
                </Label>
                <div className="configuration-recommendations">
                  <h3>{t('config.recommended')}</h3>
                  {model.configuration.templates
                    .filter(
                      (template) =>
                        (template.enabled && template.versions.length) ||
                        typeEditing.recommendedTemplateIds.includes(template.id),
                    )
                    .map((template) => (
                      <label className="configuration-checkbox" key={template.id}>
                        <input
                          type="checkbox"
                          checked={typeEditing.recommendedTemplateIds.includes(template.id)}
                          onChange={(event) =>
                            setTypeEditing({
                              ...typeEditing,
                              recommendedTemplateIds: event.target.checked
                                ? [...typeEditing.recommendedTemplateIds, template.id]
                                : typeEditing.recommendedTemplateIds.filter(
                                    (id) => id !== template.id,
                                  ),
                            })
                          }
                        />
                        {nameOf(template)}
                      </label>
                    ))}
                  {!model.configuration.templates.some(
                    (template) => template.enabled && template.versions.length,
                  ) && <p>{t('config.noRecommendations')}</p>}
                </div>
              </fieldset>
              {error && (
                <p role="alert" className="configuration-error">
                  {t(error)}
                </p>
              )}
              <footer>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => requestLeave(() => setTypeEditing(null))}
                >
                  {t('config.cancel')}
                </button>
                <button className="primary" disabled={busy} type="submit">
                  {t(busy ? 'config.saving' : 'config.save')}
                </button>
              </footer>
            </form>
          </section>
        </ConfigurationOverlay>
      )}
      {history &&
        (() => {
          const template = model.configuration.templates.find(
            (template) => template.id === history,
          );
          return (
            <ConfigurationOverlay close={() => setHistory(null)}>
              <section
                className="configuration-confirm configuration-history"
                role="dialog"
                aria-modal="true"
                aria-label={t('config.history')}
              >
                <header>
                  <h2>{t('config.history')}</h2>
                  <button aria-label={t('config.close')} onClick={() => setHistory(null)}>
                    <X size={18} />
                  </button>
                </header>
                <p>{template && nameOf(template)}</p>
                {template?.versions.length ? (
                  <ul>
                    {[...template.versions].reverse().map((version) => (
                      <li key={version.version}>
                        <span>
                          {t('config.version', { version: version.version })}
                          <small>{t('config.stepCount', { count: version.steps.length })}</small>
                        </span>
                        <button onClick={() => requestLeave(() => openTemplate(template, version))}>
                          {t('config.preview')}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t('config.noHistory')}</p>
                )}
              </section>
            </ConfigurationOverlay>
          );
        })()}
      {deleting && (
        <ConfigurationOverlay
          close={() => {
            if (!busy) {
              setDeleting(null);
              setError('');
            }
          }}
        >
          <section
            className="configuration-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-label={t('config.deleteTitle')}
          >
            <h2>{t('config.deleteTitle')}</h2>
            <p>{t('config.deleteConfirm')}</p>
            <p className="configuration-hint">
              {t(deleting.type === 'type' ? 'config.typeDeleteHint' : 'config.templateDeleteHint')}
            </p>
            {error && (
              <p role="alert" className="configuration-error">
                {t(error)}
              </p>
            )}
            <footer>
              <button
                disabled={busy}
                onClick={() => {
                  setDeleting(null);
                  setError('');
                }}
              >
                {t('config.cancel')}
              </button>
              <button
                className="configuration-danger"
                disabled={busy}
                onClick={() =>
                  void command(
                    deleting.type === 'type'
                      ? { type: 'DELETE_TASK_TYPE', typeId: deleting.id }
                      : { type: 'DELETE_WORKFLOW_TEMPLATE', templateId: deleting.id },
                    undefined,
                    () => setDeleting(null),
                  )
                }
              >
                {t('config.delete')}
              </button>
            </footer>
          </section>
        </ConfigurationOverlay>
      )}
      {leave && (
        <ConfigurationOverlay close={() => setLeave(null)}>
          <section
            role="alertdialog"
            aria-modal="true"
            aria-label={t('config.leaveTitle')}
            className="configuration-confirm"
          >
            <h2>{t('config.leaveTitle')}</h2>
            <p>{t('config.leaveHint')}</p>
            <footer>
              <button onClick={() => setLeave(null)}>{t('config.keepEditing')}</button>
              <button
                className="configuration-danger"
                onClick={() => {
                  const next = leave;
                  setLeave(null);
                  next();
                }}
              >
                {t('config.discard')}
              </button>
            </footer>
          </section>
        </ConfigurationOverlay>
      )}
    </section>
  );
}
