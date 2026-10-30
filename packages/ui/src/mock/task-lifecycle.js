import { getTaskTypes, selectWorkflow } from './configuration.ts';
import {
  workflowStep,
  currentStepDocuments,
  matchesWorkflowDocument,
  stepWorkSatisfied,
  stepIsSkipped,
} from './workflow-steps.js';
import {
  captureRequiredRelations,
  getRequiredRelationCheck,
  relationEvidenceValid,
  retractArtifactEvidence,
} from './relation-evidence.js';
// Local preview rules only. These are not Core entities or a wire contract.
export const TASK_TYPES = [
  { id: 'uncategorized', label: '未分类' },
  { id: 'requirement', label: '需求' },
  { id: 'development', label: '开发' },
  { id: 'test', label: '测试' },
  { id: 'verification', label: '验证' },
  { id: 'documentation', label: '文档' },
];
export const TASK_STATUSES = [
  { id: 'todo', label: '待办' },
  { id: 'in_progress', label: '处理中' },
  { id: 'review', label: '评审中' },
  { id: 'done', label: '已完成' },
  { id: 'archived', label: '已归档' },
];
export const DEVELOPMENT_WORKFLOW = {
  templateId: 'development',
  name: '研发流程',
  stepLabels: ['需求', '设计', '开发', '验证'],
};
const present = (value) => typeof value === 'string' && Boolean(value.trim());
const requireThat = (value, key) => {
  if (!value) throw new Error(key);
};
const idFor = (items, prefix) => {
  let id = items.length + 1;
  while (items.some((item) => item.id === `${prefix}-${id}`)) id++;
  return `${prefix}-${id}`;
};
export const needsCodeWorkspace = (task) =>
  task.executionRequiresCode === true ||
  (workflowStep(task)
    ? workflowStep(task).requiresCode
    : Boolean(task.workflow && task.stage >= 2));
export const ownsTaskExecution = (state, task) =>
  ['running', 'waiting', 'unknown'].includes(task.attention) ||
  state.sessions.some(
    (session) =>
      session.taskId === task.id && ['running', 'waiting', 'unknown'].includes(session.status),
  );

// Only legacy task data is migrated. Existing lifecycle facts remain independent
// of attention, sessions and steps; an Agent ending cannot submit task review.
export function normalizeTask(task) {
  if (
    !TASK_STATUSES.some((item) => item.id === task.status) ||
    (task.taskType === undefined && task.workflow === undefined && task.scopeRevision === undefined)
  ) {
    const oldStatus = task.status;
    task.legacyState ??= {
      status: oldStatus,
      stage: task.stage,
      accepted: [...(task.accepted || [])],
      archivedFrom: task.archivedFrom,
    };
    task.paused = oldStatus === 'paused';
    task.status =
      task.hasStarted ||
      task.stage > 0 ||
      task.accepted?.some(Boolean) ||
      ['running', 'waiting', 'review', 'failed', 'unknown'].includes(task.attention)
        ? 'in_progress'
        : 'todo';
    if (['completed', 'archived'].includes(oldStatus)) {
      task.status = 'in_progress';
      task.migrationNotice = 'task.migration-review';
    }
    task.workflow ??= Number.isInteger(task.stage)
      ? { ...DEVELOPMENT_WORKFLOW, stepLabels: [...DEVELOPMENT_WORKFLOW.stepLabels] }
      : null;
  }
  task.taskType ??= 'uncategorized';
  task.workflow ??= null;
  if (!task.workflow) {
    task.stage = null;
    task.accepted = [];
  }
  task.paused ??= false;
  task.goal ??= '';
  task.criteria ??= [];
  task.scopeRevision ??= 0;
  task.requirePassingResult ??= false;
  task.review ??= null;
  task.reviews ??= [];
  task.completions ??= [];
  task.workflowHistory ??= [];
  task.scopeHistory ??= [];
  if (['done', 'archived'].includes(task.status)) {
    for (const completion of task.completions)
      if (
        completion.applicability === 'valid' &&
        (completion.basisSnapshot ?? completion.snapshot) !== taskSnapshot(task)
      )
        completion.applicability = 'pending';
  }
  return task;
}
export function preserveAndInvalidateScope(task) {
  task.scopeHistory.push({
    revision: task.scopeRevision,
    goal: task.goal,
    criteria: structuredClone(task.criteria),
    requirePassingResult: task.requirePassingResult,
    workflow: structuredClone(task.workflow),
    accepted: [...task.accepted],
  });
  for (const skip of task.stepSkips || [])
    if (skip.instanceId === task.workflow?.instanceId) skip.applicability = 'invalidated';
  task.docs.forEach((d) => {
    d.stale = true;
  });
  if (task.workflow) {
    task.accepted = task.accepted.map(() => false);
    task.stage = 0;
  }
  task.sessionId = null;
  task.attention = 'idle';
  task.workspace.verified = false;
}

export function currentArtifacts(task) {
  const latest = new Map();
  for (const document of task.docs || [])
    if (!document.supersededWorkflow)
      latest.set(
        JSON.stringify([
          document.workflowInstanceId ?? null,
          document.stage ?? null,
          document.title,
        ]),
        document,
      );
  return [...latest.values()];
}
export function taskSnapshot(task) {
  return JSON.stringify({
    taskId: task.id,
    taskType: task.taskType,
    goal: task.goal,
    criteria: task.criteria,
    scopeRevision: task.scopeRevision,
    requirePassingResult: task.requirePassingResult,
    workflow: task.workflow,
    ...(task.relationRevision ? { relationRevision: task.relationRevision } : {}),
    artifacts: currentArtifacts(task).map((d) => ({
      id: d.id,
      title: d.title,
      version: d.version,
      body: d.body,
      outcome: d.outcome,
      origin: d.origin,
      stage: d.stage,
      coverageComplete: d.coverageComplete,
      stale: d.stale,
    })),
  });
}
// Freeze relation completion identities alongside the task's own review input.
// Legacy snapshots remain readable; their saved bindings are never recaptured.
const withRelationBindings = (snapshot, bindings) =>
  bindings.length
    ? JSON.stringify({ ...JSON.parse(snapshot), requiredRelations: bindings })
    : snapshot;
const reviewBindings = (state, task) =>
  task.status === 'review' && Array.isArray(task.review?.requiredRelations)
    ? task.review.requiredRelations
    : captureRequiredRelations(state, task);
const gateRelations = (state, bindings) =>
  bindings.map((binding) => ({ ...binding, valid: relationEvidenceValid(state, binding) }));
const check = (id, label, passed) => ({ id, label, passed: Boolean(passed) });
function outputChecks(state, task) {
  const artifacts = currentArtifacts(task);
  return [
    check('goal', 'task.check-goal', present(task.goal) && task.scopeRevision > 0),
    check(
      'criteria',
      'task.check-criteria',
      task.criteria.length > 0 && task.criteria.every((c) => present(c.id) && present(c.text)),
    ),
    check(
      'artifacts',
      'task.check-artifacts',
      artifacts.length > 0 &&
        artifacts.every(
          (d) =>
            present(d.id) &&
            present(d.title) &&
            present(d.body) &&
            Number.isInteger(d.version) &&
            d.version > 0 &&
            !d.stale,
        ),
    ),
    check(
      'source',
      'task.check-source',
      artifacts.length > 0 &&
        artifacts.every(
          (d) =>
            (d.origin?.kind === 'local' && present(d.origin.system)) ||
            (d.origin?.kind === 'host' && present(d.origin.host)) ||
            (d.origin?.kind === 'connector' &&
              present(d.origin.connectorId) &&
              present(d.origin.externalId)),
        ),
    ),
    check(
      'coverage',
      'task.check-coverage',
      artifacts.length > 0 &&
        artifacts.every(
          (d) =>
            d.coverageComplete !== false && !['waiting', 'unknown', 'not_run'].includes(d.outcome),
        ),
    ),
    check(
      'quality',
      'task.check-quality',
      !task.requirePassingResult ||
        (artifacts.some((d) => d.outcome === 'passed') &&
          artifacts.every((d) => !['failed', 'not_run', 'waiting', 'unknown'].includes(d.outcome))),
    ),
    check('execution', 'task.check-execution', !ownsTaskExecution(state, task)),
    getRequiredRelationCheck(state, task),
    check(
      'work',
      'task.check-workflow-work',
      !task.workflow ||
        (task.accepted.length === task.workflow.stepLabels.length &&
          task.accepted.every((accepted, index) =>
            task.workflow.steps
              ? stepWorkSatisfied(task, index) || stepIsSkipped(task, index)
              : accepted || stepWorkSatisfied(task, index),
          )),
    ),
  ];
}
export function getTaskReview(state, task) {
  const checks = [
    check('status', 'task.check-submit-state', ['todo', 'in_progress'].includes(task.status)),
    ...outputChecks(state, task),
  ];
  const bindings = captureRequiredRelations(state, task);
  return {
    checks,
    allowed: checks.every((c) => c.passed),
    snapshot: withRelationBindings(taskSnapshot(task), bindings),
    requiredRelations: gateRelations(state, bindings),
  };
}
export function getTaskCompletion(state, task, { acceptSteps = false } = {}) {
  const bindings = reviewBindings(state, task);
  const snapshot = withRelationBindings(taskSnapshot(task), bindings);
  const frozen =
    task.review?.snapshot &&
    withRelationBindings(task.review.snapshot, task.review.requiredRelations || []);
  const checks = [
    check(
      'status',
      'task.check-review-state',
      task.status === 'review' && task.review?.status === 'submitted',
    ),
    check('snapshot', 'task.check-snapshot', frozen === snapshot),
    ...outputChecks(state, task),
    check(
      'steps',
      'task.check-workflow-acceptance',
      !task.workflow ||
        task.accepted.every(
          (accepted, index) => accepted || task.workflow.steps?.[index]?.required === false,
        ) ||
        acceptSteps === true,
    ),
  ];
  return {
    checks,
    allowed: checks.every((c) => c.passed),
    snapshot,
    requiredRelations: gateRelations(state, bindings),
  };
}
const assertEditable = (task) => {
  requireThat(task.status !== 'review', 'task.withdraw-before-change');
  requireThat(['todo', 'in_progress'].includes(task.status), 'task.reopen-before-change');
};
const requireGate = (gate) =>
  requireThat(
    gate.allowed,
    gate.checks
      .filter((c) => !c.passed)
      .map((c) => c.label)
      .join('；'),
  );
const requireSnapshot = (snapshot, action) =>
  requireThat(action.expectedSnapshot === snapshot, 'task.snapshot-changed');
const markPending = (task) => {
  if (task.source === '云效' && !['conflict', 'unknown'].includes(task.sync)) task.sync = 'pending';
};

export function applyTaskAction(state, task, action, emit) {
  switch (action.type) {
    case 'UPDATE_TASK_TYPE':
      assertEditable(task);
      requireThat(
        action.taskType === task.taskType ||
          getTaskTypes(state).some((type) => type.id === action.taskType),
        'task.invalid-type',
      );
      requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
      task.typeHistory ??= [];
      if (task.taskType !== action.taskType) task.typeHistory.push(task.taskType);
      task.taskType = action.taskType;
      emit(task.id, 'task.type-saved');
      return true;
    case 'START_TASK':
      if (task.status === 'in_progress') return true;
      requireThat(task.status === 'todo' && !task.paused, 'task.start-state');
      task.status = 'in_progress';
      task.hasStarted = true;
      emit(task.id, 'task.started');
      return true;
    case 'REQUEUE_TASK':
      requireThat(task.status === 'in_progress', 'task.requeue-state');
      requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
      task.status = 'todo';
      emit(task.id, 'task.requeued');
      return true;
    case 'SAVE_TASK_SCOPE': {
      assertEditable(task);
      requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
      requireThat(present(action.goal), 'task.check-goal');
      requireThat(
        Array.isArray(action.criteria) && action.criteria.length > 0,
        'task.check-criteria',
      );
      const criteria = action.criteria.map((c, index) => ({
        id: (typeof c === 'object' && c?.id) || `criterion-${index + 1}`,
        text: typeof c === 'string' ? c.trim() : c?.text?.trim(),
      }));
      requireThat(
        criteria.every((c) => present(c.text)) &&
          new Set(criteria.map((c) => c.id)).size === criteria.length,
        'task.check-criteria',
      );
      const changed =
        task.goal !== action.goal.trim() ||
        JSON.stringify(task.criteria) !== JSON.stringify(criteria) ||
        task.requirePassingResult !== Boolean(action.requirePassingResult);
      if (changed) {
        if (task.scopeRevision > 0) preserveAndInvalidateScope(task);
        task.goal = action.goal.trim();
        task.criteria = criteria;
        task.scopeRevision++;
        task.requirePassingResult = Boolean(action.requirePassingResult);
      }
      emit(task.id, 'task.scope-saved');
      return true;
    }
    case 'ADD_TASK_ARTIFACT': {
      assertEditable(task);
      requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
      requireThat(present(action.title) && present(action.body), 'task.artifact-required');
      const outcome = action.outcome || 'manual';
      requireThat(
        ['manual', 'passed', 'failed', 'not_run'].includes(outcome),
        'task.invalid-outcome',
      );
      const source = action.sourceDocId
        ? task.docs.find((doc) => doc.id === action.sourceDocId)
        : null;
      requireThat(!action.sourceDocId || source, 'task.artifact-required');
      const title = action.title.trim();
      if (source && task.workflow && source.stage != null)
        requireThat(
          matchesWorkflowDocument(task, source) && !task.accepted[task.stage],
          'selection.rework-before-artifact',
        );
      const artifactStage =
        source?.stage === null || (task.workflow && task.accepted[task.stage])
          ? null
          : task.workflow
            ? task.stage
            : null;
      const affected = new Set(
        task.docs
          .filter((d) => d.title === title && (d.stage ?? null) === artifactStage)
          .map((d) => d.id),
      );
      let ancestor = source;
      while (ancestor && !affected.has(ancestor.id)) {
        affected.add(ancestor.id);
        ancestor = task.docs.find((d) => d.id === ancestor.basedOn);
      }
      retractArtifactEvidence(task, affected);
      task.docs.push({
        id: idFor(task.docs, `${task.id}-artifact`),
        title,
        version:
          Math.max(0, ...task.docs.filter((d) => d.title === title).map((d) => d.version)) + 1,
        basedOn: source?.id,
        body: action.body.trim(),
        kind: '产物',
        stage: artifactStage,
        outcome,
        coverageComplete: action.coverageComplete === true,
        scopeRevision: task.scopeRevision,
        ...(task.workflow?.instanceId ? { workflowInstanceId: task.workflow.instanceId } : {}),
        origin: { kind: 'local', system: 'reed', actor: 'manual' },
      });
      emit(task.id, 'task.artifact-saved');
      return true;
    }
    case 'ACKNOWLEDGE_STEP_COVERAGE': {
      assertEditable(task);
      requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
      const document = currentStepDocuments(task).find((d) => d.id === action.documentId);
      requireThat(
        document &&
          document.version === action.documentVersion &&
          document.origin?.kind === 'host' &&
          !document.stale,
        'task.snapshot-changed',
      );
      requireThat(typeof action.coverageComplete === 'boolean', 'config.configuration-invalid');
      document.coverageComplete = action.coverageComplete;
      if (action.coverageComplete === false) task.accepted[task.stage] = false;
      emit(task.id, 'selection.coverageSaved');
      return true;
    }
    case 'REUSE_TASK_ARTIFACT': {
      assertEditable(task);
      requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
      const doc = task.docs.find((d) => d.id === action.documentId);
      requireThat(doc, 'task.artifact-required');
      requireThat(action.expectedScopeRevision === task.scopeRevision, 'task.snapshot-changed');
      if (doc.supersededWorkflow)
        task.docs.push({
          ...structuredClone(doc),
          id: idFor(task.docs, `${task.id}-reuse`),
          basedOn: doc.id,
          stage: null,
          workflowInstanceId: task.workflow?.instanceId,
          supersededWorkflow: false,
          stale: false,
          reusedForScope: task.scopeRevision,
        });
      else {
        doc.stale = false;
        doc.reusedForScope = task.scopeRevision;
      }
      emit(task.id, 'task.artifact-reused');
      return true;
    }
    case 'SUBMIT_TASK_REVIEW': {
      const gate = getTaskReview(state, task);
      requireSnapshot(gate.snapshot, action);
      requireGate(gate);
      const review = {
        id: idFor(task.reviews, `${task.id}-review`),
        status: 'submitted',
        snapshot: gate.snapshot,
        scopeRevision: task.scopeRevision,
        scope: { goal: task.goal, criteria: structuredClone(task.criteria) },
        taskType: task.taskType,
        taskTypeName: state.configuration.taskTypes.find((t) => t.id === task.taskType)?.name,
        goal: task.goal,
        criteria: structuredClone(task.criteria),
        requiredRelations: captureRequiredRelations(state, task),
        artifacts: currentArtifacts(task).map((d) => ({
          id: d.id,
          title: d.title,
          version: d.version,
          body: d.body,
          outcome: d.outcome,
          origin: structuredClone(d.origin),
          stage: d.stage,
        })),
      };
      task.reviews.push(review);
      task.review = review;
      task.status = 'review';
      task.hasStarted = true;
      emit(task.id, 'task.review-submitted');
      return true;
    }
    case 'WITHDRAW_TASK_REVIEW':
    case 'REQUEST_TASK_CHANGES': {
      requireThat(
        task.status === 'review' && task.review?.status === 'submitted',
        'task.check-review-state',
      );
      requireThat(present(action.reason), 'task.reason-required');
      task.review.status =
        action.type === 'WITHDRAW_TASK_REVIEW' ? 'withdrawn' : 'changes_requested';
      task.review.reason = action.reason.trim();
      const historical = task.reviews.find((r) => r.id === task.review.id);
      if (historical) Object.assign(historical, task.review);
      task.status = 'in_progress';
      task.notes.push(action.reason.trim());
      emit(task.id, 'task.review-withdrawn');
      return true;
    }
    case 'COMPLETE_TASK': {
      const gate = getTaskCompletion(state, task, { acceptSteps: action.acceptSteps === true });
      requireSnapshot(gate.snapshot, action);
      requireGate(gate);
      if (action.acceptSteps === true && task.workflow) {
        const checkWork = outputChecks(state, task);
        requireGate({ checks: checkWork, allowed: checkWork.every((c) => c.passed) });
        // Explicit combined acceptance changes only the step decisions; the frozen
        // review must still match before these decisions are applied.
        task.accepted = task.accepted.map(() => true);
        // Step decisions do not rewrite the frozen review input or artifacts.
      }
      requireGate(getTaskCompletion(state, task));
      requireThat(
        Array.isArray(action.criterionIds) &&
          task.criteria.every((c) => action.criterionIds.includes(c.id)),
        'task.accept-all-criteria',
      );
      task.review.status = 'accepted';
      const old = task.reviews.find((r) => r.id === task.review.id);
      if (old) old.status = 'accepted';
      task.completions.push({
        id: idFor(task.completions, `${task.id}-completion`),
        reviewId: task.review.id,
        scopeRevision: task.scopeRevision,
        snapshot: gate.snapshot,
        basisSnapshot: taskSnapshot(task),
        criterionIds: [...action.criterionIds],
        applicability: 'valid',
        actor: 'user',
        requiredRelations: structuredClone(task.review.requiredRelations || []),
      });
      task.status = 'done';
      emit(task.id, 'task.completed');
      markPending(task);
      return true;
    }
    case 'ARCHIVE_TASK':
      requireThat(task.status === 'done', 'task.archive-done-only');
      requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
      task.status = 'archived';
      emit(task.id, 'task.archived');
      return true;
    case 'RESTORE_TASK':
      requireThat(task.status === 'archived', 'task.restore-archived-only');
      requireThat(task.completions.length > 0, 'task.completion-missing');
      task.status = 'done';
      emit(task.id, 'task.restored');
      return true;
    case 'REOPEN_TASK':
      requireThat(task.status === 'done', 'task.reopen-done-only');
      requireThat(present(action.reason), 'task.reason-required');
      requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
      task.completions.forEach((c) => {
        if (c.applicability === 'valid') c.applicability = 'superseded';
      });
      task.status = 'in_progress';
      task.review = null;
      task.hasStarted = true;
      task.notes.push(action.reason.trim());
      emit(task.id, 'task.reopened');
      markPending(task);
      return true;
    case 'SET_TASK_WORKFLOW': {
      assertEditable(task);
      requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
      const selected = selectWorkflow(state, action.templateId, action.templateVersion);
      if (
        (task.workflow?.templateId ?? null) === (selected?.templateId ?? null) &&
        (task.workflow?.version ?? 1) === (selected?.version ?? 1)
      )
        return true;
      const changing = Boolean(task.workflow || task.docs.length || task.scopeRevision > 0);
      if (changing) {
        requireThat(action.expectedSnapshot === taskSnapshot(task), 'task.snapshot-changed');
        requireThat(
          action.confirmChange === true && present(action.reason),
          'selection.confirm-change',
        );
      }
      const prior = task.workflow;
      const carried = getWorkflowCarry(task);
      const reuseIds = Array.isArray(action.reuseDocumentIds) ? action.reuseDocumentIds : [];
      requireThat(
        reuseIds.every((id) =>
          task.docs.some((d) => d.id === id && !d.supersededWorkflow && !d.stale),
        ),
        'task.snapshot-changed',
      );
      const reused = task.docs
        .filter((d) => reuseIds.includes(d.id))
        .map((d) => structuredClone(d));
      task.workflowHistory.push({
        workflow: structuredClone(prior),
        accepted: [...task.accepted],
        stage: task.stage,
        reason: action.reason || '',
        stepSkips: structuredClone(task.stepSkips || []),
      });
      if (task.scopeRevision > 0) {
        preserveAndInvalidateScope(task);
        task.scopeRevision++;
      }
      task.criteria.push(...carried.filter((c) => !task.criteria.some((old) => old.id === c.id)));
      task.docs.forEach((d) => {
        d.supersededWorkflow = true;
      });
      task.workflow = selected
        ? { ...selected, instanceId: `${task.id}-flow-${task.workflowHistory.length + 1}` }
        : null;
      task.stage = task.workflow ? 0 : null;
      task.accepted = selected ? selected.steps.map(() => false) : [];
      task.sessionId = null;
      task.attention = 'idle';
      task.workspace.verified = false;
      task.suggestedCriteria = selected?.suggestedCriteria || [];
      for (const d of reused)
        task.docs.push({
          ...d,
          id: idFor(task.docs, `${task.id}-reuse`),
          basedOn: d.id,
          stage: null,
          workflowInstanceId: task.workflow?.instanceId,
          supersededWorkflow: false,
          stale: false,
          reusedForScope: task.scopeRevision,
        });
      if (action.reason) task.notes.push(action.reason.trim());
      emit(task.id, 'task.workflow-saved');
      return true;
    }
    case 'SKIP_WORKFLOW_STEP': {
      assertEditable(task);
      requireThat(task.status === 'in_progress', 'task.start-first');
      requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
      requireThat(
        action.expectedStage === task.stage &&
          workflowStep(task)?.required === false &&
          present(action.reason),
        'selection.skip-unavailable',
      );
      task.stepSkips ??= [];
      task.stepSkips.push({
        instanceId: task.workflow.instanceId,
        stepId: workflowStep(task).id,
        reason: action.reason.trim(),
        scopeRevision: task.scopeRevision,
        applicability: 'valid',
      });
      task.accepted[task.stage] = true;
      if (task.stage < task.workflow.stepLabels.length - 1) task.stage++;
      task.sessionId = null;
      task.attention = 'idle';
      emit(task.id, 'selection.step-skipped');
      return true;
    }
    case 'TOGGLE_PAUSE':
      requireThat(['todo', 'in_progress', 'review'].includes(task.status), 'task.pause-state');
      task.paused = !task.paused;
      emit(task.id, task.paused ? 'task.paused' : 'task.resumed');
      return true;
    default:
      return false;
  }
}

export function getWorkflowCarry(task) {
  if (!task.workflow) return [];
  return task.workflow.stepLabels.flatMap((name, index) => {
    const step = workflowStep(task, index);
    if (task.accepted[index] || step?.required === false) return [];
    return [
      {
        id: `carry-${task.workflow.instanceId || 'legacy'}-${step?.id || index}`,
        text: [name, step?.goal, ...(step?.outputs || []), ...(step?.checks || [])]
          .filter(Boolean)
          .join(' · '),
      },
    ];
  });
}
export function getWorkflowChange(state, task) {
  return {
    snapshot: taskSnapshot(task),
    allowed: ['todo', 'in_progress'].includes(task.status) && !ownsTaskExecution(state, task),
    carriedCriteria: getWorkflowCarry(task),
  };
}
