import { Folder, LinkSimple, PencilSimple } from '@phosphor-icons/react';
import { useI18n } from './i18n.jsx';
import { Markdown } from './ui.jsx';
import type { LocalTaskInfo } from './LocalTaskDialog';

export function TaskContextSection({ task, edit }: { task: LocalTaskInfo; edit?: () => void }) {
  const { t } = useI18n();
  return (
    <section className="task-context-section">
      <div className="section-title">
        <h2>{t('任务信息')}</h2>
        {edit && (
          <button className="text-link" onClick={edit}>
            <PencilSimple size={14} />
            {t('完善任务信息')}
          </button>
        )}
      </div>
      <dl className="task-context-summary">
        <div>
          <dt>{t('项目')}</dt>
          <dd>{task.project || t('未归组')}</dd>
        </div>
        <div>
          <dt>{t('代码仓库')}</dt>
          <dd>{task.repo || t('未关联仓库')}</dd>
        </div>
      </dl>
      {task.description && <Markdown body={task.description} />}
      <div className="local-reference-list">
        {(task.references || []).map((reference, index) => (
          <div className="local-reference" key={index}>
            {reference.kind === 'link' ? <LinkSimple size={16} /> : <Folder size={16} />}
            <span>
              <strong>{reference.name}</strong>
              <small>{reference.location}</small>
            </span>
          </div>
        ))}
        {!task.references?.length && <p className="muted">{t('尚未关联参考资料，可稍后补充。')}</p>}
      </div>
    </section>
  );
}
