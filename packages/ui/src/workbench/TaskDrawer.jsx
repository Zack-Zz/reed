import { useI18n } from './i18n.jsx';
import { useEffect, useRef } from 'react';
import { ArrowUpRight, X } from '@phosphor-icons/react';
import { IconButton } from './ui.jsx';

export function TaskDrawer({ task, close, openFullPage, intent, notice, children }) {
  const { t: tr } = useI18n();
  const ref = useRef(null);
  useEffect(() => {
    const drawer = ref.current,
      previous = document.activeElement;
    drawer.showModal();
    return () => {
      drawer.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="task-drawer"
      aria-label={tr('任务详情 · {p0}', { p0: task.title })}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
    >
      <header className="drawer-header">
        <span>
          {task.externalId || task.id}
          <small>{task.project}</small>
        </span>
        <div>
          <IconButton label={tr('打开完整任务页面')} onClick={openFullPage}>
            <ArrowUpRight size={18} />
          </IconButton>
          <IconButton label={tr('关闭任务详情')} onClick={close}>
            <X size={19} />
          </IconButton>
        </div>
      </header>
      <div className="drawer-content">
        {notice && (
          <p className="drawer-notice" role="status">
            {tr(notice)}
          </p>
        )}
        {intent && intent.kind === 'blocked' && (
          <div className="drawer-intent">
            <strong>{tr('流转条件待补齐')}</strong>
            {intent.checks
              .filter((check) => !check.passed)
              .map((check) => (
                <p key={check.id}>{tr(check.label)}</p>
              ))}
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
