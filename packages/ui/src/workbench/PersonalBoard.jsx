import { useWorkbenchRuntime } from './runtime-context.js';
import { useI18n } from './i18n.jsx';
import { Select } from './Select.jsx';
import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  MagnifyingGlass,
  Tray,
  CircleHalf,
  Eye,
  CheckCircle,
  FileText,
  ChatCircleDots,
  GitBranch,
  Pause,
  DotsThree,
  DotsSixVertical,
  WarningCircle,
} from '@phosphor-icons/react';

import { SourceBadge } from './SourceBadge.jsx';
import { IconButton, Modal, Status, taskStatus, taskTypeLabel, activity } from './ui.jsx';

const columnIcons = { todo: Tray, in_progress: CircleHalf, review: Eye, done: CheckCircle };
const emptyCopy = {
  todo: '新的工作，从这里开始。',
  in_progress: '开始任务后，会出现在这里。',
  review: '有产出等待确认时，会出现在这里。',
  done: '完成全部验收后，在这里回看。',
};

export function PersonalBoard({ ctx, boardUi, setBoardUi }) {
  const { getBoardColumn, getBoardMove, getTaskTypes, getOriginInfo, BOARD_COLUMNS } =
    useWorkbenchRuntime().services;
  const { t: tr } = useI18n();
  const { model, openTask, setModal, openForTask } = ctx;
  const TASK_TYPES = getTaskTypes(model, true);
  const columns = useRef({});
  const dragLock = useRef(false);
  const pointer = useRef(null);
  const [dragging, setDragging] = useState(null),
    [dropTarget, setDropTarget] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [picker, setPicker] = useState(null),
    [move, setMove] = useState(null);
  const { query, status = 'all', taskType = 'all', project, source = 'all' } = boardUi;
  const update = (patch) => setBoardUi((previous) => ({ ...previous, ...patch }));
  const projects = [
    ...new Set(
      model.tasks
        .filter((t) => t.status !== 'archived')
        .map((t) => t.project)
        .filter(Boolean),
    ),
  ];
  const entries = model.tasks
    .map((task) => ({ task, column: getBoardColumn(task, model.sessions) }))
    .filter(
      ({ task, column }) =>
        column &&
        (status === 'all' || column === status) &&
        (taskType === 'all' || (task.taskType || 'uncategorized') === taskType) &&
        (project === 'all' || task.project === project) &&
        (source === 'all' ||
          (source === 'local' && task.origin?.kind === 'local') ||
          (source === 'unknown' && !['local', 'connector'].includes(task.origin?.kind)) ||
          task.origin?.connectorId === source) &&
        `${task.title} ${task.id} ${task.externalId || ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    );
  const filtered =
    query || status !== 'all' || taskType !== 'all' || project !== 'all' || source !== 'all';
  const draggedPlan = dragging && dropTarget ? getBoardMove(model, dragging, dropTarget) : null;
  function findTarget(x, y) {
    const target =
      document.elementFromPoint(x, y)?.closest('[data-board-column]')?.dataset.boardColumn || null;
    if (pointer.current) pointer.current.target = target;
    setDropTarget(target);
  }
  function startPointer(event, taskId, handle = false) {
    if (event.button !== 0 || (event.pointerType === 'touch' && !handle)) return;
    pointer.current = {
      taskId,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      target: null,
      element: event.currentTarget,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function movePointer(event) {
    const current = pointer.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.x = event.clientX;
    current.y = event.clientY;
    if (!current.active && Math.hypot(current.x - current.startX, current.y - current.startY) < 7)
      return;
    event.preventDefault();
    current.active = true;
    dragLock.current = true;
    setDragging(current.taskId);
    setDragPosition({ x: current.x, y: current.y });
    findTarget(current.x, current.y);
  }
  function endPointer(event, cancel = false) {
    const current = pointer.current;
    if (!current || current.pointerId !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(null);
    setDropTarget(null);
    setDragPosition(null);
    if (current.active) {
      event.preventDefault();
      if (!cancel && current.target) requestMove(current.taskId, current.target);
      setTimeout(() => {
        dragLock.current = false;
      }, 180);
    }
  }
  useEffect(() => {
    if (!dragging) return;
    let frame;
    const scroll = () => {
      const current = pointer.current,
        area = document.querySelector('.workspace-content');
      if (current && area) {
        const rect = area.getBoundingClientRect();
        const delta = current.y > rect.bottom - 55 ? 12 : current.y < rect.top + 55 ? -12 : 0;
        if (delta) {
          area.scrollBy({ top: delta });
          findTarget(current.x, current.y);
        }
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    const cancel = (event) => {
      if (event.key !== 'Escape') return;
      const current = pointer.current;
      if (current?.element.hasPointerCapture(current.pointerId))
        current.element.releasePointerCapture(current.pointerId);
      pointer.current = null;
      dragLock.current = false;
      setDragging(null);
      setDropTarget(null);
      setDragPosition(null);
    };
    window.addEventListener('keydown', cancel);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', cancel);
    };
  }, [dragging]);
  function requestMove(taskId, target) {
    setPicker(null);
    setDragging(null);
    setDropTarget(null);
    const plan = getBoardMove(model, taskId, target);
    if (plan.kind === 'noop') return;
    if (plan.allowed && ['submit_review', 'complete', 'feedback', 'reopen'].includes(plan.kind)) {
      openForTask(
        taskId,
        {
          submit_review: 'task-review',
          complete: 'task-review',
          feedback: 'task-feedback',
          reopen: 'task-reopen',
        }[plan.kind],
      );
    } else setMove({ taskId, target });
  }
  const movePlan = move ? getBoardMove(model, move.taskId, move.target) : null;
  const pickedTask = picker ? model.tasks.find((task) => task.id === picker) : null;

  return (
    <section className="page personal-page">
      <header className="page-heading">
        <div>
          <h1>{tr('我的看板')}</h1>
          <p>{tr('手头的工作，下一步一目了然。')}</p>
        </div>
        <div className="heading-actions">
          <button className="quiet" onClick={() => setModal({ type: 'import' })}>
            {tr('导入')}
          </button>
          <button
            className="primary"
            onClick={() =>
              setModal({ type: 'create', initialProject: project === 'all' ? '' : project })
            }
          >
            <Plus size={16} />
            {tr('新建任务')}
          </button>
        </div>
      </header>
      <div className="list-tools personal-tools">
        <div className="search">
          <MagnifyingGlass size={17} />
          <input
            aria-label={tr('搜索看板任务')}
            placeholder={tr('查找任务或编号')}
            value={query}
            onChange={(event) => update({ query: event.target.value })}
          />
        </div>
        <Select
          aria-label={tr('看板项目筛选')}
          value={project}
          onChange={(event) => update({ project: event.target.value })}
        >
          <option value="all">{tr('全部项目')}</option>
          {projects.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </Select>
        <Select
          aria-label={tr('看板状态筛选')}
          value={status}
          onChange={(event) => update({ status: event.target.value })}
        >
          <option value="all">{tr('全部状态')}</option>
          {BOARD_COLUMNS.map(({ id, label }) => (
            <option key={id} value={id}>
              {tr(label)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={tr('任务类型筛选')}
          value={taskType}
          onChange={(event) => update({ taskType: event.target.value })}
        >
          <option value="all">{tr('全部类型')}</option>
          {TASK_TYPES.map(({ id, label, builtin }) => (
            <option key={id} value={id}>
              {builtin ? tr(label) : label}
            </option>
          ))}
        </Select>
        <Select
          className="source-picker"
          aria-label={tr('看板来源筛选')}
          searchable
          searchPlaceholder={tr('搜索来源或连接…')}
          value={source}
          onChange={(event) => update({ source: event.target.value })}
        >
          <option value="all" data-icon="all">
            {tr('全部来源')}
          </option>
          <option value="local" data-icon="local">
            {tr('本地 · Reed')}
          </option>
          <optgroup label={tr('云效连接')}>
            {model.connectors.map((connector) => (
              <option
                key={connector.id}
                value={connector.id}
                data-icon="yunxiao"
                data-description={
                  connector.legacy
                    ? tr('历史来源 · 原配置待确认')
                    : `${tr(connector.edition === 'region' ? 'Region 版' : '中心版')} · ${connector.organizationName || connector.organizationId || tr('独立实例')}`
                }
              >
                {
                  getOriginInfo(
                    model,
                    { origin: { kind: 'connector', connectorId: connector.id } },
                    tr,
                  ).label
                }
              </option>
            ))}
          </optgroup>
          <option value="unknown" data-icon="unknown">
            {tr('来源待确认')}
          </option>
        </Select>
        {filtered && (
          <button
            className="quiet small"
            onClick={() =>
              update({ query: '', status: 'all', taskType: 'all', project: 'all', source: 'all' })
            }
          >
            {tr('清除筛选')}
          </button>
        )}
        <span className="personal-total">{tr('{p0} 个任务', { p0: entries.length })}</span>
      </div>
      <nav className="board-overview" aria-label={tr('看板分组')}>
        {BOARD_COLUMNS.map(({ id, label }) => (
          <button key={id} onClick={() => columns.current[id]?.scrollIntoView({ block: 'start' })}>
            {tr(label)}
            <small>{entries.filter((entry) => entry.column === id).length}</small>
          </button>
        ))}
      </nav>
      <div className="personal-board">
        {BOARD_COLUMNS.map(({ id, label }) => {
          const items = entries.filter((entry) => entry.column === id),
            Icon = columnIcons[id];
          return (
            <section
              className={`personal-column column-${id} ${dropTarget === id ? `drop-target ${draggedPlan?.allowed ? 'drop-allowed' : 'drop-blocked'}` : ''}`}
              key={id}
              aria-label={tr(label)}
              data-board-column={id}
              ref={(element) => {
                columns.current[id] = element;
              }}
            >
              <header>
                <h2>
                  <Icon size={17} />
                  <span>{tr(label)}</span>
                  <small>{items.length}</small>
                </h2>
              </header>
              {dropTarget === id && (
                <p className="drop-hint">
                  {draggedPlan?.kind === 'noop'
                    ? tr('已在当前列')
                    : draggedPlan?.allowed
                      ? tr('松开后检查并继续流转')
                      : tr('松开查看未满足的条件')}
                </p>
              )}
              <div className="personal-stack">
                {items.length ? (
                  items.map(({ task }) => {
                    const docs = new Set(task.docs.map((doc) => doc.title)).size;
                    return (
                      <article
                        className={`personal-card ${dragging === task.id ? 'is-dragging' : ''}`}
                        key={task.id}
                        data-task-id={task.id}
                        aria-label={`${task.externalId || task.id} · ${task.title}`}
                      >
                        <button
                          className="personal-card-main"
                          onPointerDown={(event) => startPointer(event, task.id)}
                          onPointerMove={movePointer}
                          onPointerUp={endPointer}
                          onPointerCancel={(event) => endPointer(event, true)}
                          onClick={() => {
                            if (!dragLock.current) openTask(task.id);
                          }}
                        >
                          <span className="personal-card-id">
                            {task.externalId || task.id}
                            <span>
                              <SourceBadge
                                model={model}
                                entity={task}
                                compact
                                interactive={false}
                              />
                            </span>
                          </span>
                          <strong>{task.title}</strong>
                          <span className="personal-card-context">
                            <span className="type-tag">{taskTypeLabel(task, model, tr)}</span>
                            <Status value={task.status} text={taskStatus(task)} />
                            {['running', 'waiting', 'unknown', 'failed'].includes(
                              task.attention,
                            ) && <Status value={task.attention} text={activity[task.attention]} />}
                            {task.workflow && (
                              <span className="phase-tag">
                                {tr(task.workflow.stepLabels[task.stage])}
                              </span>
                            )}
                            {task.paused && (
                              <span className="status">
                                <Pause size={12} />
                                {tr('已暂停')}
                              </span>
                            )}
                            {task.completions?.at(-1)?.applicability === 'pending' && (
                              <span className="basis-warning">{tr('完成依据待复核')}</span>
                            )}
                          </span>
                          <span className="personal-project">{task.project || tr('未归组')}</span>
                        </button>
                        <footer>
                          <button
                            aria-label={tr('查看 {p0} 的文档', { p0: task.externalId || task.id })}
                            onClick={() => openForTask(task.id, 'associations')}
                          >
                            <FileText size={14} />
                            <span>{docs}</span>
                          </button>
                          <button
                            aria-label={tr('查看 {p0} 的关联会话', {
                              p0: task.externalId || task.id,
                            })}
                            onClick={() => openForTask(task.id, 'associations')}
                          >
                            <ChatCircleDots size={14} />
                            <span>{task.sessionIds.length}</span>
                          </button>
                          {task.workspace.ready && (
                            <button
                              className="personal-branch"
                              title={task.workspace.branch}
                              aria-label={tr('查看 {p0} 的开发分支', {
                                p0: task.externalId || task.id,
                              })}
                              onClick={() => {
                                const branch = model.branches.find(
                                  (item) =>
                                    item.taskId === task.id && item.path === task.workspace.path,
                                );
                                if (branch)
                                  openForTask(task.id, 'workspace', { branchId: branch.id });
                              }}
                            >
                              <GitBranch size={14} />
                              <span>{task.workspace.branch}</span>
                            </button>
                          )}
                          <IconButton
                            label={tr('移动 {p0}', { p0: task.externalId || task.id })}
                            className="card-move-button"
                            onClick={() => setPicker(task.id)}
                          >
                            <DotsThree size={17} />
                          </IconButton>
                          <IconButton
                            label={tr('拖拽 {p0}', { p0: task.externalId || task.id })}
                            className="card-drag-handle"
                            onPointerDown={(event) => startPointer(event, task.id, true)}
                            onPointerMove={movePointer}
                            onPointerUp={endPointer}
                            onPointerCancel={(event) => endPointer(event, true)}
                            onClick={() => {
                              if (!dragLock.current) setPicker(task.id);
                            }}
                          >
                            <DotsSixVertical size={16} />
                          </IconButton>
                        </footer>
                      </article>
                    );
                  })
                ) : (
                  <p className="personal-empty">
                    {filtered ? tr('没有符合筛选的任务。') : tr(emptyCopy[id])}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <footer className="personal-footnote">
        {tr('拖拽卡片流转，点击打开详情。')}
        <span>{tr('提交评审和完成时会检查产出与验收条件。')}</span>
      </footer>
      {dragging && dragPosition && (
        <div
          className="board-drag-preview"
          style={{
            left: Math.min(dragPosition.x + 15, window.innerWidth - 230),
            top: Math.min(dragPosition.y + 15, window.innerHeight - 75),
          }}
        >
          {model.tasks.find((task) => task.id === dragging)?.title}
          <small>
            {dropTarget
              ? tr('移到{p0}，检查流转条件', {
                  p0: tr(BOARD_COLUMNS.find((column) => column.id === dropTarget)?.label),
                })
              : tr('移到目标列后松开')}
          </small>
        </div>
      )}
      {pickedTask && (
        <Modal title={tr('移动任务')} close={() => setPicker(null)}>
          <div className="modal-body">
            <p>{pickedTask.title}</p>
            <div className="choice-list">
              {BOARD_COLUMNS.map((column) => (
                <button key={column.id} onClick={() => requestMove(picker, column.id)}>
                  <span>
                    {tr(column.label)}
                    <small>
                      {getBoardColumn(pickedTask, model.sessions) === column.id
                        ? tr('当前所在列')
                        : tr('检查流转条件后继续')}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
      {move && movePlan && (
        <BoardMoveReview
          key={`${move.taskId}:${move.target}:${movePlan.stage}:${movePlan.document?.id}:${movePlan.document?.version}`}
          ctx={ctx}
          move={move}
          plan={movePlan}
          close={() => setMove(null)}
        />
      )}
    </section>
  );
}

function BoardMoveReview({ ctx, move, plan, close }) {
  const { BOARD_COLUMNS } = useWorkbenchRuntime().services;
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const task = ctx.model.tasks.find((item) => item.id === move.taskId);
  const label = BOARD_COLUMNS.find((column) => column.id === move.target)?.label;
  function submit() {
    const type = { start: 'START_TASK', requeue: 'REQUEUE_TASK' }[plan.kind];
    if (!type || !plan.allowed || !confirmed) return;
    const next = ctx.act(
      { type, taskId: task.id },
      plan.kind === 'start' ? '已开始处理任务' : '任务已退回待办',
    );
    if (next) close();
    else setError('任务或材料已发生变化，请重新核对流转条件。');
  }
  return (
    <Modal
      title={plan.allowed ? t('确认任务流转') : t('暂时不能移到{p0}', { p0: t(label) })}
      close={close}
    >
      <div className="modal-body move-review">
        <p className="move-task-name">
          {task.title}
          <small>{t('{p0} → {p1}', { p0: t(taskStatus(task)), p1: t(label) })}</small>
        </p>
        <div className="move-checks">
          {(plan.checks || []).map((check) => (
            <div key={check.id} className={check.passed ? 'check-passed' : 'check-missing'}>
              {check.passed ? <CheckCircle size={18} /> : <WarningCircle size={18} />}
              <span>{t(check.label)}</span>
            </div>
          ))}
        </div>
        {plan.reason && <p className="footnote">{t(plan.reason)}</p>}
        {plan.allowed ? (
          <label className="move-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              {t(
                plan.kind === 'start'
                  ? '明确开始处理，暂不启动 Agent。'
                  : '重新排期并保留处理记录、产物与关联。',
              )}
            </span>
          </label>
        ) : (
          <p className="footnote">{t('卡片保持原位。补齐条件后，再提交这次流转。')}</p>
        )}
        {error && (
          <p className="scope-note" role="alert">
            {t(error)}
          </p>
        )}
      </div>
      <footer className="modal-actions">
        <button className="quiet" onClick={close}>
          {t('取消')}
        </button>
        {plan.allowed ? (
          <button className="primary" disabled={!confirmed} onClick={submit}>
            {t('确认流转')}
          </button>
        ) : (
          <button
            className="primary"
            onClick={() => {
              close();
              ctx.openTask(task.id, undefined, { intent: move.target });
            }}
          >
            {t('打开详情并补齐')}
          </button>
        )}
      </footer>
    </Modal>
  );
}
