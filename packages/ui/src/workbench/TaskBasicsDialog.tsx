import { useState } from 'react';
import { Modal, Field } from './ui.jsx';
import { Select } from './Select.jsx';
import { useI18n } from './i18n.jsx';
import { useWorkbenchRuntime } from './runtime-context';

/** Current frontend presentation only; not a Core or wire model. */
interface BasicTask {
  id: string;
  title: string;
  taskType: string;
  description?: string;
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
  const [expectedSnapshot] = useState(() => services.taskSnapshot(ctx.task));
  const [error, setError] = useState(false);
  const types = services
    .getTaskTypes(ctx.model, true)
    .filter((type) => type.enabled || type.id === ctx.task.taskType);
  const close = () => ctx.setModal(null);
  return (
    <Modal title={t('minimal.edit')} close={close}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (
            ctx.run(
              'SAVE_TASK_BASICS',
              { title, taskType, description, expectedSnapshot },
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
            {t('minimal.contentOptional')}
            <textarea
              name="description"
              rows={6}
              value={description}
              placeholder={t('minimal.contentHint')}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
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
          <button type="submit" className="primary" disabled={!title.trim() || !taskType}>
            {t('minimal.save')}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
