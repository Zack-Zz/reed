import { useState } from 'react';
import { useI18n } from './i18n.jsx';

interface TaskComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}
interface Props {
  ctx: {
    task: { id: string; comments?: TaskComment[] };
    run: (type: string, fields: Record<string, unknown>, message?: string) => unknown;
  };
}

export function TaskComments({ ctx }: Props) {
  const { t, locale } = useI18n();
  const [body, setBody] = useState('');
  const [error, setError] = useState(false);
  const comments = ctx.task.comments || [];
  return (
    <section className="task-flow-section task-comments">
      <div className="section-title">
        <h2>{t('minimal.comments')}</h2>
        <span className="muted">{comments.length || ''}</span>
      </div>
      {comments.length ? (
        <ol className="task-comment-list">
          {comments.map((comment) => (
            <li key={comment.id}>
              <div className="task-comment-meta">
                <strong>{comment.author === 'You' ? t('minimal.you') : comment.author}</strong>
                <time dateTime={comment.createdAt}>
                  {new Date(comment.createdAt).toLocaleString(locale, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <p>{comment.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">{t('minimal.noComments')}</p>
      )}
      <form
        className="task-comment-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!body.trim()) return;
          if (ctx.run('ADD_TASK_COMMENT', { body }, 'minimal.commentSaved')) {
            setBody('');
            setError(false);
          } else setError(true);
        }}
      >
        <label className="field">
          <span className="sr-only">{t('minimal.addComment')}</span>
          <textarea
            name="comment"
            rows={3}
            maxLength={20000}
            required
            value={body}
            placeholder={t('minimal.commentPlaceholder')}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        {error && (
          <p className="scope-note" role="alert">
            {t('minimal.commentFailed')}
          </p>
        )}
        <div className="task-comment-actions">
          <button className="secondary small" type="submit" disabled={!body.trim()}>
            {t('minimal.addComment')}
          </button>
        </div>
      </form>
    </section>
  );
}
