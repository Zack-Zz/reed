import { useI18n } from './i18n.jsx';
import { useWorkbenchRuntime } from './runtime-context';
import { Select } from './Select.jsx';
import type { WorkflowTemplate, TemplateVersion } from './configuration-types';
export interface WorkflowSelection {
  templateId: string | null;
  templateVersion?: number;
}
type Option = WorkflowTemplate & { recommended: boolean; current: TemplateVersion };
export function WorkflowPicker({
  model,
  taskType,
  value,
  onChange,
  onManage,
}: {
  model: unknown;
  taskType?: string;
  value: WorkflowSelection;
  onChange: (next: WorkflowSelection) => void;
  onManage?: () => void;
}) {
  const { t } = useI18n();
  const { getWorkflowOptions } = useWorkbenchRuntime().services as {
    getWorkflowOptions: (model: unknown, typeId?: string) => Option[];
  };
  const options = getWorkflowOptions(model, taskType);
  const selected = options.find((x) => x.id === value.templateId);
  const version =
    selected?.versions.find((v) => v.version === value.templateVersion) || selected?.current;
  const label = (item: Option, name: string) => (item.builtin ? t(name) : name);
  return (
    <section className="workflow-choice">
      <label className="field">
        {t('selection.field')}
        <Select
          aria-label={t('selection.field')}
          value={value.templateId || ''}
          onChange={(e: { target: { value: string } }) => {
            const option = options.find((x) => x.id === e.target.value);
            onChange({ templateId: option?.id || null, templateVersion: option?.current.version });
          }}
        >
          <option value="">{t('无内部流程')}</option>
          {value.templateId && !selected && (
            <option value={value.templateId} disabled>
              {t('selection.unavailableSelected')}
            </option>
          )}
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {label(option, option.current.name)}
              {option.recommended ? ` · ${t('selection.recommended')}` : ''}
            </option>
          ))}
        </Select>
      </label>
      {selected && version && (
        <div className="workflow-preview">
          <div className="workflow-preview-heading">
            <strong>{label(selected, version.name)}</strong>
            <label>
              {t('selection.version')}
              <Select
                aria-label={t('selection.version')}
                value={version.version}
                onChange={(e: { target: { value: string } }) =>
                  onChange({ templateId: selected.id, templateVersion: Number(e.target.value) })
                }
              >
                {selected.versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    V{v.version}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          {version.description && <p>{version.description}</p>}
          <ol>
            {version.steps.map((step) => (
              <li key={step.id}>
                <strong>{selected.builtin ? t(step.name) : step.name}</strong>
                <span>{t(step.required ? 'selection.required' : 'selection.optional')}</span>
                <small>{selected.builtin ? t(step.goal) : step.goal}</small>
                {step.outputs.length > 0 && (
                  <small>
                    {t('selection.outputs')}
                    {step.outputs.join(' · ')}
                  </small>
                )}
              </li>
            ))}
          </ol>
          <p className="footnote">{t('selection.versionHint')}</p>
        </div>
      )}
      {!value.templateId && <p className="footnote">{t('selection.noneHint')}</p>}
      {value.templateId && !selected && (
        <p role="alert" className="scope-note">
          {t('selection.template-unavailable')}
        </p>
      )}
      {onManage && (
        <button type="button" className="quiet small" onClick={onManage}>
          {t('selection.manage')}
        </button>
      )}
    </section>
  );
}
