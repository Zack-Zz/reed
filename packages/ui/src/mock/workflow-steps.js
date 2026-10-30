export const documentPhase = (document) =>
  document.stage === undefined
    ? ({ 需求: 0, 设计: 1, 验证: 3 }[document.kind] ?? null)
    : document.stage;
// Legacy four-stage samples remain readable; adopted templates carry stable instance identity.
export const workflowStep = (task, at = task.stage) => task.workflow?.steps?.[at];
export const workflowStepName = (task, at = task.stage) =>
  task.workflow?.stepLabels?.[at] || 'task.processing';
export const matchesWorkflowDocument = (task, document, at = task.stage) =>
  documentPhase(document) === at &&
  (document.workflowInstanceId ?? null) === (task.workflow?.instanceId ?? null) &&
  !document.supersededWorkflow;
export const currentStepDocuments = (task, at = task.stage) => {
  const latest = new Map();
  for (const document of task.docs || [])
    if (matchesWorkflowDocument(task, document, at)) latest.set(document.title, document);
  return [...latest.values()];
};
export const stepWorkSatisfied = (task, index) => {
  const step = workflowStep(task, index),
    docs = currentStepDocuments(task, index).filter(
      (d) =>
        !d.stale &&
        d.body?.trim() &&
        d.coverageComplete !== false &&
        !['not_run', 'waiting', 'unknown'].includes(d.outcome),
    );
  return (
    docs.length > 0 &&
    (!step ||
      (docs.every((d) => d.coverageComplete === true) &&
        (step.mode !== 'agent' || docs.some((d) => d.origin?.kind === 'host'))))
  );
};

export const stepIsSkipped = (task, index) =>
  workflowStep(task, index)?.required === false &&
  (task.stepSkips || []).some(
    (skip) =>
      skip.applicability === 'valid' &&
      skip.scopeRevision === task.scopeRevision &&
      skip.instanceId === task.workflow?.instanceId &&
      skip.stepId === workflowStep(task, index)?.id &&
      skip.reason?.trim(),
  );
