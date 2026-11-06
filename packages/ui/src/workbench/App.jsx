import { useWorkbenchRuntime, useWorkbenchFileExport } from './runtime-context.js';
import { useAppearance } from './useAppearance.js';
import { SettingsControl } from './SettingsControl.jsx';
import { useI18n } from './i18n.jsx';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  FileText,
  ChatCircleDots,
  GitBranch,
  Users,
  Archive,
  SquaresFour,
  PencilSimple,
  CheckCircle,
  Info,
  Plugs,
  ArrowSquareIn,
} from '@phosphor-icons/react';
import { WorkflowConfigurationPage } from './pages/WorkflowConfigurationPage';
import { IconButton, Modal, TaskIdentity } from './ui.jsx';
import { Dialogs } from './Dialogs.jsx';
import { PersonalBoard } from './PersonalBoard.jsx';
import { TaskDrawer } from './TaskDrawer.jsx';
import { TaskRelationsDialog } from './TaskRelationsDialog.jsx';
import { ConnectorSettings } from './ConnectorSettings.jsx';

import { TaskDetail } from './pages/TaskDetailPage.jsx';
import { TaskList } from './pages/TaskListPage.jsx';
import { switchRelationRoot } from './relations-layout';
import { TaskRelationsPage } from './pages/TaskRelationsPage';
import { ProjectPage } from './pages/ProjectPage';
import { ResourceDrawer } from './ResourceDrawer';

function requestedRelations() {
  try {
    return new URLSearchParams(globalThis.location?.search || '').get('view') === 'relations';
  } catch {
    return false;
  }
}
export function App() {
  const runtime = useWorkbenchRuntime();
  const fileExport = useWorkbenchFileExport();
  const { getBoardMove } = runtime.services;
  const { t: tr } = useI18n();
  const [model, setModel] = useState(() => runtime.load()),
    ref = useRef(model);
  const [view, setView] = useState(() => (requestedRelations() ? 'relations' : 'personal')),
    [id, setId] = useState('REQ-1042'),
    [stage, setStage] = useState(null);
  const [scope, setScope] = useState(null),
    [resource, setResource] = useState(null),
    [filter, setFilter] = useState('all');
  const [drawerId, setDrawerId] = useState(null),
    [drawerIntent, setDrawerIntent] = useState(null);
  const [relationsDialogId, setRelationsDialogId] = useState(null);
  const [connectorSelection, setConnectorSelection] = useState(null);
  const [projectViewId, setProjectViewId] = useState(null);
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [resourceView, setResourceView] = useState(null);
  const [relationsUi, setRelationsUi] = useState({
    rootId: null,
    collapsed: [],
    zoom: 0.9,
    pan: { x: 16, y: 16 },
    showRelated: true,
    showDependencies: true,
  });
  const configurationReturn = useRef(null);
  const [configurationTab, setConfigurationTab] = useState('types');
  const [configurationDirty, setConfigurationDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const initialRelationExample = useRef(false);
  const [boardUi, setBoardUi] = useState({
    query: '',
    status: 'all',
    project: 'all',
    source: 'all',
  });
  const [taskOrigin, setTaskOrigin] = useState('personal');
  const [listUi, setListUi] = useState({ query: '', source: 'all', phase: 'all', board: false });
  const [modal, setModal] = useState(null),
    [menu, setMenu] = useState(null),
    [toast, setToast] = useState('');
  const { theme, setTheme, dark } = useAppearance();
  const [saved, setSaved] = useState(true);
  const task = model.tasks.find((t) => t.id === (drawerId || id)) || model.tasks[0];
  useEffect(() => {
    setSaved(runtime.save(model));
  }, [model, runtime]);
  useEffect(() => {
    if (initialRelationExample.current) return;
    initialRelationExample.current = true;
    try {
      const params = new URLSearchParams(globalThis.location?.search || '');
      if (params.get('view') === 'relations' && params.get('example') === '1')
        showRelationExample();
    } catch {
      /* A plain route remains available without location access. */
    }
  }, []);
  useEffect(() => {
    document.querySelector('.workspace-content')?.scrollTo({ top: 0, left: 0 });
  }, [view]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') setMenu(null);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  function act(action, message, onError) {
    try {
      const next = runtime.reduce(ref.current, action);
      ref.current = next;
      setModel(next);
      if (
        [
          'SET_TASK_WORKFLOW',
          'SKIP_WORKFLOW_STEP',
          'REOPEN_TASK',
          'CHANGE_TASK_STATUS',
          'SAVE_TASK_SCOPE',
          'LINK_TASK',
          'CREATE_RELATED_TASK',
        ].includes(action.type)
      )
        setStage(next.tasks.find((item) => item.id === action.taskId)?.stage ?? null);
      if (action.type === 'CREATE_RELATED_TASK')
        setRelationsUi((previous) => ({
          ...previous,
          collapsed: previous.collapsed.filter((key) => key !== action.taskId),
          selectedId: next.tasks.at(-1).id,
        }));
      if (message) setToast(message);
      return next;
    } catch (e) {
      setToast(e.message);
      onError?.(e.message);
      return null;
    }
  }
  const run = (type, extra = {}, message) => act({ type, taskId: task.id, ...extra }, message);
  function openTask(key, at, options = {}) {
    const t = ref.current.tasks.find((t) => t.id === key);
    if (!t) return;
    setId(key);
    setStage(at ?? t.stage);
    setMenu(null);
    if (options.asDrawer) {
      setDrawerId(key);
      setDrawerIntent(options.intent || null);
      if (view === 'detail') setView(taskOrigin);
    } else if (['personal', 'relations'].includes(view)) {
      setDrawerId(key);
      setDrawerIntent(options.intent || null);
      if (view === 'relations') setRelationsUi((previous) => ({ ...previous, selectedId: key }));
    } else {
      setDrawerId(null);
      setView('detail');
    }
  }
  // 资源抽屉跳任务：先关闭自身，避免顶层抽屉挡住目标内容。
  function openTaskFromResource(key) {
    setResourceView(null);
    openTask(key);
  }
  function openRelations(key) {
    if (view === 'workflow-config' && configurationDirty) {
      setPendingNavigation({ to: 'relations', root: key });
      return;
    }
    const current = ref.current.tasks.find((item) => item.id === key);
    if (!current) return;
    setId(key);
    setStage(current.stage);
    setRelationsUi((previous) => switchRelationRoot(previous, key));
    setRelationsDialogId(key);
  }
  function openRelationsFull(key) {
    const current = ref.current.tasks.find((item) => item.id === key);
    if (!current) return;
    setId(key);
    setStage(current.stage);
    setTaskOrigin('relations');
    setRelationsUi((previous) => switchRelationRoot(previous, key));
    setRelationsDialogId(null);
    closeDrawer();
    setView('relations');
    setMenu(null);
  }
  function showRelationExample() {
    const next = act({ type: 'ADD_RELATION_EXAMPLES' });
    if (next?.relationExampleRootId) openRelationsFull(next.relationExampleRootId);
  }
  function closeDrawer() {
    setDrawerId(null);
    setDrawerIntent(null);
  }
  function openFullTask() {
    closeDrawer();
    setView('detail');
  }
  function performGo(to, within = null, selected = null) {
    closeDrawer();
    if (['personal', 'tasks', 'relations'].includes(to)) setTaskOrigin(to);
    setView(to);
    setScope(within);
    setResource(selected);
    setMenu(null);
  }
  function go(to, within = null, selected = null) {
    if (view === 'workflow-config' && configurationDirty) {
      setPendingNavigation({ to, within, selected });
      return;
    }
    performGo(to, within, selected);
  }
  function openConfiguration(tab = 'types') {
    if (view === 'workflow-config') return;
    if (view !== 'workflow-config')
      configurationReturn.current = { view, modal, drawerId, scope, resource };
    setConfigurationTab(tab);
    setModal(null);
    closeDrawer();
    setMenu(null);
    setView('workflow-config');
  }
  function closeConfiguration() {
    const previous = configurationReturn.current;
    setConfigurationDirty(false);
    if (previous) {
      setView(previous.view);
      setModal(previous.modal);
      setDrawerId(previous.drawerId);
      setScope(previous.scope);
      setResource(previous.resource);
      configurationReturn.current = null;
    } else setView('personal');
  }
  function native(session) {
    setId(session.taskId);
    setStage(ref.current.tasks.find((t) => t.id === session.taskId)?.stage ?? 0);
    if (drawerId) setDrawerId(session.taskId);
    setModal({ type: 'native', sessionId: session.id });
  }
  function reset() {
    const initial = runtime.createInitialState();
    ref.current = initial;
    setModel(initial);
    openTask(initial.tasks[0].id);
    setModal(null);
    setToast('已恢复演示样例');
  }
  async function download(name, content, type = 'text/plain') {
    try {
      if (fileExport) {
        const filename = await fileExport.save({ name, content, mimeType: type });
        setToast(tr('已保存到下载文件夹：{name}', { name: filename }));
        return;
      }

      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([content], { type }));
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      const code = typeof error === 'string' ? error : error?.message;
      setToast(
        ['invalid-name', 'too-large', 'unavailable', 'write-failed'].includes(code)
          ? `export.${code}`
          : 'export.failed',
      );
    }
  }
  function openForTask(key, type, extra = {}) {
    const t = ref.current.tasks.find((t) => t.id === key);
    if (!t) return;
    setId(key);
    if (drawerId) setDrawerId(key);
    setStage(t.stage);
    setModal({ type, ...extra });
  }
  function showOrigin(entity) {
    setModal((previous) => ({
      type: 'origin',
      origin: entity?.origin,
      entityProject: entity?.project,
      sourceWorkItemType: entity?.sourceWorkItemType,
      itemTitle: entity?.title || entity?.name || '',
      returnTo: previous,
    }));
  }
  function openConnectors(key = null) {
    setMenu(null);
    setModal({ type: 'connector-catalog', initialConnectorId: key });
  }
  function manageConnectors(key = null) {
    setConnectorSelection(key);
    setModal(null);
    go('connectors');
  }
  function openConnectorTasks(key) {
    setFilter('sourced');
    setListUi((previous) => ({ ...previous, source: key, query: '', phase: 'all', board: false }));
    go('tasks');
  }
  const ctx = {
    model,
    task,
    taskOrigin,
    stage,
    setStage,
    run,
    act,
    showOrigin,
    openConnectors,
    openConfiguration,
    manageConnectors,
    openConnectorTasks,
    modal,
    setModal,
    openTask,
    openTaskFromResource,
    openRelations,
    openResource: (kind, id) => setResourceView({ kind, id }),
    showRelationExample,
    openForTask,
    go,
    native,
    download,
    reset,
    notify: setToast,
  };
  const drawerCtx = {
    ...ctx,
    openResource: (kind, id) => setResourceView({ kind, id }),
    go: (to, within, selected) => {
      if (['personal', 'tasks', 'relations'].includes(to)) closeDrawer();
      else if (to === 'sessions') setResourceView({ kind: 'session', id: selected });
      else if (to === 'branches') {
        const branch = ref.current.branches.find(
          (item) => item.taskId === (within || task.id) && item.id === selected,
        );
        if (branch) setResourceView({ kind: 'branch', id: branch.id });
        else setModal({ type: 'workspace' });
      } else go(to, within, selected);
    },
  };
  const drawerPlan = drawerId && drawerIntent ? getBoardMove(model, drawerId, drawerIntent) : null;
  const relationsDialogTask = relationsDialogId
    ? model.tasks.find((item) => item.id === relationsDialogId)
    : null;
  const nav = [
    ['personal', '看板', SquaresFour],
    ['tasks', '任务导航', FileText],
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          aria-label={tr('关于 Reed')}
          onClick={() => setModal({ type: 'about' })}
        >
          <img src="/assets/reed-wordmark.png" alt="Reed" />
        </button>
        <nav className="main-nav" aria-label={tr('主导航')}>
          {nav.map(([key, name, Icon]) => (
            <Fragment key={key}>
              <button
                key={key}
                aria-label={tr(name)}
                title={tr(name)}
                className={
                  (key === 'personal' && view === 'detail' && taskOrigin === 'personal') ||
                  (key === 'tasks' &&
                    ((view === 'detail' && taskOrigin === 'tasks') ||
                      (view === 'tasks' && filter !== 'attention'))) ||
                  (key === view && key !== 'tasks')
                    ? 'active'
                    : ''
                }
                onClick={() => {
                  if (key === 'tasks') {
                    setFilter('all');
                    go('tasks');
                  } else go(key);
                }}
              >
                <Icon size={21} />
                <span>{tr(name)}</span>
              </button>
              {key === 'tasks' && view === 'tasks' && (
                <div className="saved-views">
                  <button
                    onClick={() => setFilter('completed')}
                    className={filter === 'completed' ? 'active' : ''}
                  >
                    <CheckCircle size={16} />
                    {tr('已完成')}
                  </button>
                  <button
                    onClick={() => setFilter('archived')}
                    className={filter === 'archived' ? 'active' : ''}
                  >
                    <Archive size={16} />
                    {tr('归档')}
                  </button>
                </div>
              )}
            </Fragment>
          ))}
        </nav>
        <div className="project-nav">
          <p>{tr('项目')}</p>
          {model.projects.map((entry) => {
            const workspaces = model.agentWorkspaces.filter(
              (item) => item.status === 'linked' && item.projectId === entry.id,
            );
            const agentName = (id) => model.agents.find((agent) => agent.id === id)?.name ?? id;
            const expanded = expandedProjectId === entry.id;
            return (
              <div className="project-entry" key={entry.id}>
                <div className="project-entry-row">
                  <button
                    className={view === 'project' && projectViewId === entry.id ? 'active' : ''}
                    onClick={() => {
                      setProjectViewId(entry.id);
                      setExpandedProjectId(expanded && view === 'project' ? null : entry.id);
                      go('project');
                    }}
                  >
                    <Users size={20} />
                    {entry.name}
                  </button>
                  <button
                    className="icon-button project-edit"
                    aria-label={tr('编辑项目目录')}
                    title={tr('编辑项目目录')}
                    onClick={() => setModal({ type: 'project-directories', projectId: entry.id })}
                  >
                    <PencilSimple size={14} />
                  </button>
                </div>
                {expanded && (
                  <div className="project-sessions">
                    {workspaces.map((workspace) => {
                      const sessions = model.sessions.filter(
                        (session) => session.agentWorkspaceId === workspace.id,
                      );
                      if (!sessions.length) return null;
                      return (
                        <div key={workspace.id}>
                          <p className="project-agent-label">
                            {agentName(workspace.agentId)} · {sessions.length}
                          </p>
                          {sessions.map((session) => (
                            <button
                              key={session.id}
                              onClick={() => setResourceView({ kind: 'session', id: session.id })}
                            >
                              {session.title}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    {!workspaces.length && <p className="project-agent-label">{tr('暂无会话')}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          className={`connector-entry ${view === 'connectors' || modal?.type === 'connector-catalog' ? 'active' : ''}`}
          onClick={() => openConnectors()}
        >
          <Plugs size={18} />
          {tr('连接器')}
        </button>
        <SettingsControl
          theme={theme}
          setTheme={setTheme}
          dark={dark}
          openAbout={() => setModal({ type: 'about' })}
          openConfiguration={() => openConfiguration('types')}
        />
      </aside>
      <div className="app-workspace">
        <header className="topbar">
          {view === 'detail' ? (
            <TaskIdentity task={task} />
          ) : (
            <span>
              {view === 'personal'
                ? tr('看板')
                : view === 'relations'
                  ? tr('relation.title')
                  : view === 'tasks'
                    ? tr('任务导航')
                    : view === 'project'
                      ? tr('项目')
                      : view === 'workflow-config'
                        ? tr('config.types')
                        : view === 'connectors'
                          ? tr('连接器')
                          : tr('项目')}
            </span>
          )}
          <div className="topbar-actions">
            {view === 'detail' && (
              <IconButton
                label="在抽屉中打开"
                onClick={() => openTask(id, undefined, { asDrawer: true })}
              >
                <ArrowSquareIn size={18} />
              </IconButton>
            )}
            <button
              className="icon-button mobile-connector"
              aria-label={tr('连接器设置')}
              onClick={() => openConnectors()}
            >
              <Plugs size={18} />
            </button>
          </div>
        </header>
        <main className="workspace-content">
          {view === 'workflow-config' ? (
            <WorkflowConfigurationPage
              key={configurationTab}
              model={model}
              act={act}
              close={closeConfiguration}
              initialTab={configurationTab}
              typesOnly
              onDirtyChange={setConfigurationDirty}
            />
          ) : view === 'detail' ? (
            <TaskDetail ctx={ctx} saved={saved} />
          ) : view === 'personal' ? (
            <PersonalBoard ctx={ctx} boardUi={boardUi} setBoardUi={setBoardUi} />
          ) : view === 'relations' ? (
            <TaskRelationsPage
              ctx={ctx}
              relationsUi={relationsUi}
              setRelationsUi={setRelationsUi}
              onSwitchToDialog={() => {
                setRelationsDialogId(relationsUi.rootId || id);
                setView(taskOrigin);
              }}
            />
          ) : view === 'connectors' ? (
            <ConnectorSettings ctx={ctx} selectedId={connectorSelection} />
          ) : view === 'tasks' ? (
            <TaskList
              ctx={ctx}
              filter={filter}
              setFilter={setFilter}
              listUi={listUi}
              setListUi={setListUi}
            />
          ) : view === 'project' ? (
            <ProjectPage ctx={ctx} projectId={projectViewId} />
          ) : (
            <PersonalBoard ctx={ctx} boardUi={boardUi} setBoardUi={setBoardUi} />
          )}
        </main>
      </div>
      {pendingNavigation && (
        <Modal title={tr('selection.leaveTitle')} close={() => setPendingNavigation(null)}>
          <div className="modal-body">
            <p>{tr('selection.leaveHint')}</p>
          </div>
          <footer className="modal-actions">
            <button type="button" className="quiet" onClick={() => setPendingNavigation(null)}>
              {tr('selection.stay')}
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                const target = pendingNavigation;
                setPendingNavigation(null);
                setConfigurationDirty(false);
                performGo(target.to, target.within, target.selected);
                if (target.root) {
                  const current = ref.current.tasks.find((t) => t.id === target.root);
                  if (current) {
                    setId(current.id);
                    setStage(current.stage);
                    setTaskOrigin('relations');
                    setRelationsUi((previous) => switchRelationRoot(previous, current.id));
                  }
                }
              }}
            >
              {tr('selection.leave')}
            </button>
          </footer>
        </Modal>
      )}
      {resourceView && (
        <ResourceDrawer ctx={ctx} view={resourceView} close={() => setResourceView(null)} />
      )}
      {drawerId && (
        <TaskDrawer
          task={task}
          close={closeDrawer}
          openFullPage={openFullTask}
          intent={drawerPlan}
          notice={toast}
        >
          <TaskDetail key={task.id} ctx={drawerCtx} saved={saved} />
        </TaskDrawer>
      )}
      {relationsDialogTask && (
        <TaskRelationsDialog
          task={relationsDialogTask}
          close={() => setRelationsDialogId(null)}
          openFull={() => openRelationsFull(relationsDialogTask.id)}
        >
          <TaskRelationsPage
            ctx={{
              ...ctx,
              openTask: (key, at) => {
                setRelationsDialogId(null);
                openTask(key, at, { asDrawer: true });
              },
            }}
            relationsUi={relationsUi}
            setRelationsUi={setRelationsUi}
            embedded
          />
        </TaskRelationsDialog>
      )}
      <Dialogs ctx={['personal', 'relations'].includes(view) ? drawerCtx : ctx} />
      {toast && (
        <div role="status" className="toast">
          <Info size={18} />
          {tr(toast)}
        </div>
      )}
    </div>
  );
}
