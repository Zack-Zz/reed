import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkbenchRoot } from '../src';
import { ProjectPage } from '../src/workbench/pages/ProjectPage';
import { ResourceDrawer } from '../src/workbench/ResourceDrawer';
import { ProjectDirectoryDialog } from '../src/workbench/ProjectDirectoryDialog';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { createMockWorkbenchRuntime } from '../src/mock';

afterEach(() => vi.unstubAllGlobals());

function pageContext() {
  const runtime = createMockWorkbenchRuntime();
  const model: any = runtime.createInitialState();
  const ctx: any = {
    model,
    task: model.tasks[0],
    act: vi.fn(() => model),
    run: vi.fn(() => true),
    openResource: vi.fn(),
    openTask: vi.fn(),
    go: vi.fn(),
    setModal: vi.fn(),
    native: vi.fn(),
    showOrigin: vi.fn(),
  };
  return { runtime, model, ctx };
}

function renderWithContext(node: any, runtime: any, ctx: any, extra: any = null) {
  return renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={runtime}>
      <I18nProvider initialLocale="zh-CN">{node}</I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
}

describe('project view', () => {
  it('shows directories with repo branches, agent sessions, candidates and project tasks', () => {
    const { runtime, ctx } = pageContext();
    const html = renderWithContext(
      <ProjectPage ctx={ctx} projectId="project-member-center" />,
      runtime,
      ctx,
    );

    // 目录与工程
    expect(html).toContain('目录与工程');
    expect(html).toContain('member-service');
    expect(html).toContain('reed/req-1039');
    expect(html).toContain('docs');
    // Agent 与会话（按工作区分组，含 Agent 侧名称命名空间）
    expect(html).toContain('Agent 与会话');
    expect(html).toContain('Codex');
    expect(html).toContain('Claude Code');
    expect(html).toContain('成员服务');
    expect(html).toContain('权限刷新 · 验证');
    // 会话行带分支与任务标注
    expect(html).toContain('成员角色变更后刷新权限');
    // 候选工作区与收敛操作
    expect(html).toContain('发现的工作区');
    expect(html).toContain('member-center-cleanup');
    expect(html).toContain('关联到本项目');
    expect(html).toContain('提升为新项目');
    expect(html).toContain('忽略');
    // 项目任务
    expect(html).toContain('项目任务');
    expect(html).toContain('成员导入失败后自动补偿');
  });

  it('keeps the shell navigation free of standalone sessions and branches views', () => {
    vi.stubGlobal('location', { search: '' });
    const runtime = createMockWorkbenchRuntime({
      storage: { getItem: () => null, setItem: vi.fn() },
    });
    const html = renderToStaticMarkup(<WorkbenchRoot runtime={runtime} initialLocale="zh-CN" />);
    expect(html).not.toContain('aria-label="会话"');
    expect(html).not.toContain('aria-label="分支"');
    expect(html).toContain('project-nav');
    expect(html).toContain('成员中心');
  });

  it('manages project directories from a dialog with auto-detected kinds and a directory picker', () => {
    const { runtime, ctx } = pageContext();
    ctx.setModal = vi.fn();
    const html = renderWithContext(
      <ProjectDirectoryDialog ctx={ctx} projectId="project-member-center" close={vi.fn()} />,
      runtime,
      ctx,
    );
    expect(html).toContain('member-service');
    expect(html).toContain('Git 工程');
    expect(html).toContain('docs');
    expect(html).toContain('选择目录');
    expect(html).not.toContain('Git 工程</option>');
    expect(html).toContain('自动识别');
  });

  it('marks remote sessions as device-bound and disables opening them natively', () => {
    const { runtime, ctx } = pageContext();
    const remoteHtml = renderWithContext(
      <ResourceDrawer
        ctx={ctx}
        view={{ kind: 'session', id: 'session-mbp-review' }}
        close={vi.fn()}
      />,
      runtime,
      ctx,
    );
    expect(remoteHtml).toContain('补偿方案 · 交叉评审');
    expect(remoteHtml).toContain('MacBook Pro');
    expect(remoteHtml).toContain('原生会话保存在');
    expect(remoteHtml).toContain('disabled');
    const localHtml = renderWithContext(
      <ResourceDrawer
        ctx={ctx}
        view={{ kind: 'session', id: 'session-requirement' }}
        close={vi.fn()}
      />,
      runtime,
      ctx,
    );
    expect(localHtml).not.toContain('原生会话保存在');
    const pageHtml = renderWithContext(
      <ProjectPage ctx={ctx} projectId="project-member-center" />,
      runtime,
      ctx,
    );
    expect(pageHtml).toContain('MacBook Pro');
    expect(pageHtml).toContain('补偿方案 · 交叉评审');
  });

  it('stacks each directory name above its path and exposes full texts as hover tooltips', () => {
    const { runtime, ctx } = pageContext();
    ctx.setModal = vi.fn();
    const html = renderWithContext(
      <ProjectDirectoryDialog ctx={ctx} projectId="project-member-center" close={vi.fn()} />,
      runtime,
      ctx,
    );
    expect(html).toContain('<strong class="project-directory-name" title="member-service">');
    expect(html).toContain('<code title="/Users/demo/work/member-center/member-service">');
    expect(html).not.toContain('<span>member-service');
  });

  it('exposes agent sessions as second-level entries under the sidebar project menu', () => {
    vi.stubGlobal('location', { search: '' });
    const runtime = createMockWorkbenchRuntime({
      storage: { getItem: () => null, setItem: vi.fn() },
    });
    const html = renderToStaticMarkup(<WorkbenchRoot runtime={runtime} initialLocale="zh-CN" />);
    expect(html).toContain('project-edit');
    expect(html).toContain('编辑项目目录');
  });

  it('renders the shared resource drawer for sessions and branches', () => {
    const { runtime, ctx } = pageContext();
    const sessionHtml = renderWithContext(
      <ResourceDrawer ctx={ctx} view={{ kind: 'session', id: 'session-verify' }} close={vi.fn()} />,
      runtime,
      ctx,
    );
    expect(sessionHtml).toContain('权限刷新 · 验证');
    expect(sessionHtml).toContain('开发分支');
    expect(sessionHtml).toContain('reed/req-1039');
    expect(sessionHtml).toContain('打开原生会话');

    const branchHtml = renderWithContext(
      <ResourceDrawer ctx={ctx} view={{ kind: 'branch', id: 'branch-1040' }} close={vi.fn()} />,
      runtime,
      ctx,
    );
    expect(branchHtml).toContain('reed/req-1040');
    expect(branchHtml).toContain('打开工作区');
  });
});
