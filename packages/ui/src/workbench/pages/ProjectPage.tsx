import { useState } from 'react';
import {
  ChatCircleDots,
  FolderSimple,
  GitBranch,
  PencilSimple,
  Plus,
  Users,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n.jsx';
import { activity, Status, taskStatus } from '../ui.jsx';

/** 项目视图：目录与工程、Agent 会话、候选工作区收敛与项目任务的唯一入口。 */
interface ProjectPageCtx {
  model: any;
  act: (
    action: Record<string, unknown>,
    message?: string,
    onError?: (message: string) => void,
  ) => unknown;
  openResource?: (kind: 'session' | 'branch', id: string) => void;
  openTask?: (id: string) => void;
  setModal?: (modal: unknown) => void;
  go?: (to: string) => void;
}
interface ProjectPageProps {
  ctx: ProjectPageCtx;
  projectId: string | null;
}
export function ProjectPage({ ctx, projectId }: ProjectPageProps) {
  const { t } = useI18n();
  const { model, act } = ctx;
  const project = model.projects.find((item: any) => item.id === projectId) ?? model.projects[0];
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  if (!project) {
    return (
      <section className="page project-page">
        <header className="page-heading">
          <div>
            <h1>{t('项目')}</h1>
            <p>{t('尚无已建模项目；从看板创建任务后可在此维护工作区。')}</p>
          </div>
        </header>
      </section>
    );
  }
  const directories = model.directories.filter((item: any) => item.projectId === project.id);
  const branchesOf = (directoryId: string) =>
    model.branches.filter((branch: any) => branch.directoryId === directoryId);
  const workspaces = model.agentWorkspaces.filter(
    (item: any) => item.status === 'linked' && item.projectId === project.id,
  );
  const candidates = model.agentWorkspaces.filter((item: any) => item.status === 'candidate');
  const tasks = model.tasks.filter((item: any) => item.projectId === project.id);
  const agentName = (id: string) => model.agents.find((agent: any) => agent.id === id)?.name ?? id;
  const localDeviceId = model.devices?.find((device: any) => device.isLocal)?.id ?? 'device-this';
  const deviceName = (id: string) =>
    model.devices?.find((device: any) => device.id === id)?.name ?? id;
  const taskOf = (id: string | null) => model.tasks.find((item: any) => item.id === id);
  const sessionOf = (id: string | null) => model.sessions.find((item: any) => item.id === id);
  const sharesDirectory = (candidate: any) =>
    (candidate.paths ?? []).some((entry: any) =>
      directories.some((directory: any) => directory.path === entry.path),
    );
  const submitRename = () => {
    const name = nameDraft.trim();
    if (!name || name === project.name) {
      setRenaming(false);
      return;
    }
    act({ type: 'RENAME_PROJECT', projectId: project.id, name }, '项目已重命名');
    setRenaming(false);
  };
  return (
    <section className="page project-page">
      <header className="page-heading">
        <div>
          {renaming ? (
            <div className="project-rename">
              <input
                autoFocus
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitRename();
                  if (event.key === 'Escape') setRenaming(false);
                }}
                aria-label={t('项目名称')}
              />
              <button className="primary small" onClick={submitRename}>
                {t('保存')}
              </button>
              <button className="quiet small" onClick={() => setRenaming(false)}>
                {t('取消')}
              </button>
            </div>
          ) : (
            <h1>
              {project.name}
              <button
                className="icon-button"
                aria-label={t('重命名项目')}
                onClick={() => {
                  setNameDraft(project.name);
                  setRenaming(true);
                }}
              >
                <PencilSimple size={16} />
              </button>
            </h1>
          )}
          <p>{t('一个项目对应一个工作区：目录、Agent 会话与任务在此汇聚。')}</p>
        </div>
      </header>

      <section className="project-section">
        <div className="project-section-head">
          <h2>{t('目录与工程')}</h2>
          <button
            className="quiet small"
            onClick={() => ctx.setModal?.({ type: 'project-directories', projectId: project.id })}
          >
            <Plus size={14} />
            {t('关联目录')}
          </button>
        </div>
        {directories.map((directory: any) => (
          <div className="project-directory" key={directory.id}>
            <div className="project-directory-name">
              {directory.kind === 'git' ? <GitBranch size={17} /> : <FolderSimple size={17} />}
              <strong>{directory.name}</strong>
              <small>{directory.kind === 'git' ? t('Git 工程') : t('普通目录')}</small>
              <code>{directory.path}</code>
            </div>
            {directory.kind === 'git' && (
              <ul className="project-branch-list">
                {branchesOf(directory.id).map((branch: any) => {
                  const branchTask = taskOf(branch.taskId);
                  const branchSession = sessionOf(branch.sessionId);
                  return (
                    <li key={branch.id}>
                      <button
                        className="project-branch-row"
                        onClick={() => ctx.openResource?.('branch', branch.id)}
                      >
                        <code>{branch.name}</code>
                        <small>
                          {branchTask ? `${branchTask.id} · ${branchTask.title}` : t('主干')}
                          {branchSession ? ` · ${branchSession.title}` : ''}
                        </small>
                        <span className="muted">
                          {branch.status === 'busy' ? t('当前会话使用中') : t('工作区已就绪')}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
        {!directories.length && <p className="muted">{t('尚未关联目录。')}</p>}
      </section>

      <section className="project-section">
        <div className="project-section-head">
          <h2>{t('Agent 与会话')}</h2>
        </div>
        {workspaces.map((workspace: any) => (
          <div className="project-agent-group" key={workspace.id}>
            <div className="project-agent-name">
              <ChatCircleDots size={16} />
              <strong>{agentName(workspace.agentId)}</strong>
              <small>
                {workspace.agentSideName}
                {workspace.deviceId && workspace.deviceId !== localDeviceId
                  ? ` · ${deviceName(workspace.deviceId)}`
                  : ''}
              </small>
            </div>
            {model.sessions
              .filter((session: any) => session.agentWorkspaceId === workspace.id)
              .map((session: any) => {
                const sessionTask = taskOf(session.taskId);
                return (
                  <button
                    className="project-session-row"
                    key={session.id}
                    onClick={() => ctx.openResource?.('session', session.id)}
                  >
                    <span>
                      <strong>{session.title}</strong>
                      <small>
                        {session.branch ? session.branch : t('此阶段未使用隔离分支')}
                        {sessionTask ? ` · ${sessionTask.id} · ${t(taskStatus(sessionTask))}` : ''}
                        {session.originDeviceId && session.originDeviceId !== localDeviceId
                          ? ` · ${t('来源设备')} ${deviceName(session.originDeviceId)}`
                          : ''}
                      </small>
                    </span>
                    <Status
                      value={session.status}
                      text={activity[session.status as keyof typeof activity]}
                    />
                  </button>
                );
              })}
          </div>
        ))}
        {!workspaces.length && <p className="muted">{t('尚无 Agent 工作区关联到此项目。')}</p>}
      </section>

      <section className="project-section">
        <div className="project-section-head">
          <h2>{t('发现的工作区')}</h2>
        </div>
        {candidates.map((candidate: any) => (
          <div className="project-candidate" key={candidate.id}>
            <div className="project-agent-name">
              <Users size={16} />
              <strong>{agentName(candidate.agentId)}</strong>
              <small>{candidate.agentSideName}</small>
            </div>
            <p className="muted">
              {sharesDirectory(candidate) ? t('共享目录，建议关联到本项目') : t('无共享目录')}
            </p>
            <div className="project-candidate-actions">
              {sharesDirectory(candidate) && (
                <button
                  className="primary small"
                  onClick={() =>
                    act(
                      {
                        type: 'LINK_AGENT_WORKSPACE',
                        workspaceId: candidate.id,
                        projectId: project.id,
                      },
                      '已关联 Agent 工作区',
                    )
                  }
                >
                  {t('关联到本项目')}
                </button>
              )}
              <button
                className="quiet small"
                onClick={() =>
                  act(
                    { type: 'PROMOTE_WORKSPACE_PROJECT', workspaceId: candidate.id },
                    '已创建新项目',
                  )
                }
              >
                {t('提升为新项目')}
              </button>
              <button
                className="quiet small"
                onClick={() => act({ type: 'IGNORE_AGENT_WORKSPACE', workspaceId: candidate.id })}
              >
                {t('忽略')}
              </button>
            </div>
          </div>
        ))}
        {!candidates.length && <p className="muted">{t('暂无待处理的工作区候选。')}</p>}
      </section>

      <section className="project-section">
        <div className="project-section-head">
          <h2>
            {t('项目任务')} · {tasks.length}
          </h2>
          <button className="quiet small" onClick={() => ctx.go?.('tasks')}>
            {t('在任务列表中查看')}
          </button>
        </div>
        <div className="project-task-list">
          {tasks.map((item: any) => (
            <button
              className="project-task-row"
              key={item.id}
              onClick={() => ctx.openTask?.(item.id)}
            >
              <span className="mono">{item.id}</span>
              <strong>{item.title}</strong>
              <Status value={item.status} text={taskStatus(item)} />
            </button>
          ))}
          {!tasks.length && <p className="muted">{t('此项目暂无任务。')}</p>}
        </div>
      </section>
    </section>
  );
}
