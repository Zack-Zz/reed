// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkbenchRoot } from '../src';
import { ResourceDrawer } from '../src/workbench/ResourceDrawer';
import { ProjectDirectoryDialog } from '../src/workbench/ProjectDirectoryDialog';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { createMockWorkbenchRuntime } from '../src/mock';

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  // jsdom 未实现滚动 API；App 挂载时的视图切换会调用 scrollTo。
  Element.prototype.scrollTo = vi.fn();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const click = (element: Element) =>
  act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));

const buttonWithText = (scope: Element, text: string) =>
  [...scope.querySelectorAll('button')].find((button) => button.textContent?.includes(text));

describe('resource drawer task navigation', () => {
  it('closes the resource drawer and opens the owner task in the shell', async () => {
    const runtime = createMockWorkbenchRuntime({
      storage: { getItem: () => null, setItem: () => {} },
    });
    await act(async () => root!.render(<WorkbenchRoot runtime={runtime} initialLocale="zh-CN" />));
    await click(container.querySelector('.project-entry-row button')!);
    const branchRow = [...container.querySelectorAll('.project-branch-row')].find((row) =>
      row.textContent?.includes('reed/req-1039'),
    )!;
    expect(branchRow).toBeTruthy();
    await click(branchRow);
    expect(container.querySelector('.resource-drawer')).toBeTruthy();
    await click(buttonWithText(container.querySelector('.resource-drawer')!, '查看任务')!);
    expect(container.querySelector('.resource-drawer')).toBeNull();
    const content = container.querySelector('.workspace-content')?.textContent ?? '';
    expect(content).toContain('成员角色变更后刷新权限');
  });

  it('routes the drawer task link through the resource-aware entry', async () => {
    const runtime = createMockWorkbenchRuntime();
    const model: any = runtime.createInitialState();
    const branch = model.branches.find((item: any) => item.taskId === 'REQ-1039');
    const ctx: any = {
      model,
      setModal: vi.fn(),
      native: vi.fn(),
      showOrigin: vi.fn(),
      openTask: vi.fn(),
      openTaskFromResource: vi.fn(),
    };
    await act(async () =>
      root!.render(
        <WorkbenchRuntimeProvider runtime={runtime}>
          <I18nProvider initialLocale="zh-CN">
            <ResourceDrawer ctx={ctx} view={{ kind: 'branch', id: branch.id }} close={vi.fn()} />
          </I18nProvider>
        </WorkbenchRuntimeProvider>,
      ),
    );
    await click(buttonWithText(container, '查看任务')!);
    expect(ctx.openTaskFromResource).toHaveBeenCalledWith('REQ-1039');
    expect(ctx.openTask).not.toHaveBeenCalled();
  });
});

describe('relationship dialog task navigation', () => {
  async function mountRelatedTasks() {
    const runtime = createMockWorkbenchRuntime({
      storage: { getItem: () => null, setItem: () => {} },
    });
    const model: any = runtime.createInitialState();
    model.relations = [
      {
        id: 'navigation-related',
        kind: 'child',
        fromTaskId: 'REQ-1042',
        toTaskId: 'REQ-1039',
        required: false,
        active: true,
      },
    ];
    await act(async () =>
      root!.render(
        <WorkbenchRoot runtime={{ ...runtime, load: () => model }} initialLocale="zh-CN" />,
      ),
    );
    return model;
  }

  it.each([
    { existingDrawer: true, targetId: 'REQ-1039' },
    { existingDrawer: true, targetId: 'REQ-1042' },
    { existingDrawer: false, targetId: 'REQ-1039' },
  ])(
    'opens $targetId from the graph with existing drawer: $existingDrawer',
    async ({ existingDrawer, targetId }) => {
      const model = await mountRelatedTasks();
      const card = container.querySelector('[data-task-id="REQ-1042"]')!;
      const cardButton = card.querySelector<HTMLButtonElement>('.personal-card-main')!;
      let relationOpener: HTMLButtonElement;
      if (existingDrawer) {
        cardButton.focus();
        await click(cardButton);
        relationOpener = buttonWithText(container.querySelector('.task-drawer')!, '查看任务关系')!;
      } else {
        relationOpener = card.querySelector<HTMLButtonElement>(
          'button[aria-label="查看 REQ-1042 的关系图"]',
        )!;
      }
      relationOpener.focus();
      await click(relationOpener);
      const restoreFocus = vi.spyOn(relationOpener, 'focus');
      const target = model.tasks.find((task: any) => task.id === targetId);
      const graph = container.querySelector('.relations-dialog')!;
      const node = [...graph.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.getAttribute('aria-label') === `打开任务：${target.title}`,
      )!;
      expect(node).toBeTruthy();
      node.focus();
      const nodeFocus = vi.spyOn(node, 'focus');
      await click(node);

      expect(container.querySelector('dialog[aria-label="任务关系"]')).toBeNull();
      const drawer = container.querySelector('dialog[open]')!;
      expect(drawer?.getAttribute('aria-label')).toBe(`任务详情 · ${target.title}`);
      expect(drawer.textContent).toContain(target.title);
      await click(drawer.querySelector('button[aria-label="任务更多操作"]')!);
      expect(buttonWithText(drawer, '编辑任务')).toBeTruthy();
      if (existingDrawer && targetId !== 'REQ-1042') {
        expect(relationOpener.isConnected).toBe(false);
        expect(restoreFocus).not.toHaveBeenCalled();
      }
      await click(drawer.querySelector('button[aria-label="关闭任务详情"]')!);
      expect(container.querySelector('dialog[open]')).toBeNull();
      expect(nodeFocus).not.toHaveBeenCalled();
      expect(document.activeElement?.isConnected).toBe(true);
    },
  );

  it('closes the graph back to its opener and still switches to the full graph', async () => {
    await mountRelatedTasks();
    const card = container.querySelector('[data-task-id="REQ-1042"]')!;
    const opener = card.querySelector<HTMLButtonElement>(
      'button[aria-label="查看 REQ-1042 的关系图"]',
    )!;
    opener.focus();
    await click(opener);
    await click(container.querySelector('.relations-dialog button[aria-label="关闭关系图"]')!);
    expect(container.querySelector('dialog[open]')).toBeNull();
    expect(document.activeElement).toBe(opener);

    await click(opener);
    await click(container.querySelector('.relations-dialog button[aria-label="全屏查看"]')!);
    expect(container.querySelector('dialog[open]')).toBeNull();
    expect(container.querySelector('.workspace-content')?.textContent).toContain('任务关系');
    expect(container.querySelector('.relations-toolbar')).toBeTruthy();
  });
});

describe('project directory dialog submit contract', () => {
  function mountDialog() {
    const runtime = createMockWorkbenchRuntime();
    let current: any = runtime.createInitialState();
    const dispatchAct = (action: any, _message?: string, onError?: (message: string) => void) => {
      try {
        current = runtime.reduce(current, action);
      } catch (error) {
        onError?.((error as Error).message);
        return null;
      }
      renderIt();
      return current;
    };
    const renderIt = () =>
      act(async () =>
        root!.render(
          <WorkbenchRuntimeProvider runtime={runtime}>
            <I18nProvider initialLocale="zh-CN">
              <ProjectDirectoryDialog
                ctx={{ model: current, act: dispatchAct }}
                projectId="project-member-center"
                close={vi.fn()}
              />
            </I18nProvider>
          </WorkbenchRuntimeProvider>,
        ),
      );
    const input = () => container.querySelector('.project-directory-add input') as HTMLInputElement;
    const error = () => container.querySelector('.relation-error');
    const submit = () => buttonWithText(container.querySelector('.modal') ?? container, '关联')!;
    return { renderIt, input, error, submit };
  }

  async function type(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('keeps the path and shows the error when linking fails', async () => {
    const { renderIt, input, error, submit } = mountDialog();
    await renderIt();
    await type(input(), '/Users/demo/work/member-center/member-service');
    await click(submit());
    expect(input().value).toBe('/Users/demo/work/member-center/member-service');
    expect(error()?.textContent).toContain('该目录已在工作区中');
  });

  it('clears the path only on success', async () => {
    const { renderIt, input, error, submit } = mountDialog();
    await renderIt();
    await type(input(), '/Users/demo/work/member-center/release-docs');
    await click(submit());
    expect(input().value).toBe('');
    expect(error()).toBeNull();
  });
});
