import { useI18n } from './i18n.jsx';
import { useEffect, useRef } from 'react';
import { ArrowSquareOut, X } from '@phosphor-icons/react';
import { IconButton, TaskIdentity } from './ui.jsx';

export function TaskRelationsDialog({ task, close, openFull, children }) {
  const { t: tr } = useI18n();
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current,
      previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="relations-dialog"
      aria-label={tr('relation.title')}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
    >
      <header className="drawer-header">
        <TaskIdentity task={task} />
        <div>
          <IconButton label={tr('全屏查看')} onClick={openFull}>
            <ArrowSquareOut size={18} />
          </IconButton>
          <IconButton label={tr('关闭关系图')} onClick={close}>
            <X size={19} />
          </IconButton>
        </div>
      </header>
      <div className="drawer-content">{children}</div>
    </dialog>
  );
}
