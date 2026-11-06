import { describe, expect, it } from 'vitest';
import { createInitialState, reduce } from '../src/mock/model.js';
import { normalizeState } from '../src/mock/sources.js';
import { createMockWorkbenchRuntime } from '../src/mock';

const MEMBER_SERVICE_PATH = '/Users/demo/work/member-center/member-service';

function findCandidate(state: any) {
  return state.agentWorkspaces.find((workspace: any) => workspace.status === 'candidate');
}

describe('project workspace model', () => {
  it('models the sample project with directories, agent workspaces and re-parented sessions', () => {
    const state = createInitialState();
    const project = state.projects.find((item: any) => item.name === '成员中心');
    expect(project).toBeTruthy();

    const gitDirectory = state.directories.find(
      (item: any) => item.projectId === project.id && item.kind === 'git',
    );
    expect(gitDirectory.name).toBe('member-service');
    const branchNames = state.branches
      .filter((branch: any) => branch.directoryId === gitDirectory.id)
      .map((branch: any) => branch.name);
    expect(branchNames).toContain('main');
    expect(branchNames).toContain('reed/req-1039');

    const linked = state.agentWorkspaces.filter(
      (workspace: any) => workspace.status === 'linked' && workspace.projectId === project.id,
    );
    expect(linked.length).toBeGreaterThanOrEqual(2);
    expect(state.agents.map((agent: any) => agent.id)).toContain('codex');

    for (const session of state.sessions) {
      const workspace = state.agentWorkspaces.find(
        (item: any) => item.id === session.agentWorkspaceId,
      );
      expect(workspace?.projectId).toBe(project.id);
    }

    const task = state.tasks.find((item: any) => item.id === 'REQ-1039');
    expect(task.projectId).toBe(project.id);
    expect(task.project).toBe('成员中心');
    expect(task.workspace.directoryId).toBe(gitDirectory.id);
  });

  it('links a candidate workspace into the project by reusing shared directories', () => {
    const state = createInitialState();
    const project = state.projects[0];
    const candidate = findCandidate(state);
    const directoriesBefore = state.directories.length;

    const next: any = reduce(state, {
      type: 'LINK_AGENT_WORKSPACE',
      workspaceId: candidate.id,
      projectId: project.id,
    });
    const linked = next.agentWorkspaces.find((item: any) => item.id === candidate.id);
    expect(linked.status).toBe('linked');
    expect(linked.projectId).toBe(project.id);
    expect(linked.directoryIds).toContain(
      next.directories.find((item: any) => item.path === MEMBER_SERVICE_PATH).id,
    );
    // The shared git directory is reused, not duplicated.
    expect(next.directories.filter((item: any) => item.path === MEMBER_SERVICE_PATH)).toHaveLength(
      1,
    );
    expect(next.directories.length).toBe(directoriesBefore + 1);
  });

  it('ignores a candidate workspace without touching projects', () => {
    const state = createInitialState();
    const candidate = findCandidate(state);
    const next: any = reduce(state, {
      type: 'IGNORE_AGENT_WORKSPACE',
      workspaceId: candidate.id,
    });
    expect(next.agentWorkspaces.find((item: any) => item.id === candidate.id).status).toBe(
      'ignored',
    );
    expect(next.projects).toHaveLength(state.projects.length);
  });

  it('promotes a candidate to a new project and borrows the agent-side name', () => {
    const state = createInitialState();
    // 无目录交叉的候选才能提升为新项目；与既有项目共享目录的候选应走关联。
    const candidate = state.agentWorkspaces.find(
      (item: any) => item.id === 'ws-codex-infra' && item.status === 'candidate',
    );

    const next: any = reduce(state, {
      type: 'PROMOTE_WORKSPACE_PROJECT',
      workspaceId: candidate.id,
    });
    const workspace = next.agentWorkspaces.find((item: any) => item.id === candidate.id);
    const project = next.projects.find((item: any) => item.id === workspace.projectId);
    expect(project.name).toBe(candidate.agentSideName);
    expect(workspace.directoryIds.length).toBeGreaterThan(0);
    expect(
      next.branches.some(
        (branch: any) => branch.name === 'main' && branch.directoryId === workspace.directoryIds[0],
      ),
    ).toBe(true);
  });

  it('rejects linking when a directory already belongs to another project', () => {
    const state = createInitialState();
    const rival: any = reduce(state, { type: 'CREATE_PROJECT', name: '基础设施' });
    const rivalProject = rival.projects.find((item: any) => item.name === '基础设施');
    const candidate = findCandidate(rival);
    const before = structuredClone(rival);

    expect(() =>
      reduce(rival, {
        type: 'LINK_AGENT_WORKSPACE',
        workspaceId: candidate.id,
        projectId: rivalProject.id,
      }),
    ).toThrow(/已属于其他项目/);
    // 冲突即整体失败：不残留目录、分支或工作区变更。
    expect(rival).toEqual(before);
  });

  it('rejects promoting a candidate whose paths belong to another project without residue', () => {
    const state = createInitialState();
    const before = structuredClone(state);
    expect(() =>
      reduce(state, { type: 'PROMOTE_WORKSPACE_PROJECT', workspaceId: 'ws-zcode-cleanup' }),
    ).toThrow(/已属于其他项目/);
    expect(state).toEqual(before);
  });

  it('validates every candidate path before linking, leaving no partial directories', () => {
    const state = createInitialState();
    const rival: any = reduce(state, { type: 'CREATE_PROJECT', name: '基础设施' });
    const rivalProject = rival.projects.find((item: any) => item.name === '基础设施');
    const corrupted = JSON.parse(JSON.stringify(rival));
    corrupted.agentWorkspaces.find((item: any) => item.id === 'ws-zcode-cleanup').paths = [
      { path: '/mock/new/alpha', kind: 'git' },
      { path: MEMBER_SERVICE_PATH, kind: 'git' },
    ];
    expect(() =>
      reduce(corrupted, {
        type: 'LINK_AGENT_WORKSPACE',
        workspaceId: 'ws-zcode-cleanup',
        projectId: rivalProject.id,
      }),
    ).toThrow(/已属于其他项目/);
  });

  it('seeds a main branch when a git directory is added and keeps directories unique', () => {
    const state = createInitialState();
    const project = state.projects[0];
    const next: any = reduce(state, {
      type: 'ADD_DIRECTORY',
      projectId: project.id,
      path: '/Users/demo/work/member-center/portal-web/',
      kind: 'git',
    });
    const directory = next.directories.find(
      (item: any) => item.path === '/Users/demo/work/member-center/portal-web',
    );
    expect(directory.name).toBe('portal-web');
    expect(
      next.branches.some(
        (branch: any) => branch.directoryId === directory.id && branch.name === 'main',
      ),
    ).toBe(true);
  });

  it('auto-detects the directory kind when the user only provides a path', () => {
    const state = createInitialState();
    const project = state.projects[0];
    const next: any = reduce(state, {
      type: 'ADD_DIRECTORY',
      projectId: project.id,
      path: '/Users/demo/work/member-center/release-notes',
    });
    const detected = next.directories.find(
      (item: any) => item.path === '/Users/demo/work/member-center/release-notes',
    );
    expect(detected.kind).toBe('plain');

    const withRepo: any = reduce(state, {
      type: 'ADD_DIRECTORY',
      projectId: project.id,
      path: '/Users/demo/work/member-center/portal-web',
    });
    expect(withRepo.directories.find((item: any) => item.path.includes('portal-web')).kind).toBe(
      'git',
    );
    expect(next.branches.some((branch: any) => branch.directoryId === detected.id)).toBe(false);
  });

  it('registers devices and tags every workspace and session with an origin device', () => {
    const state = createInitialState();
    expect(state.devices).toEqual([
      { id: 'device-this', name: '本机', isLocal: true },
      { id: 'device-mbp', name: 'MacBook Pro', isLocal: false },
    ]);
    for (const workspace of state.agentWorkspaces) {
      expect(typeof workspace.deviceId).toBe('string');
    }
    const remoteWorkspace = state.agentWorkspaces.find((item: any) => item.id === 'ws-codex-mbp');
    expect(remoteWorkspace?.deviceId).toBe('device-mbp');
    expect(remoteWorkspace?.status).toBe('linked');
    for (const session of state.sessions) {
      expect(typeof session.originDeviceId).toBe('string');
    }
    const remoteSession = state.sessions.find((item: any) => item.id === 'session-mbp-review');
    expect(remoteSession?.originDeviceId).toBe('device-mbp');
    expect(remoteSession?.taskId).toBeTruthy();
  });
});

describe('task identity mirrors', () => {
  const taskOf = (state: any, id: string) => state.tasks.find((item: any) => item.id === id);
  const withSameNameDirectories = () => {
    let state: any = createInitialState();
    const center = state.projects.find((item: any) => item.name === '成员中心');
    state = reduce(state, { type: 'ADD_DIRECTORY', projectId: center.id, path: '/mock/a/backend' });
    state = reduce(state, { type: 'PROMOTE_WORKSPACE_PROJECT', workspaceId: 'ws-codex-infra' });
    const infra = state.projects.find((item: any) => item.name === 'infra-scripts');
    state = reduce(state, { type: 'ADD_DIRECTORY', projectId: infra.id, path: '/mock/b/backend' });
    return { state, infra };
  };

  it('keeps a cleared project assignment across later actions and reload', () => {
    const state = createInitialState();
    const next: any = reduce(state, {
      type: 'UPDATE_TASK_CONTEXT',
      taskId: 'LOCAL-1',
      project: '',
    });
    expect(taskOf(next, 'LOCAL-1').project).toBe('');
    expect(taskOf(next, 'LOCAL-1').projectId).toBeNull();
    const later: any = reduce(next, { type: 'START_TASK', taskId: 'LOCAL-1' });
    expect(taskOf(later, 'LOCAL-1').project).toBe('');
    const reloaded = normalizeState(JSON.parse(JSON.stringify(next)));
    expect(taskOf(reloaded, 'LOCAL-1').project).toBe('');
    expect(taskOf(reloaded, 'LOCAL-1').projectId).toBeNull();
  });

  it('moves a task to another project, creating it, and keeps the assignment', () => {
    const state = createInitialState();
    const moved: any = reduce(state, {
      type: 'UPDATE_TASK_CONTEXT',
      taskId: 'LOCAL-1',
      project: '新归属',
    });
    const project = moved.projects.find((item: any) => item.name === '新归属');
    expect(project).toBeTruthy();
    expect(taskOf(moved, 'LOCAL-1').projectId).toBe(project.id);
    const later: any = reduce(moved, { type: 'START_TASK', taskId: 'LOCAL-1' });
    expect(taskOf(later, 'LOCAL-1').project).toBe('新归属');
    const reloaded = normalizeState(JSON.parse(JSON.stringify(moved)));
    expect(taskOf(reloaded, 'LOCAL-1').projectId).toBe(project.id);
  });

  it('resolves the repo directory inside the task project at creation time', () => {
    const { state, infra } = withSameNameDirectories();
    const created: any = reduce(state, {
      type: 'CREATE_TASK',
      title: '跨项目同名仓库',
      taskType: 'development',
      project: 'infra-scripts',
      repo: 'backend',
    });
    const task = created.tasks.at(-1);
    const directory = created.directories.find(
      (item: any) => item.id === task.workspace.directoryId,
    );
    expect(directory.path).toBe('/mock/b/backend');
    expect(directory.projectId).toBe(infra.id);
  });

  it.each(['running', 'ended', 'workspace'])(
    'protects the repository identity when moving a task with %s resources',
    (resource) => {
      let { state, infra } = withSameNameDirectories();
      state = reduce(state, {
        type: 'CREATE_TASK',
        title: '保留已有仓库归属',
        taskType: 'documentation',
        project: '成员中心',
        repo: 'backend',
      });
      const id = state.tasks.at(-1).id;
      state = reduce(state, { type: 'START_TASK', taskId: id });
      if (resource === 'workspace') {
        state = reduce(state, { type: 'PREPARE_WORKSPACE', taskId: id });
      } else {
        state = reduce(state, { type: 'BIND_SESSION', taskId: id, host: 'Codex' });
        state = reduce(state, { type: 'START_STAGE', taskId: id });
        if (resource === 'ended')
          state = reduce(state, { type: 'FINISH_STAGE', taskId: id, outcome: 'review' });
      }
      const before = structuredClone(state);
      for (const project of [infra.name, '']) {
        expect(() => reduce(state, { type: 'UPDATE_TASK_CONTEXT', taskId: id, project })).toThrow(
          /不能更换仓库/,
        );
        expect(state).toEqual(before);
      }
    },
  );

  it('allows moving a same-name repository before any execution resources are linked', () => {
    let { state, infra } = withSameNameDirectories();
    state = reduce(state, {
      type: 'CREATE_TASK',
      title: '尚未执行的项目迁移',
      project: '成员中心',
      repo: 'backend',
    });
    const id = state.tasks.at(-1).id;
    const moved: any = reduce(state, {
      type: 'UPDATE_TASK_CONTEXT',
      taskId: id,
      project: infra.name,
    });
    const task = taskOf(moved, id);
    expect(task.projectId).toBe(infra.id);
    expect(moved.directories.find((item: any) => item.id === task.workspace.directoryId).path).toBe(
      '/mock/b/backend',
    );
    expect(normalizeState(moved).tasks.find((item: any) => item.id === id)).toEqual(task);
    expect(moved.sessions).toEqual(state.sessions);
    expect(moved.branches).toEqual(state.branches);
  });

  it('does not backfill a repo identity for ungrouped tasks when directories are ambiguous', () => {
    const { state } = withSameNameDirectories();
    const created: any = reduce(state, {
      type: 'CREATE_TASK',
      title: '未归组同名仓库',
      taskType: 'uncategorized',
      project: '',
      repo: 'backend',
    });
    const id = created.tasks.at(-1).id;
    const next: any = reduce(created, { type: 'START_TASK', taskId: id });
    expect(taskOf(next, id).workspace.directoryId ?? null).toBeNull();
  });

  it('clears the repo identity with the repo and keeps it cleared after reload', () => {
    let state: any = createInitialState();
    state = reduce(state, {
      type: 'CREATE_TASK',
      title: '仓库身份',
      taskType: 'development',
      project: '成员中心',
      repo: 'member-service',
    });
    const id = state.tasks.at(-1).id;
    expect(taskOf(state, id).workspace.directoryId).toBe('dir-member-service');
    const cleared: any = reduce(state, { type: 'UPDATE_TASK_CONTEXT', taskId: id, repo: '' });
    expect(taskOf(cleared, id).repo).toBe('');
    expect(taskOf(cleared, id).workspace.directoryId ?? null).toBeNull();
    const later: any = reduce(cleared, { type: 'START_TASK', taskId: id });
    expect(taskOf(later, id).repo).toBe('');
    const reloaded = normalizeState(JSON.parse(JSON.stringify(cleared)));
    expect(taskOf(reloaded, id).repo).toBe('');
    expect(taskOf(reloaded, id).workspace.directoryId ?? null).toBeNull();
  });

  it('drops directory identities pointing outside the task project when loading', () => {
    const { state } = withSameNameDirectories();
    const created: any = reduce(state, {
      type: 'CREATE_TASK',
      title: '旧草稿身份修复',
      taskType: 'development',
      project: 'infra-scripts',
      repo: 'backend',
    });
    const id = created.tasks.at(-1).id;
    const wrong = created.directories.find((item: any) => item.path === '/mock/a/backend').id;
    const corrupted = JSON.parse(JSON.stringify(created));
    taskOf(corrupted, id).workspace.directoryId = wrong;
    const healed = normalizeState(corrupted);
    const healedTask = taskOf(healed, id);
    const healedDirectory = healed.directories.find(
      (item: any) => item.id === healedTask.workspace.directoryId,
    );
    expect(healedDirectory.path).toBe('/mock/b/backend');
  });

  it('creates a project when a task is created with a new project name', () => {
    const state: any = reduce(createInitialState(), {
      type: 'CREATE_TASK',
      title: '新项目任务',
      taskType: 'uncategorized',
      project: '全新项目',
    });
    const project = state.projects.find((item: any) => item.name === '全新项目');
    expect(project).toBeTruthy();
    expect(taskOf(state, state.tasks.at(-1).id).projectId).toBe(project.id);
  });

  it('restores missing local projects from existing v5 drafts without changing other origins', () => {
    let draft: any = createInitialState();
    const ids: string[] = [];
    for (const title of ['旧项目任务一', '旧项目任务二']) {
      draft = reduce(draft, { type: 'CREATE_TASK', title, project: '保留的旧项目' });
      ids.push(draft.tasks.at(-1).id);
    }
    draft = reduce(draft, { type: 'ADD_TASK_COMMENT', taskId: ids[0], body: '保留已有讨论' });
    draft = reduce(draft, { type: 'CREATE_TASK', title: '未归组的旧任务', project: '' });
    const ungroupedId = draft.tasks.at(-1).id;
    // 修复前的合法 v5 保存形态：本地项目只有名称，没有实体或关联 ID。
    draft.projects = draft.projects.filter((item: any) => item.name !== '保留的旧项目');
    for (const id of ids) taskOf(draft, id).projectId = null;
    const external = taskOf(draft, 'REQ-1042');
    external.project = '外部来源项目';
    external.projectId = null;
    let persisted = JSON.stringify({ version: 5, model: draft });
    const runtime = createMockWorkbenchRuntime({
      storage: {
        getItem: () => persisted,
        setItem: (_key: string, value: string) => {
          persisted = value;
        },
      },
    });
    const loaded: any = runtime.load();
    const project = loaded.projects.find((item: any) => item.name === '保留的旧项目');
    expect(project).toBeTruthy();
    for (const id of ids) expect(taskOf(loaded, id).projectId).toBe(project.id);
    expect(taskOf(loaded, ids[0]).comments).toEqual(taskOf(draft, ids[0]).comments);
    expect(taskOf(loaded, ungroupedId).projectId).toBeNull();
    expect(taskOf(loaded, 'REQ-1042').projectId).toBeNull();
    expect(loaded.projects.some((item: any) => item.name === '外部来源项目')).toBe(false);
    expect(loaded.projects).toHaveLength(draft.projects.length + 1);
    const edited: any = runtime.reduce(loaded, {
      type: 'UPDATE_TASK_CONTEXT',
      taskId: ids[0],
      project: '保留的旧项目',
    });
    expect(taskOf(edited, ids[0]).projectId).toBe(project.id);
    expect(runtime.save(edited)).toBe(true);
    expect(runtime.load()).toEqual(edited);
  });

  it('restores shared project names consistently when external tasks precede local tasks', () => {
    const draft: any = createInitialState();
    for (const id of ['REQ-1042', 'LOCAL-1']) {
      const task = taskOf(draft, id);
      task.project = '旧草稿中的共同项目';
      task.projectId = null;
    }
    const runtime = createMockWorkbenchRuntime({
      storage: {
        getItem: () => JSON.stringify({ version: 5, model: draft }),
        setItem: () => {},
      },
    });
    const restored: any = runtime.load();
    const project = restored.projects.find((item: any) => item.name === '旧草稿中的共同项目');
    expect(project).toBeTruthy();
    expect(taskOf(restored, 'REQ-1042').projectId).toBe(project.id);
    expect(taskOf(restored, 'LOCAL-1').projectId).toBe(project.id);
    expect(normalizeState(restored)).toEqual(restored);

    const reversed = normalizeState({ ...draft, tasks: [...draft.tasks].reverse() });
    expect(taskOf(reversed, 'REQ-1042').projectId).toBe(project.id);
    expect(reversed.projects).toEqual(restored.projects);
  });

  it('gives relation example sessions an agent workspace in their project', () => {
    const state: any = reduce(createInitialState(), { type: 'ADD_RELATION_EXAMPLES' });
    const session = state.sessions.find((item: any) => item.title === '成员补偿 · 方案讨论');
    expect(session.agentWorkspaceId).toBeTruthy();
    const workspace = state.agentWorkspaces.find(
      (item: any) => item.id === session.agentWorkspaceId,
    );
    expect(workspace.projectId).toBe(
      state.projects.find((item: any) => item.name === '关系视图示例').id,
    );
  });

  it('rejects binding sessions for hosts that are not registered', () => {
    let state: any = createInitialState();
    state = reduce(state, {
      type: 'CREATE_TASK',
      title: '接入验证',
      taskType: 'uncategorized',
      project: '',
    });
    const id = state.tasks.at(-1).id;
    state = reduce(state, { type: 'START_TASK', taskId: id });
    const before = state.sessions.length;
    expect(() => reduce(state, { type: 'BIND_SESSION', taskId: id, host: 'DSH' })).toThrow(/宿主/);
    expect(state.sessions).toHaveLength(before);
  });

  it('falls back to the remodeled samples for legacy drafts and round-trips version 5', () => {
    const legacy = {
      version: 4,
      model: { tasks: [{ id: 'X', title: '旧任务', project: '成员中心' }] },
    };
    const legacyStorage = {
      getItem: () => JSON.stringify(legacy),
      setItem: () => {},
    };
    const legacyRuntime = createMockWorkbenchRuntime({ storage: legacyStorage });
    const loaded: any = legacyRuntime.load();
    expect(loaded.projects?.length).toBeGreaterThan(0);
    expect(loaded.agentWorkspaces?.length).toBeGreaterThan(0);

    let persisted = '';
    const state = createInitialState();
    const roundTripStorage = {
      getItem: () => persisted,
      setItem: (_key: string, value: string) => {
        persisted = value;
      },
    };
    const runtime = createMockWorkbenchRuntime({ storage: roundTripStorage });
    expect(runtime.save(state)).toBe(true);
    const restored: any = runtime.load();
    expect(restored.projects).toHaveLength(state.projects.length);
    expect(restored.agentWorkspaces).toHaveLength(state.agentWorkspaces.length);
    expect(JSON.parse(persisted).version).toBe(5);
  });
});
