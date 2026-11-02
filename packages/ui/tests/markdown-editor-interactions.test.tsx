// @vitest-environment jsdom
import { act, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownEditor } from '../src/workbench/MarkdownEditor';
import { TaskComments } from '../src/workbench/TaskComments';
import { TaskBasicsDialog } from '../src/workbench/TaskBasicsDialog';
import { TaskFlowDialogs } from '../src/workbench/TaskFlowDialogs';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { createMockWorkbenchRuntime } from '../src/mock';

const imageUrl = 'data:image/png;base64,iVBORw0KGgo=';
let images: { onload: (() => void) | null; onerror: (() => void) | null }[];
let container: HTMLDivElement;
let root: Root | null;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  images = [];
  vi.stubGlobal(
    'FileReader',
    class {
      result = imageUrl;
      onload: (() => void) | null = null;
      readAsDataURL() {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 10;
      naturalHeight = 10;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        images.push(this);
      }
    },
  );
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

async function mount(node: ReactNode) {
  await act(async () => root!.render(<I18nProvider initialLocale="zh-CN">{node}</I18nProvider>));
}
async function text(element: HTMLTextAreaElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function chooseImage() {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  await act(async () => {
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['image'], '截图.png', { type: 'image/png' })],
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(images).toHaveLength(1);
}
async function finishImage() {
  await act(async () => images.shift()!.onload?.());
}
async function submit() {
  await act(async () =>
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
}

describe('asynchronous Markdown image insertion', () => {
  it.each(['task-scope', 'task-artifact'])(
    'blocks %s submission until its image is ready',
    async (type) => {
      const runtime = createMockWorkbenchRuntime();
      const model: any = runtime.createInitialState();
      const task = model.tasks.find((item: any) => item.id === 'REQ-1042');
      const run = vi.fn(() => true);
      await mount(
        <WorkbenchRuntimeProvider runtime={runtime}>
          <TaskFlowDialogs
            ctx={{
              task,
              model,
              modal: { type, sourceDocId: task.docs[0].id },
              run,
              setModal: vi.fn(),
            }}
          />
        </WorkbenchRuntimeProvider>,
      );
      await chooseImage();
      expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
        true,
      );
      await submit();
      expect(run).not.toHaveBeenCalled();
      await finishImage();
      await submit();
      expect(run).toHaveBeenCalledWith(
        type === 'task-scope' ? 'SAVE_TASK_SCOPE' : 'ADD_TASK_ARTIFACT',
        expect.objectContaining({
          [type === 'task-scope' ? 'goal' : 'body']: expect.stringContaining(imageUrl),
        }),
        expect.any(String),
      );
    },
  );

  it('blocks comment submission until the selected image is part of the same comment', async () => {
    const run = vi.fn(() => true);
    await mount(<TaskComments ctx={{ task: { id: 'LOCAL-1', comments: [] }, run }} />);
    await text(container.querySelector('textarea')!, '这条评论包含图片');
    await chooseImage();
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
      true,
    );
    await submit();
    expect(run).not.toHaveBeenCalled();
    await finishImage();
    await submit();
    expect(run).toHaveBeenCalledExactlyOnceWith(
      'ADD_TASK_COMMENT',
      { body: expect.stringContaining(imageUrl) },
      'minimal.commentSaved',
    );
    expect(container.querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('');
  });

  it('keeps task description saving pending until image conversion completes', async () => {
    const runtime = createMockWorkbenchRuntime();
    const model: any = runtime.createInitialState();
    const task = model.tasks.find((item: any) => item.id === 'LOCAL-1');
    const run = vi.fn(() => true);
    const close = vi.fn();
    await mount(
      <WorkbenchRuntimeProvider runtime={runtime}>
        <TaskBasicsDialog ctx={{ task, model, run, setModal: close }} />
      </WorkbenchRuntimeProvider>,
    );
    await chooseImage();
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
      true,
    );
    await submit();
    expect(run).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    await finishImage();
    await submit();
    expect(run).toHaveBeenCalledWith(
      'SAVE_TASK_BASICS',
      expect.objectContaining({ description: expect.stringContaining(imageUrl) }),
      'minimal.saved',
    );
    expect(close).toHaveBeenCalledWith(null);
  });

  it('ignores a late image after the editor is closed', async () => {
    const changed = vi.fn();
    await mount(<MarkdownEditor value="保留原文" onChange={changed} />);
    await chooseImage();
    await act(async () => root!.unmount());
    root = null;
    await finishImage();
    expect(changed).not.toHaveBeenCalled();
  });

  it('rejects an oversized insertion atomically and keeps the existing text', async () => {
    function Editor() {
      const [value, setValue] = useState('原文');
      return <MarkdownEditor value={value} onChange={setValue} maxLength={20} />;
    }
    await mount(<Editor />);
    await chooseImage();
    await finishImage();
    expect(container.querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('原文');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('applies the same length guard to an inserted URL', async () => {
    function Editor() {
      const [value, setValue] = useState('原文');
      return <MarkdownEditor value={value} onChange={setValue} maxLength={20} />;
    }
    await mount(<Editor />);
    await act(async () =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === '插入图片链接')!
        .click(),
    );
    const url = container.querySelector<HTMLInputElement>('input[aria-label="图片链接地址"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        url,
        'https://example.invalid/image.png',
      );
      url.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === '插入图片')!
        .click(),
    );
    expect(container.querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('原文');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('preserves text typed during conversion and releases submission after an image error', async () => {
    const run = vi.fn(() => true);
    await mount(<TaskComments ctx={{ task: { id: 'LOCAL-1', comments: [] }, run }} />);
    await text(container.querySelector('textarea')!, '原文');
    await chooseImage();
    await text(container.querySelector('textarea')!, '原文加上后来输入的说明');
    await act(async () => images.shift()!.onerror?.());
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
      false,
    );
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    await submit();
    expect(run).toHaveBeenCalledWith(
      'ADD_TASK_COMMENT',
      { body: '原文加上后来输入的说明' },
      'minimal.commentSaved',
    );
  });
});
