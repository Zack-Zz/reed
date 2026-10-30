import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import {
  WorkflowConfigurationPage,
  ConfigurationTemplateFields,
} from '../src/workbench/pages/WorkflowConfigurationPage';
import type { ConfigurationModel } from '../src/workbench/configuration-types';

const model: ConfigurationModel = {
  configuration: {
    taskTypes: [
      {
        id: 'builtin',
        name: '开发',
        description: '内置说明',
        icon: '',
        builtin: true,
        enabled: true,
        order: 0,
        recommendedTemplateIds: [],
      },
      {
        id: 'custom',
        name: 'My writing',
        description: '',
        icon: '',
        builtin: false,
        enabled: false,
        order: 1,
        recommendedTemplateIds: [],
      },
    ],
    templates: [
      {
        id: 'workflow',
        builtin: true,
        enabled: true,
        revision: 1,
        draft: null,
        versions: [
          {
            version: 1,
            name: '研发流程',
            description: 'Prepare and review',
            suggestedCriteria: [],
            steps: [
              {
                id: 's1',
                name: '需求',
                goal: 'Define scope',
                instructions: '',
                outputs: [],
                checks: [],
                required: true,
                mode: 'either',
                requiresCode: false,
              },
            ],
          },
        ],
      },
      {
        id: 'draft',
        builtin: false,
        enabled: false,
        revision: 1,
        versions: [],
        draft: { name: 'Personal draft', description: '', suggestedCriteria: [], steps: [] },
      },
    ],
  },
  tasks: [{ id: 'task', taskType: 'builtin', workflow: { templateId: 'workflow' } }],
};
function render(tab: 'types' | 'templates' = 'types', locale = 'zh-CN') {
  return renderToStaticMarkup(
    <I18nProvider initialLocale={locale}>
      <WorkflowConfigurationPage model={model} act={vi.fn()} close={vi.fn()} initialTab={tab} />
    </I18nProvider>,
  );
}
describe('workflow configuration settings', () => {
  it('shows independent tabs and task type controls with usage restrictions', () => {
    const html = render();
    expect(html).toContain('任务与流程');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('任务类型');
    expect(html).toContain('流程模板');
    expect(html).toContain('My writing');
    expect(html).toContain('内置');
    expect(html).toContain('已被 1 个任务使用');
    expect(html).toContain('新建任务类型');
  });
  it('presents published templates and personal drafts with explicit version and copy actions', () => {
    const html = render('templates');
    expect(html).toContain('研发流程');
    expect(html).toContain('Personal draft');
    expect(html).toContain('v1');
    expect(html).toContain('复制为自定义模板');
    expect(html).toContain('编辑草稿');
    expect(html).toContain('新建流程模板');
  });
  it('keeps user names intact when English is selected', () => {
    const html = render('types', 'en');
    expect(html).toContain('Tasks and workflows');
    expect(html).toContain('Task types');
    expect(html).toContain('My writing');
    expect(html).toContain('Used by 1 task(s)');
  });
});

function renderFields(readOnly = false, locale = 'zh-CN') {
  return renderToStaticMarkup(
    <I18nProvider initialLocale={locale}>
      <ConfigurationTemplateFields
        definition={model.configuration.templates[0].versions[0]}
        onChange={vi.fn()}
        readOnly={readOnly}
        builtin={readOnly}
      />
    </I18nProvider>,
  );
}
describe('workflow definition editor', () => {
  it('shows ordered steps, artifact requirements and manual checks alongside step settings', () => {
    const html = renderFields();
    expect(html).toContain('aria-label="流程步骤"');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('Define scope');
    expect(html).toContain('必要产物标题（每行一项）');
    expect(html).toContain('人工确认要点');
    expect(html).toContain('需要代码工作区');
    expect(html).toContain('建议验收清单');
    expect(html).toContain('添加步骤');
  });
  it('makes builtin version previews read-only and omits step mutation actions', () => {
    const html = renderFields(true);
    expect(html).toContain('readOnly=""');
    expect(html).not.toContain('添加步骤');
    expect(html).not.toContain('aria-label="上移"');
    expect(html).not.toContain('>删除</button>');
  });
  it('localizes editor labels while retaining user-authored scope', () => {
    const html = renderFields(false, 'en');
    expect(html).toContain('Step goal');
    expect(html).toContain('Required artifact titles (one per line)');
    expect(html).toContain('Define scope');
    expect(html).toContain('Suggested acceptance criteria');
  });
});
it('counts historical type references so the maintenance page does not offer deletion after recategorization', () => {
  const historical = {
    ...model,
    tasks: [
      {
        id: 'task',
        taskType: 'builtin',
        typeHistory: ['custom'],
        workflow: null,
        workflowHistory: [{ workflow: { templateId: 'workflow' } }],
      },
    ],
  };
  const html = renderToStaticMarkup(
    <I18nProvider initialLocale="zh-CN">
      <WorkflowConfigurationPage model={historical} act={vi.fn()} close={vi.fn()} />
    </I18nProvider>,
  );
  const start = html.indexOf('<h2>My writing</h2>');
  const row = html.slice(start, html.indexOf('</article>', start));
  expect(row).toContain('已被 1 个任务使用');
  expect(row).toMatch(/<button[^>]*disabled=""[^>]*[^<]*>删除<\/button>/);
});
