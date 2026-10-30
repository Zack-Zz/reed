/** Unified task presentation copy; mock rule keys are localized only at the UI boundary. */
export const taskFlowMessages = {
  '执行已结束，产物已关联任务；仍需明确提交并完成任务级验收。':
    'Execution has ended and outputs are linked. Submit and accept the task explicitly to complete it.',
  '正在按选定材料处理本任务，结果会关联回任务。':
    'Working on this task with the selected inputs. Results will be linked to the task.',
  测试: 'Testing',
  任务评审与完成历史: 'Task review and completion history',
  已撤回或要求修改: 'Withdrawn or changes requested',
  准备重试: 'Prepare retry',
  返工此步骤: 'Rework this step',
  未分类: 'Uncategorized',
  处理中: 'Processing',
  评审中: 'In review',
  状态待确认: 'Status needs checking',
  任务类型: 'Task type',
  修改任务类型: 'Change task type',
  本地任务类型已更新: 'Local task type updated',
  任务状态: 'Task status',
  任务类型筛选: 'Task type filter',
  任务状态筛选: 'Task status filter',
  全部类型: 'All types',
  '任务类型（可后补）': 'Task type (optional)',
  '创建后进入待办，明确开始后可人工处理或准备 Agent。':
    'Created in To do. Start explicitly, then work manually or prepare an Agent.',
  目标说明与验收条件: 'Goal and acceptance criteria',
  编辑目标与验收条件: 'Edit goal and acceptance criteria',
  任务目标: 'Task goal',
  必要验收条件: 'Required acceptance criteria',
  '每行一项，写明如何判断这件工作已经完成。':
    'One per line. Describe how to judge that the work is complete.',
  要求执行结果通过: 'Require passing execution results',
  '仅报告真实结果的任务可以不要求全绿，必要执行覆盖仍须完成。':
    'Reporting tasks may include failed results. Required execution coverage must still be complete.',
  '范围变更会使旧产物需要重新核对；已承诺的条件不可在验收时静默忽略。':
    'Scope changes require artifacts to be checked again. Committed criteria cannot be silently skipped at acceptance.',
  保存任务范围: 'Save task scope',
  任务目标与验收条件已保存: 'Task goal and acceptance criteria saved',
  '先明确目标，提交评审前补齐可判断的验收条件。':
    'Define the goal and add measurable acceptance criteria before submitting for review.',
  '本任务要求执行结果通过。': 'This task requires passing execution results.',
  '评审依据已冻结，采用修改前请先撤回评审。':
    'The review basis is frozen. Withdraw the review before adopting changes.',
  产物与评审: 'Artifacts and review',
  提交产物: 'Add artifact',
  提交任务产物: 'Add task artifact',
  产物标题: 'Artifact title',
  产物内容与执行说明: 'Artifact content and execution notes',
  真实执行结果: 'Actual execution result',
  人工提交: 'Manual submission',
  待审阅产物: 'Artifact ready for review',
  结果待核查: 'Result needs checking',
  未记录执行结果: 'Execution result not recorded',
  执行通过: 'Passed',
  执行失败: 'Failed',
  未运行: 'Not run',
  已完成约定的必要工作与执行覆盖: 'The required work and execution coverage are complete',
  '未运行或环境失败说明不能替代尚未完成的必要工作。':
    'A not-run or environment failure report does not replace unfinished required work.',
  '人工提交记录材料与真实结果，不创建 Agent 执行记录。':
    'Manual submission records materials and actual results, without creating an Agent attempt.',
  保存产物: 'Save artifact',
  任务产物已保存: 'Task artifact saved',
  任务产物: 'Task artifact',
  当前范围: 'Current scope',
  依据待复核: 'Basis needs checking',
  核对并复用此版本: 'Check and reuse this version',
  已复用任务产物: 'Task artifact reused',
  '尚无任务产物。人工整理或 Agent 结果均可作为交付。':
    'No task artifacts yet. Manual work and Agent results can both be deliverables.',
  提交任务评审: 'Submit task review',
  开始并提交评审: 'Start and submit for review',
  审阅并验收任务: 'Review and accept task',
  查看冻结评审依据: 'View frozen review basis',
  任务级验收: 'Task acceptance',
  '以下是本次提交的冻结依据。逐项确认整件任务的必要验收条件。':
    'This is the frozen submission. Explicitly accept every required criterion for the whole task.',
  '提交将固定本轮目标、验收条件与产物版本。':
    'Submission freezes the current goal, acceptance criteria and artifact versions.',
  本次评审目标: 'Goal under review',
  固定产物版本: 'Frozen artifact versions',
  同时确认已完成工作的待确认内部步骤: 'Also accept the pending internal steps for completed work',
  '仅合并人工确认，不能代替尚未完成的必要工作。':
    'This combines manual decisions only. Required work must already be complete.',
  '我已核对整件任务的范围、真实结果与全部必要交付，确认通过。':
    'I have checked the whole task scope, actual results and all required deliverables, and accept the task.',
  '我明确开始处理，并提交以上范围与成果供任务级评审。':
    'I explicitly start this task and submit the scope and artifacts above for task review.',
  '我确认必要工作已完成，提交以上范围与成果供任务级评审。':
    'I confirm the required work is complete and submit this scope and these artifacts for task review.',
  确认全部条件并完成: 'Accept all criteria and complete',
  确认提交评审: 'Confirm review submission',
  '依据已变化，请关闭后重新核对本次评审。':
    'The basis changed. Close this dialog and check the review again.',
  '任务验收通过，已完成': 'Task accepted and completed',
  任务已提交评审: 'Task submitted for review',
  撤回评审: 'Withdraw review',
  重新打开任务: 'Reopen task',
  '记录继续工作的原因与范围，原完成决定和证据保留。':
    'Record why work should continue and its scope. The previous completion decision and evidence remain.',
  '记录原因并保留原评审对象，采用新内容后需要重新提交。':
    'Record the reason and preserve the original submission. Submit again after adopting changes.',
  原因与后续工作: 'Reason and next work',
  任务已重新打开: 'Task reopened',
  评审已退回处理中: 'Review returned to Processing',
  '完成决定保留；继续工作需要记录原因。':
    'The completion decision remains. Continuing work requires a reason.',
  恢复归档: 'Restore from archive',
  已恢复为已完成: 'Restored to Done',
  '历史与资源保留，恢复后仍为已完成。':
    'History and resources remain. Restoring returns the task to Done.',
  完成依据待复核: 'Completion basis needs checking',
  '保留历史完成事实；补做或采用新范围前请重新打开任务。':
    'Historical completion remains. Reopen before doing more work or adopting a new scope.',
  任务完成决定已保留: 'Task completion decision retained',
  已被后轮替代: 'Superseded by a later round',
  依据有效: 'Basis valid',
  查看评审与完成历史: 'View review and completion history',
  处理记录: 'Work history',
  '人工处理与 Agent 执行的记录会保留在这里。':
    'Manual work and Agent execution records appear here.',
  '执行事实与任务生命周期分别记录。': 'Execution facts and task lifecycle are recorded separately.',
  关联资源: 'Linked resources',
  尚未关联工作区: 'No workspace linked',
  关联不代表执行权限: 'A link does not grant execution control',
  内部流程: 'Internal workflow',
  可选内部流程: 'Optional internal workflow',
  内部流程步骤: 'Internal workflow steps',
  选择内部流程: 'Choose internal workflow',
  无内部流程: 'No internal workflow',
  研发流程: 'Development workflow',
  管理流程: 'Manage workflow',
  当前步骤: 'Current step',
  准备内部步骤: 'Prepare internal step',
  确认内部步骤: 'Accept internal step',
  内部步骤已确认: 'Internal step accepted',
  '内部步骤确认不会自动提交或完成任务。':
    'Accepting an internal step does not submit or complete the task.',
  '不选流程也可以人工处理、提交产物并完成任务级验收。':
    'You can work manually, add artifacts and accept a task without a workflow.',
  '移除流程不取消已承诺的验收条件；有未处置工作时会拒绝移除。':
    'Removing a workflow does not cancel committed criteria. Unresolved work prevents removal.',
  采用流程选择: 'Apply workflow choice',
  内部流程已更新: 'Internal workflow updated',
  退回待办: 'Return to To do',
  任务已退回待办: 'Task returned to To do',
  暂停任务: 'Pause task',
  确认任务流转: 'Confirm task transition',
  '明确开始处理，暂不启动 Agent。': 'Explicitly start working without launching an Agent.',
  '重新排期并保留处理记录、产物与关联。':
    'Reschedule while retaining work history, artifacts and links.',
  确认流转: 'Confirm transition',
  '{p0} → {p1}': '{p0} → {p1}',
  列表与看板共享任务生命周期: 'List and board share the task lifecycle',
};

const ruleMessages = {
  'check-goal': [
    '目标已明确并保存为当前范围',
    'The goal is defined and saved in the current scope',
  ],
  'check-criteria': ['必要验收条件已明确', 'Required acceptance criteria are defined'],
  'check-artifacts': [
    '当前范围的必要产物与准确版本已保存',
    'Required artifacts and exact versions are saved for the current scope',
  ],
  'check-source': ['产物来源可准确定位', 'Artifact provenance is identifiable'],
  'check-coverage': [
    '必要工作与执行覆盖已完成',
    'Required work and execution coverage are complete',
  ],
  'check-quality': ['满足已约定的执行通过要求', 'The agreed passing-result requirement is met'],
  'check-execution': [
    '运行、等待或未知执行须先结束或核查',
    'End or reconcile running, waiting or unknown execution first',
  ],
  'check-workflow-work': [
    '所选流程的必要工作已完成',
    'Required work in the selected workflow is complete',
  ],
  'check-submit-state': ['任务须为待办或处理中', 'The task must be in To do or Processing'],
  'check-review-state': ['任务须有当前已提交评审', 'The task must have a current submitted review'],
  'check-snapshot': [
    '评审依据与当前准确版本一致',
    'The review basis matches the exact current versions',
  ],
  'check-workflow-acceptance': [
    '必要内部步骤已确认，或明确合并本次确认',
    'Required internal steps are accepted, or explicitly included in this decision',
  ],
  'snapshot-changed': [
    '范围或产物版本已变化，请重新打开并核对',
    'Scope or artifact versions changed. Reopen and check the basis',
  ],
  'accept-all-criteria': [
    '请明确接受全部必要验收条件',
    'Explicitly accept every required criterion',
  ],
  'archive-done-only': ['只有已完成任务可以归档', 'Only completed tasks can be archived'],
  'restore-archived-only': ['只有已归档任务可以恢复', 'Only archived tasks can be restored'],
  'completion-missing': [
    '缺少任务完成决定，请先核查历史完成依据',
    'The completion decision is missing. Check the historical basis first',
  ],
  'reopen-done-only': ['只有已完成任务可以重新打开', 'Only completed tasks can be reopened'],
  'reason-required': ['请填写原因', 'Enter a reason'],
  'withdraw-before-change': [
    '采用修改前请先撤回评审',
    'Withdraw the review before adopting changes',
  ],
  'reopen-before-change': [
    '采用新范围或成果前请先恢复并重新打开任务',
    'Restore and reopen the task before adopting a new scope or artifacts',
  ],
  'artifact-required': [
    '请保存可核查的产物标题和内容',
    'Save an artifact with a reviewable title and content',
  ],
  'invalid-outcome': ['请选择真实有效的执行结果', 'Choose a valid actual execution result'],
  'invalid-workflow': ['不支持该内部流程', 'Unsupported internal workflow'],
  'workflow-promises': [
    '所选流程有未处置的必要工作，不能通过移除流程绕过',
    'The workflow has unresolved required work and cannot be removed to bypass it',
  ],
  'start-state': ['仅可开始未暂停的待办任务', 'Only an unpaused To do task can be started'],
  'requeue-state': ['只有处理中任务可以退回待办', 'Only Processing tasks can return to To do'],
  'pause-state': ['已完成或归档任务不能暂停', 'Completed or archived tasks cannot be paused'],
  'completion-pending': ['完成依据待复核', 'Completion basis needs checking'],
  'step-submitted': ['内部步骤产物已提交待确认', 'Internal step artifact submitted for acceptance'],
  'agent-result-hint': [
    '选择模拟结果并保留真实结果标记，任务仍需单独评审。',
    'Choose a simulated result. The actual result is retained and the task still requires a separate review.',
  ],
  'agent-output-saved': [
    '模拟 Agent 产物已保存，等待任务级评审',
    'Simulated Agent output saved for task review',
  ],
  processing: ['处理中', 'Processing'],
  'type-saved': ['本地任务类型已更新', 'Local task type updated'],
  'invalid-type': ['请选择有效的任务类型', 'Choose a valid task type'],
  'invalid-status': ['任务状态无效，请重新核对', 'Invalid task status. Check it again'],
  'invalid-transition': [
    '该生命周期流转不可直接进行',
    'This lifecycle transition is not available directly',
  ],
  'move-blocked': [
    '条件尚未满足，请查看缺项并补齐',
    'Conditions are not met. Review and address the missing items',
  ],
  'move-needs-confirmation': [
    '请通过任务级评审确认本次流转',
    'Confirm this transition through task review',
  ],
  'not-found': ['未找到任务', 'Task not found'],
  'restore-first': [
    '请先恢复归档，再明确重新打开任务',
    'Restore from archive before explicitly reopening the task',
  ],
  'start-first': ['请先明确开始处理任务', 'Explicitly start working on the task first'],
  'use-task-artifacts': [
    '无内部流程时请提交任务产物',
    'Add a task artifact when no internal workflow is selected',
  ],
  'workflow-required': [
    '该操作需要显式采用内部流程',
    'This operation requires an explicitly selected internal workflow',
  ],
  'migration-review': [
    '旧版完成记录缺少任务级依据，已保留历史并等待重新核查',
    'The legacy completion lacks task-level evidence. History is retained for review',
  ],
  started: ['已开始处理任务', 'Started working on the task'],
  requeued: ['任务已退回待办', 'Task returned to To do'],
  'scope-saved': ['任务目标与验收条件已保存', 'Task goal and acceptance criteria saved'],
  'artifact-saved': ['任务产物已保存', 'Task artifact saved'],
  'artifact-reused': ['已核对并复用任务产物', 'Task artifact checked and reused'],
  'review-submitted': ['任务已提交评审', 'Task submitted for review'],
  'review-withdrawn': ['评审已退回处理中', 'Review returned to Processing'],
  completed: ['任务验收通过，已完成', 'Task accepted and completed'],
  archived: ['任务已归档', 'Task archived'],
  restored: ['已恢复为已完成', 'Restored to Done'],
  reopened: ['任务已重新打开', 'Task reopened'],
  'workflow-saved': ['内部流程已更新', 'Internal workflow updated'],
  paused: ['任务已暂停', 'Task paused'],
  resumed: ['任务已恢复', 'Task resumed'],
};
export const taskFlowChineseLabels = Object.fromEntries(
  Object.entries(ruleMessages).map(([key, [zh]]) => [`task.${key}`, zh]),
);
Object.assign(
  taskFlowMessages,
  Object.fromEntries(Object.entries(ruleMessages).map(([key, [, en]]) => [`task.${key}`, en])),
);
