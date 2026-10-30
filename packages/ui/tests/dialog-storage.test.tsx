import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { Dialogs } from '../src/workbench/Dialogs.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { createMockWorkbenchRuntime } from '../src/mock';
import { createInitialState } from '../src/mock/model.js';

afterEach(() => vi.unstubAllGlobals());

function renderNative() {
  const model = createInitialState();
  const session = model.sessions.find(
    (item: { id: string; taskId: string; status: string }) => item.status === 'waiting',
  );
  if (!session) throw new Error('Expected the existing waiting-session sample');
  const ctx = {
    model,
    task: model.tasks.find((item: { id: string }) => item.id === session.taskId),
    modal: { type: 'native', sessionId: session.id },
    setModal: vi.fn(),
    run: vi.fn(),
    act: vi.fn(),
    openTask: vi.fn(),
    go: vi.fn(),
    download: vi.fn(),
    reset: vi.fn(),
    setStage: vi.fn(),
  };
  return renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
      <I18nProvider initialLocale="zh-CN">
        <Dialogs ctx={ctx} />
      </I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
}

describe('temporary conversation drafts', () => {
  it('keeps the conversation usable when browser storage is denied', () => {
    vi.stubGlobal('sessionStorage', {
      getItem() {
        throw new Error('Storage denied');
      },
    });
    expect(renderNative()).toContain('提交答复并继续');
  });

  it.each(['null', '[]', '"unexpected"'])('ignores unusable form cache %s', (cache) => {
    vi.stubGlobal('sessionStorage', { getItem: () => cache });
    expect(renderNative()).toContain('提交答复并继续');
  });
});

it('a no-workflow session uses task context rather than an empty phase label', () => {
  const html = renderNative();
  expect(html).not.toContain('阶段 ·');
  expect(html).toContain('处理中');
});
