import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TaskDetail } from '../src/workbench/pages/TaskDetailPage.jsx';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import { createMockWorkbenchRuntime } from '../src/mock';

function detailScenario() {
  const runtime = createMockWorkbenchRuntime();
  const model: any = runtime.createInitialState();
  const task = model.tasks.find((item: any) => item.id === 'REQ-1042');
  const render = () =>
    renderToStaticMarkup(
      <WorkbenchRuntimeProvider runtime={runtime}>
        <I18nProvider initialLocale="zh-CN">
          <TaskDetail ctx={{ task, model, setModal: vi.fn(), go: vi.fn(), run: vi.fn() }} saved />
        </I18nProvider>
      </WorkbenchRuntimeProvider>,
    );
  return { task, model, render };
}

describe('task detail reading and resources', () => {
  it('reads task content before the separate optional goal without losing task metadata', () => {
    const s = detailScenario();
    s.task.description = '先阅读这段任务正文';
    s.task.goal = '再核对独立的目标说明';
    const html = s.render();

    expect(html).toContain(s.task.description);
    expect(html).toContain(s.task.goal);
    expect(html.indexOf(s.task.description)).toBeLessThan(html.indexOf(s.task.goal));
    expect(html).toContain('任务类型：开发');
    expect(html).toContain('P0');
    expect(html).toContain('负责人');
    expect(html).toContain('切换任务状态');
    expect(html).toContain(s.task.repo);
    expect(html).toContain('创建于');
    expect(html).toContain('最近修改');
  });

  it('lists every document once with its result, scope and reuse action, preserving linked resources', () => {
    const s = detailScenario();
    const original = s.task.docs[0];
    s.task.docs = Array.from({ length: 6 }, (_, index) => ({
      ...original,
      id: `evidence-${index}`,
      title: `evidence-${index}.md`,
      version: index + 1,
      outcome: index === 0 ? 'failed' : 'not_run',
      stale: index === 0,
    }));
    s.task.workspace = {
      ...s.task.workspace,
      ready: true,
      verified: true,
      branch: 'reed/evidence',
    };
    const html = s.render();

    for (const document of s.task.docs) {
      expect(html.split(document.title)).toHaveLength(2);
      expect(html).toContain(`${document.title} · V${document.version}`);
    }
    expect(html).toContain('执行失败');
    expect(html).toContain('依据待复核');
    expect(html).toContain('当前范围');
    expect(html).toContain('核对并复用此版本');
    for (const sessionId of s.task.sessionIds) {
      const session = s.model.sessions.find((item: any) => item.id === sessionId);
      expect(html.split(session.title)).toHaveLength(2);
    }
    expect(html).toContain('reed/evidence');
    expect(html).toContain('目录已核对');
    expect(html).toContain('查看全部关联');
    expect(html).toContain('交给 Agent');
  });
});
