import { useState } from 'react';
import { useI18n } from './i18n.jsx';
import { Markdown } from './ui.jsx';
import { DEFAULT_MARKDOWN_MAX_LENGTH, MarkdownEditor } from './MarkdownEditor';

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
  /** Comment length ceiling; aligned with the model validation when it changes. */
  maxLength?: number;
}

export function TaskComments({ ctx, maxLength = DEFAULT_MARKDOWN_MAX_LENGTH }: Props) {
  const { t, locale } = useI18n();
  const [body, setBody] = useState('');
  const [error, setError] = useState(false);
  const [imagePending, setImagePending] = useState(false);
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
              <div className="task-comment-body">
                <Markdown body={comment.body} />
              </div>
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
          if (imagePending || !body.trim()) return;
          if (ctx.run('ADD_TASK_COMMENT', { body }, 'minimal.commentSaved')) {
            setBody('');
            setError(false);
          } else setError(true);
        }}
      >
        <div className="field">
          <MarkdownEditor
            name="comment"
            rows={3}
            maxLength={maxLength}
            required
            value={body}
            placeholder={t('minimal.commentPlaceholder')}
            ariaLabel={t('minimal.addComment')}
            onChange={setBody}
            onPendingChange={setImagePending}
          />
        </div>
        {error && (
          <p className="scope-note" role="alert">
            {t('minimal.commentFailed')}
          </p>
        )}
        <div className="task-comment-actions">
          <button className="secondary small" type="submit" disabled={imagePending || !body.trim()}>
            {t('minimal.addComment')}
          </button>
        </div>
      </form>
    </section>
  );
}
