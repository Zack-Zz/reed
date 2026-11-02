import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocalTaskDialog } from '../src/workbench/LocalTaskDialog';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { createMockWorkbenchRuntime } from '../src/mock';
const runtime = createMockWorkbenchRuntime({ storage: { getItem: () => null, setItem() {} } });
const wrap = (child: React.ReactNode, locale = 'zh-CN') =>
  renderToStaticMarkup(
    <WorkbenchRuntimeProvider runtime={runtime}>
      <I18nProvider initialLocale={locale}>{child}</I18nProvider>
    </WorkbenchRuntimeProvider>,
  );
it.each(['zh-CN', 'en'])(
  'creates a task without an internal workflow template choice in %s',
  (locale) => {
    const model: any = runtime.createInitialState();
    const html = wrap(
      <LocalTaskDialog model={model} act={vi.fn()} close={vi.fn()} onCreated={vi.fn()} />,
      locale,
    );
    expect(html).not.toContain(locale === 'en' ? 'Workflow template (optional)' : '流程模板（可后补）');
    expect(html).not.toContain(locale === 'en' ? 'No internal workflow' : '无内部流程');
    expect(html).toContain(locale === 'en' ? 'Task type' : '任务类型');
  },
);
