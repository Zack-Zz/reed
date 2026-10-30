import { templateContentKey } from '../template-definition.ts';
import type {
  ConfigurationModel,
  TemplateDefinition,
  TemplateVersion,
  WorkflowStep,
  WorkflowTemplate,
  TaskTypeDefinition,
} from '../workbench/configuration-types.js';
// Local preview configuration only. Never a Core entity, database or wire schema.
const requireThat: (ok: unknown, key: string) => asserts ok = (ok, key) => {
  if (!ok) throw new Error(key);
};
const record = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length <= 48 && v.every((s) => typeof s === 'string');
const title = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const freshId = (items: { id: string }[], prefix: string) => {
  let n = items.length + 1;
  while (items.some((i) => i.id === `${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
};
const step = (name: string, index: number, output: string, requiresCode = false): WorkflowStep => ({
  id: `step-${index}`,
  name,
  goal: name,
  instructions: '',
  outputs: [output],
  checks: [],
  required: true,
  mode: 'either',
  requiresCode,
});
export function createConfiguration(): ConfigurationModel['configuration'] {
  const template = (id: string, name: string, steps: WorkflowStep[]): WorkflowTemplate => ({
    id,
    builtin: true,
    enabled: true,
    revision: 1,
    draft: null,
    versions: [{ version: 1, name, description: '', steps, suggestedCriteria: [] }],
  });
  const names = [
    ['uncategorized', '未分类'],
    ['requirement', '需求'],
    ['development', '开发'],
    ['test', '测试'],
    ['verification', '验证'],
    ['documentation', '文档'],
  ];
  return {
    taskTypes: names.map(([id, name], order) => ({
      id,
      name,
      order,
      description: '',
      icon: 'task',
      builtin: true,
      enabled: true,
      recommendedTemplateIds:
        id === 'development'
          ? ['development']
          : ['test', 'verification'].includes(id)
            ? ['testing']
            : [],
    })),
    templates: [
      template('development', '研发流程', [
        step('需求', 0, '需求说明.md'),
        step('设计', 1, '设计方案.md'),
        step('开发', 2, '开发记录.md', true),
        step('验证', 3, '验证报告.md', true),
      ]),
      template('testing', '测试执行', [
        step('测试计划', 0, '测试计划.md'),
        step('用例准备', 1, '测试用例.md'),
        step('测试执行', 2, '执行报告.md'),
        step('结果报告', 3, '结果报告.md'),
      ]),
    ],
  };
}
export function isTemplateDefinition(v: unknown): v is TemplateDefinition {
  return (
    record(v) &&
    typeof v.name === 'string' &&
    typeof v.description === 'string' &&
    strings(v.suggestedCriteria) &&
    Array.isArray(v.steps) &&
    v.steps.length <= 24 &&
    new Set(v.steps.map((s) => (record(s) ? s.id : null))).size === v.steps.length &&
    v.steps.every(
      (s) =>
        record(s) &&
        ['id', 'name', 'goal', 'instructions'].every((k) => typeof s[k] === 'string') &&
        strings(s.outputs) &&
        strings(s.checks) &&
        typeof s.required === 'boolean' &&
        typeof s.requiresCode === 'boolean' &&
        ['manual', 'agent', 'either'].includes(String(s.mode)),
    )
  );
}
export function isConfiguration(v: unknown): v is ConfigurationModel['configuration'] {
  if (!record(v) || !Array.isArray(v.taskTypes) || !Array.isArray(v.templates)) return false;
  return (
    v.taskTypes.length > 0 &&
    v.taskTypes.some((t) => t.id === 'uncategorized' && t.enabled === true) &&
    new Set(v.taskTypes.map((t) => t?.id)).size === v.taskTypes.length &&
    new Set(v.templates.map((t) => t?.id)).size === v.templates.length &&
    v.taskTypes.every(
      (t) =>
        record(t) &&
        ['id', 'name', 'description', 'icon'].every((k) => typeof t[k] === 'string') &&
        typeof t.enabled === 'boolean' &&
        typeof t.builtin === 'boolean' &&
        Number.isFinite(t.order) &&
        strings(t.recommendedTemplateIds),
    ) &&
    v.templates.every(
      (t) =>
        record(t) &&
        typeof t.id === 'string' &&
        typeof t.enabled === 'boolean' &&
        typeof t.builtin === 'boolean' &&
        Number.isInteger(t.revision) &&
        (t.draft === null || isTemplateDefinition(t.draft)) &&
        Array.isArray(t.versions) &&
        new Set(t.versions.map((x) => x?.version)).size === t.versions.length &&
        t.versions.every(
          (x) =>
            isTemplateDefinition(x) &&
            x.steps.length > 0 &&
            x.steps.every(
              (s) => s.name.trim() && s.goal.trim() && (!s.required || s.outputs.length > 0),
            ) &&
            Number.isInteger((x as TemplateVersion).version) &&
            (x as TemplateVersion).version > 0,
        ),
    )
  );
}
export const getTaskTypes = (model: Partial<ConfigurationModel>, includeDisabled = false) =>
  (model.configuration || createConfiguration()).taskTypes
    .filter((t) => includeDisabled || t.enabled)
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ ...t, label: t.name }));
export function resolveTemplate(model: ConfigurationModel, templateId: unknown, version?: unknown) {
  const template = model.configuration.templates.find((t) => t.id === templateId);
  requireThat(template?.enabled, 'selection.template-unavailable');
  const selected =
    version === undefined
      ? template.versions.at(-1)
      : template.versions.find((v) => v.version === version);
  requireThat(selected, 'selection.version-unavailable');
  return structuredClone(selected);
}
export function selectWorkflow(model: ConfigurationModel, templateId: unknown, version?: unknown) {
  if (templateId === null || templateId === undefined || templateId === '') return null;
  const selected = resolveTemplate(model, templateId, version);
  return {
    templateId: String(templateId),
    version: selected.version,
    name: selected.name,
    stepLabels: selected.steps.map((s) => s.name),
    steps: selected.steps,
    suggestedCriteria: selected.suggestedCriteria,
  };
}
export function getWorkflowOptions(model: Partial<ConfigurationModel>, typeId?: string) {
  const config = model.configuration || createConfiguration();
  const recommended = config.taskTypes.find((t) => t.id === typeId)?.recommendedTemplateIds || [];
  return config.templates
    .filter((t) => t.enabled && t.versions.length)
    .map((t) => ({ ...t, recommended: recommended.includes(t.id), current: t.versions.at(-1)! }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended));
}
const referenced = (model: ConfigurationModel, id: string, kind: 'type' | 'template') =>
  model.tasks.some((task) => {
    const history = task as typeof task & {
      typeHistory?: string[];
      reviews?: { taskType?: string }[];
      workflowHistory?: { workflow?: { templateId?: string } | null }[];
      scopeHistory?: { workflow?: { templateId?: string } | null }[];
    };
    return kind === 'type'
      ? history.taskType === id ||
          history.typeHistory?.includes(id) ||
          history.reviews?.some((r) => r.taskType === id)
      : [
          history.workflow,
          ...(history.workflowHistory || []).map((h) => h.workflow),
          ...(history.scopeHistory || []).map((h) => h.workflow),
        ].some((w) => w?.templateId === id);
  });
export function applyConfigurationAction(
  model: ConfigurationModel,
  action: { type: string; [key: string]: unknown },
) {
  const config = model.configuration;
  if (action.type === 'SAVE_TASK_TYPE') {
    requireThat(record(action.definition), 'config.configuration-invalid');
    const d = action.definition;
    const name = title(d.name);
    requireThat(name && name.length <= 80, 'config.type-name-required');
    requireThat(
      !config.taskTypes.some(
        (t) => t.id !== d.id && t.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      ),
      'config.type-name-conflict',
    );
    const old = d.id ? config.taskTypes.find((t) => t.id === d.id) : null;
    requireThat(!d.id || old, 'config.type-not-found');
    requireThat(
      strings(d.recommendedTemplateIds) &&
        d.recommendedTemplateIds.every((id) => config.templates.some((t) => t.id === id)),
      'config.configuration-invalid',
    );
    const value: TaskTypeDefinition = {
      id: old?.id || freshId(config.taskTypes, 'type'),
      name,
      description: title(d.description),
      icon: title(d.icon) || 'task',
      enabled: old?.enabled ?? true,
      builtin: old?.builtin ?? false,
      order: old?.order ?? config.taskTypes.length,
      recommendedTemplateIds: [...new Set(d.recommendedTemplateIds)],
    };
    if (old) Object.assign(old, value);
    else config.taskTypes.push(value);
    return true;
  }
  if (['SET_TASK_TYPE_ENABLED', 'MOVE_TASK_TYPE', 'DELETE_TASK_TYPE'].includes(action.type)) {
    const item = config.taskTypes.find((t) => t.id === action.typeId);
    requireThat(item, 'config.type-not-found');
    if (action.type === 'SET_TASK_TYPE_ENABLED') {
      requireThat(
        item.id !== 'uncategorized' || action.enabled === true,
        'selection.unclassified-required',
      );
      requireThat(typeof action.enabled === 'boolean', 'config.configuration-invalid');
      item.enabled = action.enabled;
    } else if (action.type === 'DELETE_TASK_TYPE') {
      requireThat(!item.builtin, 'config.type-builtin-readonly');
      requireThat(!referenced(model, item.id, 'type'), 'config.type-in-use');
      config.taskTypes = config.taskTypes.filter((t) => t.id !== item.id);
    } else {
      requireThat(
        ['up', 'down'].includes(String(action.direction)),
        'config.configuration-invalid',
      );
      const ordered = [...config.taskTypes].sort((a, b) => a.order - b.order);
      const index = ordered.indexOf(item),
        next = index + (action.direction === 'up' ? -1 : 1);
      if (ordered[next]) [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
      ordered.forEach((t, i) => (t.order = i));
    }
    return true;
  }
  if (action.type === 'SAVE_WORKFLOW_TEMPLATE') {
    const old = action.templateId ? config.templates.find((t) => t.id === action.templateId) : null;
    requireThat(!action.templateId || old, 'config.template-not-found');
    requireThat(!old?.builtin, 'config.template-builtin-readonly');
    requireThat(
      action.expectedRevision === (old?.revision ?? 0),
      'config.template-revision-conflict',
    );
    requireThat(isTemplateDefinition(action.definition), 'config.configuration-invalid');
    const d = structuredClone(action.definition);
    d.name = d.name.trim();
    requireThat(d.name && d.name.length <= 100, 'config.template-name-required');
    requireThat(
      !config.templates.some(
        (t) =>
          t.id !== old?.id &&
          (t.draft?.name || t.versions.at(-1)?.name)?.toLocaleLowerCase() ===
            d.name.toLocaleLowerCase(),
      ),
      'config.template-name-conflict',
    );
    d.steps.forEach((s) => {
      s.name = s.name.trim();
      s.goal = s.goal.trim();
      s.outputs = s.outputs.map((x) => x.trim()).filter(Boolean);
      s.checks = s.checks.map((x) => x.trim()).filter(Boolean);
    });
    if (action.publish) {
      requireThat(d.steps.length > 0, 'config.template-steps-required');
      requireThat(
        d.steps.every((s) => s.id && s.name && s.goal && (!s.required || s.outputs.length > 0)),
        'config.template-step-invalid',
      );
    }
    requireThat(
      !action.publish ||
        !old?.versions.length ||
        templateContentKey(d) !== templateContentKey(old.versions.at(-1)!),
      'config.template-no-changes',
    );
    const item: WorkflowTemplate = old || {
      id: freshId(config.templates, 'template'),
      builtin: false,
      enabled: false,
      revision: 0,
      draft: null,
      versions: [],
    };
    item.revision++;
    if (action.publish) {
      item.versions.push({
        ...d,
        version: Math.max(0, ...item.versions.map((v) => v.version)) + 1,
      });
      item.draft = null;
      item.enabled = true;
    } else item.draft = d;
    if (!old) config.templates.push(item);
    return true;
  }
  if (action.type === 'COPY_WORKFLOW_TEMPLATE') {
    const source = config.templates.find((t) => t.id === action.templateId);
    requireThat(source, 'config.template-not-found');
    const selected = action.version
      ? source.versions.find((v) => v.version === action.version)
      : source.draft || source.versions.at(-1);
    requireThat(selected, 'selection.version-unavailable');
    const d: TemplateDefinition = structuredClone(selected);
    let name = title(action.name) || `${d.name} · copy`;
    let n = 2;
    while (config.templates.some((t) => (t.draft?.name || t.versions.at(-1)?.name) === name))
      name = `${d.name} · copy ${n++}`;
    d.name = name;
    config.templates.push({
      id: freshId(config.templates, 'template'),
      builtin: false,
      enabled: false,
      revision: 1,
      draft: d,
      versions: [],
    });
    return true;
  }
  if (['SET_WORKFLOW_TEMPLATE_ENABLED', 'DELETE_WORKFLOW_TEMPLATE'].includes(action.type)) {
    const item = config.templates.find((t) => t.id === action.templateId);
    requireThat(item, 'config.template-not-found');
    if (action.type === 'SET_WORKFLOW_TEMPLATE_ENABLED') {
      requireThat(typeof action.enabled === 'boolean', 'config.configuration-invalid');
      requireThat(
        action.enabled === false || item.versions.length,
        'selection.version-unavailable',
      );
      item.enabled = action.enabled;
      item.revision++;
    } else {
      requireThat(!item.builtin, 'config.template-builtin-readonly');
      requireThat(!referenced(model, item.id, 'template'), 'config.template-in-use');
      requireThat(item.versions.length === 0, 'config.template-published');
      config.templates = config.templates.filter((t) => t.id !== item.id);
      config.taskTypes.forEach(
        (t) => (t.recommendedTemplateIds = t.recommendedTemplateIds.filter((id) => id !== item.id)),
      );
    }
    return true;
  }
  return false;
}

export function isAdoptedWorkflow(value: unknown, accepted: unknown, stage: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (
    !record(value) ||
    !Array.isArray(value.stepLabels) ||
    !Array.isArray(accepted) ||
    !accepted.every((v) => typeof v === 'boolean')
  )
    return false;
  const labels = value.stepLabels;
  if (!('steps' in value) && !('instanceId' in value) && !('version' in value))
    return value.templateId === 'development' && value.stepLabels.length === 4;
  return (
    typeof value.instanceId === 'string' &&
    Number.isInteger(value.version) &&
    Number(value.version) > 0 &&
    isTemplateDefinition({
      ...value,
      description: '',
      suggestedCriteria: value.suggestedCriteria || [],
    }) &&
    Array.isArray(value.steps) &&
    value.steps.length > 0 &&
    value.steps.length === labels.length &&
    value.steps.length === accepted.length &&
    value.steps.every((step, index) => step.name === labels[index]) &&
    Number.isInteger(stage) &&
    Number(stage) >= 0 &&
    Number(stage) < value.steps.length
  );
}
