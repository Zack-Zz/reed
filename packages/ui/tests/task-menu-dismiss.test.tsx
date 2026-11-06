// @vitest-environment jsdom
import { act } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDetail } from '../src/workbench/pages/TaskDetailPage.jsx';
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
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function mountDetail() {
  const runtime = createMockWorkbenchRuntime();
  const model: any = runtime.createInitialState();
  const task = model.tasks.find((item: any) => item.id === 'REQ-1042');
  await act(async () =>
    root!.render(
      <WorkbenchRuntimeProvider runtime={runtime}>
        <I18nProvider initialLocale="zh-CN">
          <TaskDetail ctx={{ task, model, setModal: vi.fn(), go: vi.fn(), run: vi.fn() }} saved />
        </I18nProvider>
      </WorkbenchRuntimeProvider>,
    ),
  );
}

describe('task more-actions menu dismissal', () => {
  it('closes the popover on outside pointerdown and on Escape', async () => {
    await mountDetail();
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="任务更多操作"]',
    )!;
    expect(trigger).toBeTruthy();

    await act(async () =>
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    expect(container.querySelector('.popover')).toBeTruthy();

    await act(async () =>
      document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })),
    );
    expect(container.querySelector('.popover')).toBeNull();

    await act(async () =>
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    expect(container.querySelector('.popover')).toBeTruthy();

    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(container.querySelector('.popover')).toBeNull();
  });

  it('keeps the popover open when clicking inside the menu', async () => {
    await mountDetail();
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="任务更多操作"]',
    )!;
    await act(async () =>
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    const popover = container.querySelector('.popover')!;
    expect(popover).toBeTruthy();

    await act(async () =>
      popover.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })),
    );
    expect(container.querySelector('.popover')).toBeTruthy();
  });
});
