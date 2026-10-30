import {
  matchesWorkflowDocument,
  currentStepDocuments,
  stepWorkSatisfied,
} from './workflow-steps.js';
import { getTaskReview, getTaskCompletion, ownsTaskExecution } from './task-lifecycle.js';
export const BOARD_COLUMNS = [
  { id: 'todo', label: '待办' },
  { id: 'in_progress', label: '处理中' },
  { id: 'review', label: '评审中' },
  { id: 'done', label: '已完成' },
];

export function getBoardColumn(task) {
  return task.status === 'archived' ? null : task.status;
}

const phaseOf = (document) => document.stage ?? { 需求: 0, 设计: 1, 验证: 3 }[document.kind];
const present = (value) => typeof value === 'string' && value.trim().length > 0;
const check = (id, label, passed) => ({ id, label, passed: Boolean(passed) });

// Shared by drag planning and ordinary acceptance. The newest current-phase
// version must stand on its own; an older successful report cannot hide a
// newer failure or empty result. Legacy reports have no outcome metadata.
export function getStageReview(state, task) {
  const document = currentStepDocuments(task).at(-1);
  const owned = (state.sessions || []).filter((item) => item.taskId === task.id);
  const current = (state.sessions || []).find((item) => item.id === task.sessionId);
  const unconfirmedLegacy = document && document.outcome === undefined && task.attention === 'idle';
  const checks = [
    check(
      'active',
      '任务须处于可操作状态，请先恢复暂停或归档任务',
      ['in_progress', 'review'].includes(task.status) && Boolean(task.workflow),
    ),
    check(
      'stage',
      '须为有效且尚未验收的当前阶段',
      Number.isInteger(task.stage) &&
        task.stage >= 0 &&
        task.stage < task.workflow?.stepLabels.length &&
        task.accepted?.[task.stage] === false,
    ),
    check(
      'prerequisites',
      '前序阶段须全部验收通过',
      task.accepted?.length === task.workflow?.stepLabels.length &&
        task.accepted.slice(0, task.stage).every((accepted) => accepted === true),
    ),
    check(
      'attention',
      '失败、运行、等待或未知执行须先处理，不能直接提交验收',
      ['idle', 'review'].includes(task.attention),
    ),
    check(
      'execution',
      '本任务执行须已确知结束，运行、等待或未知会话须先核查',
      !owned.some((item) => !['idle', 'ended'].includes(item.status)) &&
        (!task.sessionId ||
          (current?.taskId === task.id && ['idle', 'ended'].includes(current.status))),
    ),
    check(
      'document',
      '当前阶段须有非空有效产出及准确的文档版本',
      document &&
        present(document.id) &&
        present(document.title) &&
        present(document.body) &&
        Number.isInteger(document.version) &&
        document.version > 0 &&
        (task.workflow?.steps
          ? stepWorkSatisfied(task, task.stage)
          : document.kind === '产物' ||
            document.kind === ['需求', '设计', '设计', '验证'][task.stage]) &&
        document.coverageComplete !== false,
    ),
    check(
      'freshness',
      document
        ? '当前产出已因返工或修改反馈过期，请生成或保存新版本后再评审'
        : '当前阶段须有本轮范围内的产出',
      document && document.stale !== true,
    ),
    check(
      'outcome',
      unconfirmedLegacy
        ? '旧版材料尚未确认本轮有效，请重新执行或保存新版本'
        : document
          ? '失败、等待或未知结果不能作为成功产出，请重新执行或人工保存新版本'
          : '当前阶段须有可审阅的产出',
      document &&
        ((task.workflow?.steps
          ? ['review', 'manual', 'passed', 'failed'].includes(document.outcome)
          : ['review', 'manual'].includes(document.outcome)) ||
          (document.outcome === undefined && task.attention === 'review')),
    ),
  ];
  return {
    checks,
    ...(document
      ? { document: { id: document.id, title: document.title, version: document.version } }
      : {}),
  };
}

export function getBoardMove(state, taskId, target) {
  const task = state.tasks.find((item) => item.id === taskId);
  const blocked = (checks) => ({
    kind: 'blocked',
    allowed: false,
    title: 'task.move-blocked',
    reason: checks
      .filter((item) => !item.passed)
      .map((item) => item.label)
      .join('；'),
    checks,
  });
  const planned = (kind, details = {}) => ({
    kind,
    allowed: true,
    title: `task.move-${kind}`,
    reason: `task.move-${kind}-hint`,
    checks: [],
    ...details,
  });
  if (!task) return blocked([check('task', 'task.not-found', false)]);
  if (!BOARD_COLUMNS.some((c) => c.id === target))
    return blocked([check('target', 'task.invalid-status', false)]);
  const source = getBoardColumn(task);
  if (source === target) return planned('noop');
  if (source === null) return blocked([check('archived', 'task.restore-first', false)]);
  if (target === 'in_progress') {
    if (source === 'todo')
      return task.paused ? blocked([check('paused', 'task.start-state', false)]) : planned('start');
    if (source === 'review') return planned('feedback');
    if (source === 'done') return planned('reopen');
  }
  if (target === 'todo' && source === 'in_progress')
    return ownsTaskExecution(state, task)
      ? blocked([check('execution', 'task.check-execution', false)])
      : planned('requeue');
  if (target === 'review' || target === 'done') {
    const gate =
      target === 'review'
        ? getTaskReview(state, task)
        : getTaskCompletion(state, task, { acceptSteps: true });
    if (!gate.allowed) return { ...blocked(gate.checks), snapshot: gate.snapshot };
    return planned(target === 'review' ? 'submit_review' : 'complete', gate);
  }
  return blocked([check('transition', 'task.invalid-transition', false)]);
}
