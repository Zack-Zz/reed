/** Temporary shared-frontend configuration seam. Not a Core or wire contract. */
export interface TaskTypeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  order: number;
  builtin: boolean;
  recommendedTemplateIds: string[];
}
export interface WorkflowStep {
  id: string;
  name: string;
  goal: string;
  instructions: string;
  outputs: string[];
  checks: string[];
  required: boolean;
  mode: 'manual' | 'agent' | 'either';
  requiresCode: boolean;
}
export interface TemplateDefinition {
  name: string;
  description: string;
  steps: WorkflowStep[];
  suggestedCriteria: string[];
}
export interface TemplateVersion extends TemplateDefinition {
  version: number;
}
export interface WorkflowTemplate {
  id: string;
  builtin: boolean;
  enabled: boolean;
  revision: number;
  draft: TemplateDefinition | null;
  versions: TemplateVersion[];
}
export interface ConfigurationModel {
  configuration: {
    taskTypes: TaskTypeDefinition[];
    templates: WorkflowTemplate[];
  };
  tasks: Array<{
    id: string;
    taskType?: string;
    workflow?: { templateId: string } | null;
    typeHistory?: string[];
    reviews?: { taskType?: string }[];
    workflowHistory?: { workflow?: { templateId: string } | null }[];
    scopeHistory?: { workflow?: { templateId: string } | null }[];
  }>;
}
export interface WorkflowConfigurationPageProps {
  model: ConfigurationModel;
  act: (
    command: { type: string; [key: string]: unknown },
    message?: string,
    onError?: (message: string) => void,
  ) => unknown;
  close: () => void;
  initialTab?: 'types' | 'templates';
  onDirtyChange?: (dirty: boolean) => void;
}
