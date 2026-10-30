import { ownsTaskExecution, preserveAndInvalidateScope } from './task-lifecycle.js';
const requireThat = (value, key) => {
  if (!value) throw new Error(key);
};
const active = (r) => r.active !== false;
function reachable(edges, from, to) {
  const seen = new Set(),
    pending = [from];
  while (pending.length) {
    const node = pending.pop();
    if (node === to) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const edge of edges) if (edge.fromTaskId === node) pending.push(edge.toTaskId);
  }
  return false;
}
export function applyRelationAction(state, task, action, emit) {
  if (action.type !== 'LINK_TASK') return false;
  const kind = action.relationKind;
  requireThat(['child', 'related', 'dependency'].includes(kind), 'relation.invalid-kind');
  const target = state.tasks.find((item) => item.id === action.targetTaskId);
  requireThat(target, 'relation.target-missing');
  requireThat(target.id !== task.id, 'relation.self-link');
  const required = action.required === true;
  requireThat(!required || kind !== 'related', 'relation.related-not-required');
  const same = (state.relations || []).find(
    (r) =>
      active(r) &&
      r.kind === kind &&
      ((r.fromTaskId === task.id && r.toTaskId === target.id) ||
        (kind === 'related' && r.fromTaskId === target.id && r.toTaskId === task.id)),
  );
  if (same) {
    requireThat(same.required === required, 'relation.already-linked');
    return true;
  }
  if (kind === 'child') {
    requireThat(['todo', 'in_progress'].includes(task.status), 'relation.reopen-parent');
    requireThat(
      !state.relations.some((r) => active(r) && r.kind === 'child' && r.toTaskId === target.id),
      'relation.second-parent',
    );
    requireThat(
      !reachable(
        state.relations.filter((r) => active(r) && r.kind === 'child'),
        target.id,
        task.id,
      ),
      'relation.tree-cycle',
    );
  }
  if (required) {
    requireThat(action.confirmScopeChange === true, 'relation.confirm-scope');
    requireThat(['todo', 'in_progress'].includes(task.status), 'relation.reopen-parent');
    requireThat(!ownsTaskExecution(state, task), 'task.check-execution');
    const waits = state.relations.filter(
      (r) => active(r) && r.required === true && ['child', 'dependency'].includes(r.kind),
    );
    requireThat(!reachable(waits, target.id, task.id), 'relation.wait-cycle');
    if (task.scopeRevision > 0) {
      preserveAndInvalidateScope(task);
      task.scopeRevision++;
    }
    task.relationRevision = (task.relationRevision || 0) + 1;
  }
  let number = state.relations.length + 1;
  while (state.relations.some((r) => r.id === `relation-${number}`)) number++;
  state.relations.push({
    id: `relation-${number}`,
    kind,
    fromTaskId: task.id,
    toTaskId: target.id,
    required,
    active: true,
    reason: typeof action.reason === 'string' ? action.reason.trim() : '',
    origin: { kind: 'local', system: 'reed' },
  });
  emit(task.id, 'relation.linked');
  return true;
}
