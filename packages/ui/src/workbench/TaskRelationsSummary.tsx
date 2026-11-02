import { useI18n } from './i18n.jsx';
import { Status, taskStatus } from './ui.jsx';

interface RelationTask {
  id: string;
  title: string;
  status: string;
}
interface Props {
  onLink?: () => void;
  ctx: {
    task: RelationTask;
    model: {
      tasks: RelationTask[];
      relations?: {
        id: string;
        kind: string;
        fromTaskId: string;
        toTaskId: string;
        active?: boolean;
        required?: boolean;
      }[];
    };
    openTask?: (id: string) => void;
    openRelations?: (id: string) => void;
  };
}

export function TaskRelationsSummary({ ctx, onLink }: Props) {
  const { t } = useI18n();
  const relations = (ctx.model.relations || []).filter(
    (relation) =>
      relation.active !== false && [relation.fromTaskId, relation.toTaskId].includes(ctx.task.id),
  );
  const groups: {
    key: string;
    label: string;
    items: { relation: (typeof relations)[number]; target: RelationTask; kind: string }[];
  }[] = [
    { key: 'upstream', label: '上游任务', items: [] },
    { key: 'downstream', label: '下游任务', items: [] },
    { key: 'related', label: '相关任务', items: [] },
  ];
  for (const relation of relations) {
    const outgoing = relation.fromTaskId === ctx.task.id;
    const target = ctx.model.tasks.find(
      (task) => task.id === (outgoing ? relation.toTaskId : relation.fromTaskId),
    );
    if (!target) continue;
    const kind =
      relation.kind === 'child'
        ? outgoing
          ? 'child'
          : 'parent'
        : relation.kind === 'dependency'
          ? outgoing
            ? 'dependency'
            : 'dependent'
          : 'related';
    const groupKey = kind === 'related' ? 'related' : outgoing ? 'downstream' : 'upstream';
    groups.find((group) => group.key === groupKey)?.items.push({ relation, target, kind });
  }
  return (
    <section className={`task-flow-section${relations.length ? '' : ' task-supplement-empty'}`}>
      <div className="section-title">
        <h2>{t('minimal.relations')}</h2>
        <div className="task-section-actions">
          {onLink && (
            <button className="text-link" onClick={onLink}>
              {t('minimal.addRelation')}
            </button>
          )}
          {relations.length > 0 && (
            <button className="text-link" onClick={() => ctx.openRelations?.(ctx.task.id)}>
              {t('relation.open')}
            </button>
          )}
        </div>
      </div>
      {!relations.length && <p className="muted">{t('minimal.noRelations')}</p>}
      {groups.map((group) =>
        group.items.length ? (
          <div className="task-relation-group" key={group.key}>
            <p className="muted">{t(group.label)}</p>
            {group.items.map(({ relation, target, kind }) => (
              <button
                className="task-relation-summary"
                key={relation.id}
                onClick={() => ctx.openTask?.(target.id)}
              >
                <span className="muted">{t(`minimal.${kind}`)}</span>
                <strong>{target.title}</strong>
                <Status value={target.status} text={taskStatus(target)} />
                {relation.required && <small>{t('relation.required')}</small>}
              </button>
            ))}
          </div>
        ) : null,
      )}
    </section>
  );
}
