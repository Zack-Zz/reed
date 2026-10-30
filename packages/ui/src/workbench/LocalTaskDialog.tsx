import { WorkflowPicker } from './WorkflowPicker';
import type { ConfigurationModel } from './configuration-types';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, X, CaretDown } from '@phosphor-icons/react';
import { Modal, Field } from './ui.jsx';
import { Select } from './Select.jsx';
import { useI18n } from './i18n.jsx';
import { useWorkbenchRuntime } from './runtime-context';
import type { WorkbenchCommand } from './ports';

/** Presentation fields for the current mock flow, not a Core contract. */
export interface LocalTaskReference {
  kind: 'file' | 'link';
  name: string;
  location: string;
}
export interface LocalTaskInfo {
  id: string;
  title: string;
  project: string;
  repo?: string;
  description?: string;
  taskType?: string;
  references?: LocalTaskReference[];
}
interface TaskDraft {
  taskType: string;
  templateId: string | null;
  templateVersion?: number;
  title: string;
  project: string;
  repo: string;
  description: string;
  references: LocalTaskReference[];
}
interface Props {
  task?: LocalTaskInfo;
  model: { tasks: LocalTaskInfo[]; configuration?: ConfigurationModel['configuration'] };
  onManageConfiguration?: () => void;
  initialProject?: string;
  act: (
    command: WorkbenchCommand,
    message?: string,
    onError?: (message: string) => void,
  ) => unknown;
  close: () => void;
  onCreated: (id: string) => void;
  notify?: (message: string) => void;
}
function restoreDraft(key: string, fallback: TaskDraft): TaskDraft {
  try {
    const saved = JSON.parse(globalThis.sessionStorage.getItem(key) || 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return fallback;
    const text = (name: keyof TaskDraft) =>
      typeof saved[name] === 'string' ? saved[name] : fallback[name];
    return {
      taskType: typeof saved.taskType === 'string' ? saved.taskType : fallback.taskType,
      templateId: typeof saved.templateId === 'string' ? saved.templateId : null,
      templateVersion: Number.isInteger(saved.templateVersion) ? saved.templateVersion : undefined,
      title: text('title') as string,
      project: text('project') as string,
      repo: text('repo') as string,
      description: text('description') as string,
      references: Array.isArray(saved.references)
        ? saved.references.filter((value: unknown): value is LocalTaskReference => {
            if (!value || typeof value !== 'object') return false;
            const ref = value as Partial<LocalTaskReference>;
            return (
              ['file', 'link'].includes(ref.kind || '') &&
              typeof ref.name === 'string' &&
              typeof ref.location === 'string'
            );
          })
        : fallback.references,
    };
  } catch {
    return fallback;
  }
}

export function LocalTaskDialog({
  task,
  model,
  initialProject = '',
  act,
  close,
  onCreated,
  notify,
  onManageConfiguration,
}: Props) {
  const { t } = useI18n();
  const { getTaskTypes } = useWorkbenchRuntime().services as {
    getTaskTypes: (
      model: unknown,
      includeDisabled?: boolean,
    ) => { id: string; label: string; enabled: boolean; builtin: boolean }[];
  };
  const allTaskTypes = getTaskTypes(model, true);
  const draftKey = task ? `reed-local-task-context:${task.id}` : 'reed-local-task-draft';
  const [fields, setFields] = useState<TaskDraft>(() => {
    const initial = {
      taskType: task?.taskType || 'uncategorized',
      templateId: null,
      templateVersion: undefined,
      title: task?.title || '',
      project: task?.project || initialProject,
      repo: task?.repo || '',
      description: task?.description || '',
      references: task?.references || [],
    };
    return task ? initial : restoreDraft(draftKey, initial);
  });
  const taskTypes = allTaskTypes.filter((type) => type.enabled || type.id === fields.taskType);
  const projects = [...new Set(model.tasks.map((item) => item.project).filter(Boolean))];
  const [customProject, setCustomProject] = useState(
    Boolean(fields.project && !projects.includes(fields.project)),
  );
  const [newType, setNewType] = useState(false),
    [newTypeName, setNewTypeName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitted = useRef(false);
  const update = (patch: Partial<TaskDraft>) =>
    setFields((previous) => ({ ...previous, ...patch }));
  useEffect(() => {
    if (task) return;
    try {
      globalThis.sessionStorage.setItem(draftKey, JSON.stringify(fields));
    } catch {
      /* Keep the mounted form usable if storage is denied. */
    }
  }, [draftKey, fields, task]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted.current) return;
    if (!fields.title.trim()) {
      setError('请填写任务标题');
      return;
    }
    submitted.current = true;
    setSaving(true);
    setError('');
    const references = fields.references.map((reference) => ({
      ...reference,
      name:
        reference.name.trim() ||
        reference.location.trim().split(/[\\/]/).filter(Boolean).at(-1) ||
        '',
    }));
    const command = {
      type: task ? 'UPDATE_TASK_CONTEXT' : 'CREATE_TASK',
      ...(task ? { taskId: task.id } : {}),
      ...fields,
      references,
    };
    const next = act(command, undefined, setError) as { tasks?: LocalTaskInfo[] } | null;
    if (!next) {
      submitted.current = false;
      setSaving(false);
      return;
    }
    const created = task || next.tasks?.at(-1);
    if (!created) {
      setError('任务保存失败，请重试');
      submitted.current = false;
      setSaving(false);
      return;
    }
    try {
      globalThis.sessionStorage.removeItem(draftKey);
    } catch {
      /* Saving does not depend on draft cleanup. */
    }
    if (!task) onCreated(created.id);
    notify?.(task ? '任务信息已保存' : '任务已创建，保留在待办');
    close();
  }
  return (
    <Modal title={t(task ? '完善任务信息' : '新建本地任务')} close={close} wide={false}>
      <form onSubmit={submit}>
        <div className="modal-body local-task-form">
          <Field
            label={t('任务标题')}
            name="title"
            value={fields.title}
            required
            autoFocus
            placeholder={t('希望完成什么工作？')}
            onChange={(event: { target: { value: string } }) =>
              update({ title: event.target.value })
            }
          />
          <label className="field">
            {t('任务类型（可后补）')}
            <Select
              aria-label={t('任务类型')}
              value={fields.taskType}
              onChange={(event: { target: { value: string } }) =>
                update({ taskType: event.target.value })
              }
            >
              {taskTypes.map(({ id, label, builtin, enabled }) => (
                <option key={id} value={id} disabled={!enabled && id !== task?.taskType}>
                  {builtin ? t(label) : label}
                  {!enabled ? ` · ${t('config.disabled')}` : ''}
                </option>
              ))}
            </Select>
          </label>
          {!task && (
            <>
              <button type="button" className="quiet small" onClick={() => setNewType(!newType)}>
                {t('selection.newType')}
              </button>
              {newType && (
                <div className="inline-type-create">
                  <label className="field">
                    {t('selection.typeName')}
                    <input
                      aria-label={t('selection.typeName')}
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                    />
                  </label>
                  <div className="actions">
                    <button type="button" className="quiet" onClick={() => setNewType(false)}>
                      {t('selection.cancel')}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={!newTypeName.trim()}
                      onClick={() => {
                        const next = act(
                          {
                            type: 'SAVE_TASK_TYPE',
                            definition: {
                              name: newTypeName,
                              description: '',
                              icon: 'task',
                              recommendedTemplateIds: [],
                            },
                          },
                          undefined,
                          setError,
                        ) as { configuration?: ConfigurationModel['configuration'] } | null;
                        const created = next?.configuration?.taskTypes.at(-1);
                        if (created) {
                          update({ taskType: created.id });
                          setNewType(false);
                          setNewTypeName('');
                        }
                      }}
                    >
                      {t('selection.saveType')}
                    </button>
                  </div>
                </div>
              )}
              <WorkflowPicker
                model={model}
                taskType={fields.taskType}
                value={{ templateId: fields.templateId, templateVersion: fields.templateVersion }}
                onChange={(next) => update(next)}
                onManage={
                  onManageConfiguration
                    ? () => {
                        try {
                          sessionStorage.setItem(draftKey, JSON.stringify(fields));
                        } catch {}
                        onManageConfiguration();
                      }
                    : undefined
                }
              />
            </>
          )}
          <label className="field">
            {t('项目（可后补）')}
            {customProject ? (
              <div className="local-project-entry">
                <input
                  name="project"
                  aria-label={t('项目名称')}
                  value={fields.project}
                  placeholder={t('输入项目名称')}
                  onChange={(event) => update({ project: event.target.value })}
                />
                <button
                  type="button"
                  className="quiet small"
                  onClick={() => {
                    setCustomProject(false);
                    update({ project: '' });
                  }}
                >
                  {t('选择已有项目')}
                </button>
              </div>
            ) : (
              <Select
                name="project"
                aria-label={t('项目')}
                value={fields.project}
                onChange={(event: { target: { value: string } }) => {
                  if (event.target.value === '__new_project__') {
                    setCustomProject(true);
                    update({ project: '' });
                  } else update({ project: event.target.value });
                }}
              >
                <option value="">{t('未归组')}</option>
                {projects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
                <option value="__new_project__">{t('输入新项目名称…')}</option>
              </Select>
            )}
          </label>
          <label className="field">
            {t('任务说明（可后补）')}
            <textarea
              name="description"
              value={fields.description}
              rows={4}
              placeholder={t('记录背景、期望结果或待确认的问题。')}
              onChange={(event) => update({ description: event.target.value })}
            />
          </label>
          <details className="local-task-context-fields">
            <summary>
              {t('关联上下文')}
              <span>{t('仓库和资料可后补')}</span>
              <CaretDown size={14} />
            </summary>
            <Field
              label={t('仓库（可后补）')}
              name="repo"
              value={fields.repo}
              placeholder={t('仓库名称或本地目录')}
              onChange={(event: { target: { value: string } }) =>
                update({ repo: event.target.value })
              }
            />
            <div className="local-reference-heading">
              <span>{t('参考资料')}</span>
              <button
                type="button"
                className="quiet small"
                onClick={() =>
                  update({
                    references: [...fields.references, { kind: 'file', name: '', location: '' }],
                  })
                }
              >
                <Plus size={14} />
                {t('添加资料')}
              </button>
            </div>
            {fields.references.map((reference, index) => (
              <div className="local-reference-row" key={index}>
                <Select
                  aria-label={t('资料类型')}
                  value={reference.kind}
                  onChange={(event: { target: { value: string } }) =>
                    update({
                      references: fields.references.map((item, at) =>
                        at === index
                          ? { ...item, kind: event.target.value as LocalTaskReference['kind'] }
                          : item,
                      ),
                    })
                  }
                >
                  <option value="file">{t('本地文件')}</option>
                  <option value="link">{t('链接')}</option>
                </Select>
                <input
                  aria-label={t('资料名称')}
                  placeholder={t('资料名称（可自动填写）')}
                  value={reference.name}
                  onChange={(event) =>
                    update({
                      references: fields.references.map((item, at) =>
                        at === index ? { ...item, name: event.target.value } : item,
                      ),
                    })
                  }
                />
                <input
                  aria-label={t('资料位置')}
                  placeholder={t(
                    reference.kind === 'file' ? '输入本地文件路径' : '输入 HTTP 或 HTTPS 链接',
                  )}
                  value={reference.location}
                  onChange={(event) =>
                    update({
                      references: fields.references.map((item, at) =>
                        at === index ? { ...item, location: event.target.value } : item,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t('移除资料')}
                  onClick={() =>
                    update({ references: fields.references.filter((_, at) => at !== index) })
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <p className="footnote">
              {t('仅记录模拟关联，不读取文件、不扫描仓库，也不创建工作区。')}
            </p>
          </details>
          {!task && (
            <p className="local-task-create-hint">
              {t('创建后进入待办，明确开始后可人工处理或准备 Agent。')}
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
          <button type="submit" className="primary" disabled={!fields.title.trim() || saving}>
            {t(task ? '保存' : '创建任务')}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
