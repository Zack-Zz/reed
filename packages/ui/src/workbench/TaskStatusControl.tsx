import { useState } from 'react';
import { Select } from './Select.jsx';
import { useI18n } from './i18n.jsx';
import { useWorkbenchRuntime } from './runtime-context';

/** Presentation types for the current preview, not a Core protocol. */
interface StatusTask {
  id: string;
  status: string;
  criteria?: { id: string; text: string }[];
}
interface StatusContext {
  task: StatusTask;
  model: unknown;
  run: (type: string, fields: Record<string, unknown>, message?: string) => unknown;
}
interface StatusGate {
  allowed: boolean;
  snapshot: string;
  checks: { id: string; label: string; passed: boolean }[];
}
interface StatusServices {
  TASK_STATUSES: { id: string; label: string }[];
  getTaskStatusChange: (model: unknown, task: StatusTask, status: string) => StatusGate;
}

export function TaskStatusControl({ ctx }: { ctx: StatusContext }) {
  const { t } = useI18n();
  const services = useWorkbenchRuntime().services as unknown as StatusServices;
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(false);
  return (
    <div className="task-status-control">
      <Select
        aria-label={t('minimal.changeStatus')}
        className={`task-status-select status-${ctx.task.status}`}
        value={ctx.task.status}
        searchable={false}
        onChange={(event: { target: { value: string } }) => {
          const status = event.target.value;
          if (status === ctx.task.status) return;
          setError(false);
          setPending(null);
          const gate = services.getTaskStatusChange(ctx.model, ctx.task, status);
          if (
            !gate.allowed ||
            (status === 'done' && ctx.task.status !== 'archived' && ctx.task.criteria?.length)
          ) {
            setPending(status);
            return;
          }
          if (
            !ctx.run(
              'CHANGE_TASK_STATUS',
              {
                status,
                expectedStatus: ctx.task.status,
                expectedSnapshot: gate.snapshot,
              },
              'minimal.statusSaved',
            )
          )
            setError(true);
        }}
      >
        {services.TASK_STATUSES.map((status) => {
          const gate = services.getTaskStatusChange(ctx.model, ctx.task, status.id);
          return (
            <option
              key={status.id}
              value={status.id}
              disabled={status.id !== ctx.task.status && !gate.allowed}
              data-description={gate.checks
                .filter((check) => !check.passed)
                .map((check) => t(check.label))
                .join(' · ')}
            >
              {t(status.label)}
            </option>
          );
        })}
      </Select>
      {pending && (
        <TaskStatusChangePanel
          key={`${ctx.task.id}:${ctx.task.status}:${pending}`}
          ctx={ctx}
          target={pending}
          close={() => setPending(null)}
        />
      )}
      {error && (
        <p className="scope-note" role="alert">
          {t('minimal.statusFailed')}
        </p>
      )}
    </div>
  );
}

/** Only configured acceptance criteria need a confirmation; ordinary changes are direct. */
export function TaskStatusChangePanel({
  ctx,
  target,
  close,
}: {
  ctx: StatusContext;
  target: string;
  close: () => void;
}) {
  const { t } = useI18n();
  const services = useWorkbenchRuntime().services as unknown as StatusServices;
  const gate = services.getTaskStatusChange(ctx.model, ctx.task, target);
  const [basis] = useState(() => ({
    status: ctx.task.status,
    snapshot: gate.snapshot,
    criteria: target === 'done' ? [...(ctx.task.criteria || [])] : [],
  }));
  const [accepted, setAccepted] = useState<string[]>([]);
  const [error, setError] = useState(false);
  return (
    <form
      className="task-status-confirm"
      aria-label={t('minimal.checkCriteria')}
      onSubmit={(event) => {
        event.preventDefault();
        if (
          ctx.run(
            'CHANGE_TASK_STATUS',
            {
              status: target,
              expectedStatus: basis.status,
              expectedSnapshot: basis.snapshot,
              criterionIds: accepted,
            },
            'minimal.statusSaved',
          )
        )
          close();
        else setError(true);
      }}
    >
      <p>{t(gate.allowed ? 'minimal.checkCriteria' : 'minimal.statusBlocked')}</p>
      {gate.checks
        .filter((check) => !check.passed)
        .map((check) => (
          <p key={check.id} className="scope-note">
            {t(check.label)}
          </p>
        ))}
      {basis.criteria.map((criterion) => (
        <label className="move-confirm" key={criterion.id}>
          <input
            type="checkbox"
            checked={accepted.includes(criterion.id)}
            onChange={(event) => {
              setAccepted(
                event.target.checked
                  ? [...accepted, criterion.id]
                  : accepted.filter((id) => id !== criterion.id),
              );
            }}
          />
          <span>{criterion.text}</span>
        </label>
      ))}
      {error && (
        <p className="scope-note" role="alert">
          {t('minimal.statusFailed')}
        </p>
      )}
      <div className="actions">
        <button className="quiet small" type="button" onClick={close}>
          {t('取消')}
        </button>
        {gate.allowed && (
          <button
            className="primary small"
            type="submit"
            disabled={!basis.criteria.every((criterion) => accepted.includes(criterion.id))}
          >
            {t('minimal.finishStatus')}
          </button>
        )}
      </div>
    </form>
  );
}
