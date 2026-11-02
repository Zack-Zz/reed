import { useState } from 'react';
import { Modal, Field, priorityLabel, priorityOptions } from './ui.jsx';
import { MarkdownEditor } from './MarkdownEditor';
import { Select } from './Select.jsx';
import { useI18n } from './i18n.jsx';
import { useWorkbenchRuntime } from './runtime-context';

/** Current frontend presentation only; not a Core or wire model. */
interface BasicTask {
  id: string;
  title: string;
  taskType: string;
  description?: string;
  priority?: string | null;
  owner?: string | null;
}
interface Props {
  ctx: {
    task: BasicTask;
    model: unknown;
    run: (type: string, fields: Record<string, unknown>, message?: string) => unknown;
    setModal: (modal: null) => void;
  };
}

export function TaskBasicsDialog({ ctx }: Props) {
  const { t } = useI18n();
  const services = useWorkbenchRuntime().services as unknown as {
    getTaskTypes: (
      model: unknown,
      includeDisabled: boolean,
    ) => { id: string; label: string; builtin: boolean; enabled: boolean }[];
    taskSnapshot: (task: BasicTask) => string;
  };
  const [title, setTitle] = useState(ctx.task.title);
  const [taskType, setTaskType] = useState(ctx.task.taskType);
  const [description, setDescription] = useState(ctx.task.description || '');
  const [priority, setPriority] = useState(ctx.task.priority || '');
  const [owner, setOwner] = useState(ctx.task.owner === 'self' ? 'self' : '');
  const [expectedSnapshot] = useState(() => services.taskSnapshot(ctx.task));
  const [error, setError] = useState(false);
  const [imagePending, setImagePending] = useState(false);
  const types = services
    .getTaskTypes(ctx.model, true)
    .filter((type) => type.enabled || type.id === ctx.task.taskType);
  const close = () => ctx.setModal(null);
  return (
    <Modal title={t('minimal.edit')} close={close}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (imagePending) return;
          if (
            ctx.run(
              'SAVE_TASK_BASICS',
              {
                title,
                taskType,
                description,
                priority: priority || null,
                owner: owner || null,
                expectedSnapshot,
              },
              'minimal.saved',
            )
          )
            close();
          else setError(true);
        }}
      >
        <div className="modal-body task-flow-form">
          <Field
            label={t('任务标题')}
            name="title"
            required
            value={title}
            autoFocus
            onChange={(event: { target: { value: string } }) => setTitle(event.target.value)}
          />
          <label className="field">
            {t('任务类型')}
            <Select
              name="taskType"
              aria-label={t('任务类型')}
              required
              value={taskType}
              onChange={(event: { target: { value: string } }) => setTaskType(event.target.value)}
            >
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.builtin ? t(type.label) : type.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            {t('优先级')}
            <Select
              name="priority"
              aria-label={t('优先级')}
              value={priority}
              onChange={(event: { target: { value: string } }) => setPriority(event.target.value)}
            >
              <option value="">{t('未设置')}</option>
              {priorityOptions.map((value) => (
                <option key={value} value={value}>
                  {t(priorityLabel(value))}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            {t('负责人')}
            <Select
              name="owner"
              aria-label={t('负责人')}
              value={owner}
              onChange={(event: { target: { value: string } }) => setOwner(event.target.value)}
            >
              <option value="self">{t('minimal.you')}</option>
              <option value="">{t('未指定')}</option>
            </Select>
          </label>
          <div className="field">
            <span>{t('minimal.contentOptional')}</span>
            <MarkdownEditor
              name="description"
              rows={6}
              value={description}
              placeholder={t('minimal.contentHint')}
              ariaLabel={t('minimal.contentOptional')}
              onChange={setDescription}
              onPendingChange={setImagePending}
            />
          </div>
          <p className="footnote">{t('minimal.editHint')}</p>
          {error && (
            <p role="alert" className="scope-note">
              {t('minimal.saveFailed')}
            </p>
          )}
        </div>
        <footer className="modal-actions">
          <button type="button" className="quiet" onClick={close}>
            {t('取消')}
          </button>
          <button
            type="submit"
            className="primary"
            disabled={imagePending || !title.trim() || !taskType}
          >
            {t('minimal.save')}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
