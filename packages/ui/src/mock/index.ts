import * as workflowSteps from './workflow-steps.js';
import * as configuration from './configuration.ts';
import { STAGES, createInitialState, reduce } from './model.js';
import * as personalBoard from './personal-board.js';
import * as taskLifecycle from './task-lifecycle.js';
import * as sources from './sources.js';
import * as connectors from './connectors.js';
import * as connectorDiscovery from './connector-discovery.js';
import { connectorReadable, connectorWritable, connectorStatus } from './connector-status.js';
import type { WorkbenchRuntime, WorkbenchStorage } from '../workbench/ports';

export interface MockWorkbenchRuntimeOptions {
  readonly storage?: WorkbenchStorage;
}

// This envelope describes the existing demo draft check, not a Core schema.
type PersistedDraft = {
  version?: unknown;
  model?: unknown;
};
const STORE = 'reed-demo-v2';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isCollection = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.every(isRecord);

const isRelationBindings = (value: unknown): boolean =>
  value === undefined ||
  (isCollection(value) &&
    value.every(
      (binding) =>
        typeof binding.relationId === 'string' &&
        ['child', 'dependency'].includes(String(binding.kind)) &&
        typeof binding.taskId === 'string' &&
        (binding.title === undefined || typeof binding.title === 'string') &&
        (binding.completionId === null || typeof binding.completionId === 'string') &&
        (binding.scopeRevision === null || Number.isInteger(binding.scopeRevision)),
    ));

// Only the current preview's renderable structure, not a Core/domain schema.
function isUsableDraft(model: unknown): boolean {
  if (!isRecord(model) || !isCollection(model.tasks) || model.tasks.length === 0) return false;
  if (![model.sessions, model.branches, model.events].every(isCollection)) return false;
  if (
    model.relations !== undefined &&
    (!isCollection(model.relations) ||
      !model.relations.every(
        (relation) =>
          typeof relation.id === 'string' &&
          ['child', 'related', 'dependency'].includes(String(relation.kind)) &&
          typeof relation.fromTaskId === 'string' &&
          typeof relation.toTaskId === 'string' &&
          typeof relation.required === 'boolean' &&
          (relation.reason === undefined || typeof relation.reason === 'string') &&
          (relation.active === undefined || typeof relation.active === 'boolean'),
      ))
  )
    return false;
  if (model.configuration !== undefined && !configuration.isConfiguration(model.configuration))
    return false;
  return model.tasks.every(
    (task) =>
      ['id', 'title', 'project'].every((key) => typeof task[key] === 'string') &&
      (task.stage === null || Number.isInteger(task.stage)) &&
      isRecord(task.workspace) &&
      (task.taskType === undefined ||
        configuration
          .getTaskTypes(model as never, true)
          .some((type) => type.id === task.taskType)) &&
      (task.goal === undefined || typeof task.goal === 'string') &&
      (task.criteria === undefined ||
        (isCollection(task.criteria) &&
          task.criteria.every(
            (item) => typeof item.id === 'string' && typeof item.text === 'string',
          ))) &&
      (task.scopeRevision === undefined ||
        (Number.isInteger(task.scopeRevision) && Number(task.scopeRevision) >= 0)) &&
      (task.workflow === undefined ||
        task.workflow === null ||
        (isRecord(task.workflow) &&
          typeof task.workflow.templateId === 'string' &&
          Array.isArray(task.workflow.stepLabels) &&
          task.workflow.stepLabels.length > 0 &&
          task.workflow.stepLabels.length <= 24 &&
          task.workflow.stepLabels.every((label) => typeof label === 'string'))) &&
      configuration.isAdoptedWorkflow(task.workflow, task.accepted, task.stage) &&
      (task.review == null ||
        (isRecord(task.review) &&
          typeof task.review.id === 'string' &&
          typeof task.review.snapshot === 'string' &&
          Array.isArray(task.review.criteria) &&
          isCollection(task.review.artifacts) &&
          isRelationBindings(task.review.requiredRelations))) &&
      (task.reviews === undefined || isCollection(task.reviews)) &&
      (task.completions === undefined ||
        (isCollection(task.completions) &&
          task.completions.every((completion) =>
            isRelationBindings(completion.requiredRelations),
          ))) &&
      Array.isArray(task.accepted) &&
      Array.isArray(task.notes) &&
      Array.isArray(task.sessionIds) &&
      (task.description == null || typeof task.description === 'string') &&
      (task.references == null ||
        (isCollection(task.references) &&
          task.references.every(
            (reference) =>
              ['file', 'link'].includes(String(reference.kind)) &&
              typeof reference.name === 'string' &&
              typeof reference.location === 'string',
          ))) &&
      isCollection(task.docs) &&
      task.docs.every((document) => typeof document.body === 'string'),
  );
}

export function createMockWorkbenchRuntime(
  options: MockWorkbenchRuntimeOptions = {},
): WorkbenchRuntime {
  // Browser storage may throw even on property access. Resolve it only inside
  // load/save so importing the library and constructing a runtime are safe.
  const storage = (): WorkbenchStorage => options.storage ?? globalThis.localStorage;
  return {
    mode: 'mock',
    load() {
      try {
        const saved = JSON.parse(storage().getItem(STORE) ?? 'null') as PersistedDraft | null;
        if ((saved?.version === 2 || saved?.version === 3) && isUsableDraft(saved.model))
          return sources.normalizeState(saved.model);
      } catch {
        /* Missing/corrupt demo drafts fall back to samples. */
      }
      return createInitialState();
    },
    save(snapshot) {
      try {
        storage().setItem(STORE, JSON.stringify({ version: 3, model: snapshot }));
        return true;
      } catch {
        return false;
      }
    },
    createInitialState,
    reduce,
    services: {
      STAGES,
      ...configuration,
      ...workflowSteps,
      ...personalBoard,
      ...taskLifecycle,
      ...sources,
      ...connectors,
      ...connectorDiscovery,
      connectorReadable,
      connectorWritable,
      connectorStatus,
    },
  };
}
