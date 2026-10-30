// Evidence for the local relation preview only; no scheduler or Core contract.
const active = (relation) => relation.active !== false;
export const requiredRelationsOf = (state, taskId) =>
  (state.relations || []).filter(
    (r) =>
      active(r) &&
      r.fromTaskId === taskId &&
      r.required === true &&
      ['child', 'dependency'].includes(r.kind),
  );
export function captureRequiredRelations(state, task) {
  return requiredRelationsOf(state, task.id).map((relation) => {
    const target = state.tasks.find((item) => item.id === relation.toTaskId);
    const decision = target?.completions?.at(-1);
    return {
      relationId: relation.id,
      kind: relation.kind,
      taskId: relation.toTaskId,
      title: target?.title || relation.toTaskId,
      completionId:
        ['done', 'archived'].includes(target?.status) && decision?.applicability === 'valid'
          ? decision.id
          : null,
      scopeRevision: decision?.scopeRevision ?? null,
    };
  });
}
export function relationEvidenceValid(state, binding, visited = new Set()) {
  const task = state.tasks.find((item) => item.id === binding.taskId);
  const decision = task?.completions?.find((item) => item.id === binding.completionId);
  if (!decision || decision.applicability === 'pending') return false;
  const identity = `${task.id}:${decision.id}`;
  if (visited.has(identity)) return false;
  const nextVisited = new Set(visited).add(identity);
  let snapshot;
  try {
    snapshot = JSON.parse(decision.snapshot);
  } catch {
    return false;
  }
  if (!Array.isArray(snapshot.artifacts) || !snapshot.artifacts.length) return false;
  const unchanged = snapshot.artifacts.every((accepted) => {
    const document = task.docs.find((item) => item.id === accepted.id);
    return (
      document &&
      ['title', 'version', 'body', 'outcome', 'coverageComplete', 'stage'].every(
        (key) => document[key] === accepted[key],
      ) &&
      JSON.stringify(document.origin) === JSON.stringify(accepted.origin)
    );
  });
  return (
    unchanged &&
    (decision.requiredRelations || []).every((item) =>
      relationEvidenceValid(state, item, nextVisited),
    )
  );
}
export function getRequiredRelationCheck(state, task) {
  const bindings =
    task.status === 'review' && Array.isArray(task.review?.requiredRelations)
      ? task.review.requiredRelations
      : captureRequiredRelations(state, task);
  return {
    id: 'required_relations',
    label: 'relation.check-deliveries',
    passed: bindings.every((item) => relationEvidenceValid(state, item)),
  };
}
export function refreshRelationEvidence(state) {
  for (const task of state.tasks || []) {
    if (!['done', 'archived'].includes(task.status)) continue;
    for (const decision of task.completions || [])
      if (
        decision.applicability === 'valid' &&
        !(decision.requiredRelations || []).every((item) => relationEvidenceValid(state, item))
      )
        decision.applicability = 'pending';
  }
}

// A same-scope correction retracts accepted output, while a new scope preserves
// the historical fulfillment. Keep artifacts and decisions as audit history.
export function retractArtifactEvidence(task, affected) {
  for (const decision of task.completions || []) {
    if (decision.scopeRevision !== task.scopeRevision || decision.applicability === 'pending')
      continue;
    try {
      const artifacts = JSON.parse(decision.snapshot).artifacts;
      if (Array.isArray(artifacts) && artifacts.some((item) => affected.has(item.id)))
        decision.applicability = 'pending';
    } catch {
      decision.applicability = 'pending';
    }
  }
}
