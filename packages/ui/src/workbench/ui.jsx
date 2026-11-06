import { useI18n } from './i18n.jsx';
import { useEffect, useRef } from 'react';
import { X, Circle } from '@phosphor-icons/react';
import { markdownReferences } from './markdown-content';
export const activity = {
  idle: '待开始',
  review: '待验收',
  running: '执行中',
  waiting: '需要答复',
  failed: '检查失败',
  unknown: '待核查',
  ended: '已结束',
};
export const syncLabel = {
  synced: '已同步',
  pending: '待同步',
  conflict: '同步冲突',
  unknown: '同步待核查',
};
export const needsAttention = (t) =>
  ['review', 'waiting', 'failed', 'unknown'].includes(t.attention) ||
  ['conflict', 'unknown'].includes(t.sync);
export const isBusy = (t) => ['running', 'waiting', 'unknown'].includes(t.attention);
export const latest = (t, stage) => t.docs.filter((d) => d.stage === stage).at(-1);
export const taskStatus = (task) =>
  ({ todo: '待办', in_progress: '处理中', review: '评审中', done: '已完成', archived: '归档' })[
    task.status
  ] || '状态待确认';
export const taskTypeLabel = (task, model, translate = (value) => value) => {
  const definition = model?.configuration?.taskTypes.find((item) => item.id === task.taskType);
  if (definition) return definition.builtin ? translate(definition.name) : definition.name;
  return translate(
    {
      uncategorized: '未分类',
      requirement: '需求',
      development: '开发',
      test: '测试',
      verification: '验证',
      documentation: '文档',
    }[task.taskType] || '未分类',
  );
};
export const artifactOutcomeLabel = (artifact) =>
  ({
    manual: '人工提交',
    passed: '执行通过',
    failed: '执行失败',
    not_run: '未运行',
    review: '待审阅产物',
    waiting: '等待答复',
    unknown: '结果待核查',
  })[artifact.outcome] || '未记录执行结果';
export function IconButton({ label, children, className = '', ...props }) {
  const { t } = useI18n();
  return (
    <button
      className={`icon-button ${className}`}
      title={t(label)}
      aria-label={t(label)}
      {...props}
    >
      {children}
    </button>
  );
}
export function TaskIdentity({ task }) {
  return (
    <span className="task-identity">
      {task.externalId || task.id}
      {task.project ? <small>{task.project}</small> : null}
    </span>
  );
}
export function Status({ value, text }) {
  const { t } = useI18n();
  return (
    <span className={`status status-${value}`}>
      <Circle size={7} weight="fill" />
      {t(text || activity[value])}
    </span>
  );
}
const PRIORITY_LABELS = {
  p0: 'P0 紧急',
  p1: 'P1 高',
  p2: 'P2 中',
  p3: 'P3 低',
};
export function Priority({ value }) {
  const { t } = useI18n();
  if (!PRIORITY_LABELS[value]) return null;
  return (
    <span className={`priority priority-${value}`} title={t(PRIORITY_LABELS[value])}>
      {value.toUpperCase()}
    </span>
  );
}
export const priorityOptions = Object.keys(PRIORITY_LABELS);
export const priorityLabel = (value) => PRIORITY_LABELS[value] || '未设置';
export function formatTimestamp(value, locale) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
export function taskEventText(event, t) {
  return event.text === 'task.status-changed'
    ? t('minimal.statusActivity', {
        from: t(taskStatus({ status: event.fromStatus })),
        status: t(taskStatus({ status: event.status })),
      })
    : t(event.text);
}
const SAFE_IMAGE_URL = /^https?:\/\/[^\s]+$/i;
const DATA_IMAGE_URL = /^data:image\/[a-z0-9.+-]+(?:;[a-z0-9=+._-]+)*,[^\s]*$/i;
const SAFE_LINK_URL = /^(?:https?:\/\/|mailto:)[^\s]+$/i;
/** URL guards shared with the Markdown editor before it writes image syntax. */
export const isSafeImageUrl = (url) => SAFE_IMAGE_URL.test(url) || DATA_IMAGE_URL.test(url);
export const isSafeLinkUrl = (url) => SAFE_LINK_URL.test(url);
function inlineContent(text) {
  const nodes = [];
  let cursor = 0;
  for (const reference of markdownReferences(text)) {
    const { start, end, image, label, url } = reference;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    const safe = image ? isSafeImageUrl(url) : isSafeLinkUrl(url);
    if (!safe) nodes.push(text.slice(start, end));
    else if (image) nodes.push(<img key={`img-${start}`} src={url} alt={label} />);
    else
      nodes.push(
        <a key={`link-${start}`} href={url} target="_blank" rel="noreferrer">
          {label}
        </a>,
      );
    cursor = end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes.length ? nodes : [text];
}
export function Markdown({ body = '', preview = false }) {
  return (
    <div className="markdown">
      {body.split('\n').map((line, i) => {
        if (!line.trim() || (preview && i === 0 && line.startsWith('# '))) return null;
        const trimmed = line.trim();
        const references = markdownReferences(trimmed);
        const image = references.length === 1 ? references[0] : null;
        if (
          image?.image &&
          image.start === 0 &&
          image.end === trimmed.length &&
          isSafeImageUrl(image.url)
        )
          return (
            <figure className="markdown-image" key={i}>
              <img src={image.url} alt={image.label} loading="lazy" />
              {image.label && <figcaption>{image.label}</figcaption>}
            </figure>
          );
        if (line.startsWith('## ')) return <h3 key={i}>{inlineContent(line.slice(3))}</h3>;
        if (line.startsWith('# ')) return <h2 key={i}>{inlineContent(line.slice(2))}</h2>;
        if (line.startsWith('- '))
          return (
            <div className="bullet-row" key={i}>
              <Circle size={4} weight="fill" />
              {inlineContent(line.slice(2))}
            </div>
          );
        return (
          <p key={i} className={line.startsWith('> ') ? 'document-note' : ''}>
            {inlineContent(line.replace(/^> /, ''))}
          </p>
        );
      })}
    </div>
  );
}
export function Modal({ title, close, wide = false, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current,
      previous = document.activeElement;
    d.showModal();
    return () => {
      d.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <header className="modal-head">
        <h2>{title}</h2>
        <IconButton label="关闭弹窗" onClick={close}>
          <X size={19} />
        </IconButton>
      </header>
      {children}
    </dialog>
  );
}
export function Field({ label, ...props }) {
  const { t } = useI18n();
  return (
    <label className="field">
      {t(label)}
      <input {...props} placeholder={t(props.placeholder)} />
    </label>
  );
}
