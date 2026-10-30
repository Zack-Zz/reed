import { useWorkbenchRuntime } from '../runtime-context.js';
import { useI18n } from '../i18n.jsx';
import { Select } from '../Select.jsx';
import {
  Tray as Inbox,
  CaretRight,
  Plus,
  MagnifyingGlass,
  ListBullets,
  SquaresFour,
} from '@phosphor-icons/react';
import { needsAttention, taskStatus, taskTypeLabel, activity, IconButton, Status } from '../ui.jsx';
import { SourceBadge } from '../SourceBadge.jsx';

function TaskCounts({ task }) {
  const { t: tr } = useI18n();
  const sessions = task.sessionIds.length;
  const documents = new Set(task.docs.map((doc) => doc.title)).size;
  const sessionLabel = tr(sessions === 1 ? '1 个会话' : '{count} 个会话', { count: sessions });
  const resourceLabel = task.workspace.ready
    ? tr('1 分支')
    : tr(documents === 1 ? '1 份文档' : '{count} 份文档', { count: documents });
  return (
    <span className="counts">
      <span className="count-item">{sessionLabel}</span>
      <span className="count-item">
        <span aria-hidden="true">·</span>
        {resourceLabel}
      </span>
    </span>
  );
}

export function TaskList({ ctx, filter, setFilter, listUi, setListUi }) {
  const { getTaskTypes, TASK_STATUSES, BOARD_COLUMNS, getOriginInfo } =
    useWorkbenchRuntime().services;
  const { t: tr } = useI18n();
  const { model, openTask, setModal } = ctx;
  const TASK_TYPES = getTaskTypes(model, true);
  const { query, source, taskType = 'all', status = 'all', board } = listUi;
  const setQuery = (value) => setListUi((s) => ({ ...s, query: value }));
  const setSource = (value) => setListUi((s) => ({ ...s, source: value }));
  const setTaskType = (value) => setListUi((s) => ({ ...s, taskType: value }));
  const setStatus = (value) => setListUi((s) => ({ ...s, status: value }));
  const setBoard = (value) => setListUi((s) => ({ ...s, board: value }));
  const tasks = model.tasks.filter(
    (t) =>
      (filter === 'sourced'
        ? true
        : filter === 'archived'
          ? t.status === 'archived'
          : filter === 'completed'
            ? t.status === 'done'
            : t.status !== 'archived') &&
      (filter !== 'attention' || needsAttention(t)) &&
      (source === 'all' ||
        (source === 'local' && t.origin?.kind === 'local') ||
        (source === 'unknown' && !['local', 'connector'].includes(t.origin?.kind)) ||
        t.origin?.connectorId === source) &&
      (taskType === 'all' || (t.taskType || 'uncategorized') === taskType) &&
      (status === 'all' || t.status === status) &&
      `${t.title}${t.id}${t.externalId || ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="page tasks-page">
      <header className="page-heading">
        <div>
          <h1>
            {tr(
              {
                attention: '待我处理',
                archived: '已归档',
                completed: '已完成',
                sourced: '来源任务',
              }[filter] || '任务导航',
            )}
          </h1>
          <p>{tr('每一件工作，都有清楚的来路与下一步。')}</p>
        </div>
        <div className="heading-actions">
          <button className="quiet" onClick={() => setModal({ type: 'import' })}>
            {tr('导入')}
          </button>
          <button className="primary" onClick={() => setModal({ type: 'create' })}>
            <Plus size={16} />
            {tr('新建任务')}
          </button>
        </div>
      </header>
      <div className="list-tools">
        <div className="search">
          <MagnifyingGlass size={17} />
          <input
            aria-label={tr('搜索任务')}
            placeholder={tr('查找任务或编号')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select
          className="compact-views"
          aria-label={tr('任务视图')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{tr('全部任务')}</option>
          <option value="attention">{tr('待我处理')}</option>
          <option value="completed">{tr('已完成')}</option>
          <option value="archived">{tr('已归档')}</option>
          <option value="sourced">{tr('全部来源任务')}</option>
        </Select>
        <Select
          aria-label={tr('任务类型筛选')}
          value={taskType}
          onChange={(event) => setTaskType(event.target.value)}
        >
          <option value="all">{tr('全部类型')}</option>
          {TASK_TYPES.map(({ id, label, builtin }) => (
            <option key={id} value={id}>
              {builtin ? tr(label) : label}
            </option>
          ))}
        </Select>
        <Select
          aria-label={tr('任务状态筛选')}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">{tr('全部状态')}</option>
          {TASK_STATUSES.map(({ id, label }) => (
            <option key={id} value={id}>
              {tr(label)}
            </option>
          ))}
        </Select>
        <Select
          className="source-picker"
          aria-label={tr('来源筛选')}
          searchable
          searchPlaceholder={tr('搜索来源或连接…')}
          value={source}
          onChange={(e) => setSource(e.target.value)}
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
        <div className="view-switch">
          <IconButton
            label={tr('列表视图')}
            className={!board ? 'active' : ''}
            onClick={() => setBoard(false)}
          >
            <ListBullets size={17} />
          </IconButton>
          <IconButton
            label={tr('看板视图')}
            className={board ? 'active' : ''}
            onClick={() => setBoard(true)}
          >
            <SquaresFour size={17} />
          </IconButton>
        </div>
      </div>
      {!tasks.length ? (
        <div className="empty">
          <Inbox size={38} weight="light" />
          <h3>{tr('这里暂时没有任务')}</h3>
          <p>{tr('调整筛选，或从一个新的想法开始。')}</p>
          <button
            className="secondary"
            onClick={() => {
              setQuery('');
              setSource('all');
              setTaskType('all');
              setStatus('all');
              setFilter('all');
            }}
          >
            {tr('清除筛选')}
          </button>
        </div>
      ) : board ? (
        <div className="board">
          {(filter === 'archived'
            ? TASK_STATUSES.filter((item) => item.id === 'archived')
            : BOARD_COLUMNS
          ).map(({ id, label }) => (
            <section key={id}>
              <h3>
                {tr(label)}
                <span>{tasks.filter((t) => t.status === id).length}</span>
              </h3>
              {tasks
                .filter((t) => t.status === id)
                .map((t) => (
                  <button className="board-task" key={t.id} onClick={() => openTask(t.id)}>
                    <small>{t.externalId || t.id}</small>
                    <SourceBadge model={model} entity={t} compact interactive={false} />
                    <strong>{t.title}</strong>
                    <span className="type-tag">{taskTypeLabel(t, model, tr)}</span>
                    <Status value={t.status} text={taskStatus(t)} />
                  </button>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="task-table">
          <div className="table-head">
            <span>{tr('任务')}</span>
            <span>{tr('任务类型')}</span>
            <span>{tr('任务状态')}</span>
            <span>{tr('关联内容')}</span>
            <span />
          </div>
          {tasks.map((t) => (
            <button className="task-row" key={t.id} onClick={() => openTask(t.id)}>
              <span className="task-name">
                <strong>{t.title}</strong>
                <small>
                  <span className="task-inline-type">{taskTypeLabel(t, model, tr)} · </span>
                  {t.externalId || t.id} ·{' '}
                  <SourceBadge model={model} entity={t} compact interactive={false} />
                </small>
                {['running', 'waiting', 'unknown', 'failed'].includes(t.attention) && (
                  <small>{tr(activity[t.attention])}</small>
                )}
                {t.completions?.at(-1)?.applicability === 'pending' && (
                  <small className="basis-warning">{tr('完成依据待复核')}</small>
                )}
              </span>
              <span className="task-type">{taskTypeLabel(t, model, tr)}</span>
              <Status value={t.status} text={taskStatus(t)} />
              <TaskCounts task={t} />
              <CaretRight size={15} />
            </button>
          ))}
        </div>
      )}
      <footer className="list-footer">
        {tr('共 {count} 个任务', { count: tasks.length })}
        <span>{tr('列表与看板共享任务生命周期')}</span>
      </footer>
    </section>
  );
}
