const copy = {
  addCriterion: ['添加条件', 'Add criterion'],
  criterionNumber: ['验收条件 {number}', 'Acceptance criterion {number}'],
  removeCriterion: ['移除验收条件 {number}', 'Remove acceptance criterion {number}'],
  criterionHint: [
    '写明如何判断这项工作已经完成，可保留多行说明。',
    'Describe how to judge completion. Multi-line details are retained.',
  ],
  invalidatedSkip: ['原跳过记录已失效', 'Previous skip no longer applies'],
  skipHint: [
    '可选步骤会保留跳过原因，任务状态保持不变。',
    'The optional-step skip reason is retained. The task lifecycle stays unchanged.',
  ],
  skipped: ['已跳过', 'Skipped'],
  skipRecorded: ['跳过原因：{reason}', 'Skip reason: {reason}'],
  'rework-before-artifact': [
    '请先返工到原步骤，再修改已确认的步骤产物。',
    'Reopen the original step before revising its accepted artifact.',
  ],
  coverageConfirm: [
    '已核对原始结果，确认覆盖本步骤的必要工作与产物要求',
    'I reviewed the original result and confirm the required work and outputs are covered',
  ],
  coverageSaved: ['步骤覆盖确认已保存', 'Step coverage confirmation saved'],
  field: ['流程模板（可后补）', 'Workflow template (optional)'],
  version: ['流程版本', 'Workflow version'],
  recommended: ['推荐', 'Recommended'],
  required: ['必要', 'Required'],
  optional: ['可选', 'Optional'],
  outputs: ['产物要求：', 'Required outputs: '],
  versionHint: [
    '创建或采用时固定此版本；后续模板更新不改动本任务。',
    'The selected version is pinned on adoption. Later template updates do not change this task.',
  ],
  noneHint: [
    '不选流程也可以人工处理、提交产物并完成任务级验收。',
    'Work directly, add artifacts and complete task-level review without an internal workflow.',
  ],
  manage: ['管理类型与模板', 'Manage types and templates'],
  unavailableSelected: ['原选择已停用或不可用', 'Previous selection is disabled or unavailable'],
  changeHint: [
    '选择流程只定义内部工作，不会启动 Agent 或改变任务生命周期。',
    'Selecting a workflow defines internal work. It does not start an Agent or change the task lifecycle.',
  ],
  currentVersion: ['当前：{name} · V{version}', 'Current: {name} · V{version}'],
  impact: ['变更影响', 'Change impact'],
  resetHint: [
    '新流程的步骤将重新确认；旧流程、接受记录和产物保留在历史中。',
    'Confirm the new workflow steps independently. The previous workflow, decisions and artifacts remain in history.',
  ],
  carryHint: [
    '原必要工作将保留在任务验收条件中',
    'Unfinished required work will remain in the task acceptance criteria',
  ],
  noCarry: ['没有尚未完成的必要步骤。', 'There are no unfinished required steps.'],
  taskAcceptance: [
    '这些条件仍须在任务级评审中逐项验收，移除流程不取消交付承诺。',
    'These conditions still require task-level acceptance. Removing a workflow does not cancel delivery commitments.',
  ],
  reuse: ['核对旧产物的复用', 'Review existing artifacts for reuse'],
  reuseHint: [
    '仅复用已打开核对的准确版本，作为任务材料保留；新步骤的通过结果独立确认。',
    'Reuse only exact versions you have reviewed as task material. Confirm the new step results independently.',
  ],
  reuseConfirm: [
    '已核对，复用此版本为任务材料',
    'I reviewed this version and will reuse it as task material',
  ],
  reason: ['变更原因', 'Reason for change'],
  confirmImpact: [
    '我确认流程、必要工作和产物的变化，并保留原交付条件。',
    'I confirm the changes to workflow, required work and artifacts while retaining the delivery criteria.',
  ],
  stateBlocked: [
    '请先撤回评审；完成任务先重开，归档任务先恢复再重开。运行、等待或未知执行须先结束或核查。',
    'Withdraw the review first. Reopen completed tasks; restore archived tasks before reopening. End or reconcile running, waiting or unknown execution.',
  ],
  changed: [
    '任务依据已变化，请关闭后重新核对。',
    'The task basis changed. Close and review the change again.',
  ],
  'confirm-change': ['请明确确认影响并填写变更原因。', 'Confirm the impact and provide a reason.'],
  'template-unavailable': [
    '模板已停用或不可用，请重新选择；已有任务保留原版本。',
    'The template is disabled or unavailable. Choose again; adopted tasks retain their version.',
  ],
  'version-unavailable': [
    '没有可采用的已启用版本。',
    'No published version is available for adoption.',
  ],
  'unclassified-required': [
    '未分类是保留的兜底类型，不能停用。',
    'Uncategorized is the reserved fallback and cannot be disabled.',
  ],
  'manual-only': ['此步骤配置为人工处理。', 'This step is configured for manual work.'],
  'skip-unavailable': [
    '仅可跳过当前可选步骤，并需记录原因。',
    'Only the current optional step can be skipped, with a reason.',
  ],
  'step-skipped': ['已记录可选步骤跳过原因。', 'The optional-step skip reason was recorded.'],
  newType: ['新建类型', 'New type'],
  typeName: ['类型名称', 'Type name'],
  cancel: ['取消', 'Cancel'],
  saveType: ['保存并选用类型', 'Save and select type'],
  skip: ['跳过可选步骤', 'Skip optional step'],
  skipReason: ['跳过原因', 'Reason for skipping'],
  requirements: ['本步骤要求', 'Step requirements'],
  historical: ['历史流程产物', 'Historical workflow artifact'],
  suggestions: ['模板建议验收条件', 'Suggested template criteria'],
  useSuggestions: ['加入验收条件草稿', 'Add to acceptance draft'],
  leaveTitle: ['保留未保存的配置？', 'Keep unsaved configuration?'],
  leaveHint: [
    '当前配置尚未保存，离开会丢弃本页修改。',
    'This configuration has unsaved changes. Leaving discards them.',
  ],
  stay: ['继续编辑', 'Continue editing'],
  leave: ['放弃修改并离开', 'Discard and leave'],
  history: ['流程变更历史', 'Workflow change history'],
} as const;
export const selectionMessages = Object.fromEntries(
  Object.entries(copy).map(([k, v]) => [`selection.${k}`, v[1]]),
);
export const selectionChineseLabels = Object.fromEntries(
  Object.entries(copy).map(([k, v]) => [`selection.${k}`, v[0]]),
);
Object.assign(selectionMessages, {
  测试执行: 'Test execution',
  测试计划: 'Test plan',
  用例准备: 'Case preparation',
  结果报告: 'Result report',
});
