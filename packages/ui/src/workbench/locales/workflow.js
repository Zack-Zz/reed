export const workflowMessages = {
  '任务已暂停，请先恢复任务': 'Task paused. Restore it first',
  '任务已完成或归档，不能执行此操作': 'This action is unavailable for completed or archived tasks',
  '执行状态未知，请先人工核实会话归属':
    'Execution state unknown. Manually verify the session assignment first',
  '当前仍有执行中的会话，请先确认停止': 'A session is still running. Confirm it has stopped first',
  前序阶段尚未验收通过: 'Previous phases have not been accepted',
  '请绑定并核验当前阶段的 Agent 会话': 'Connect and verify an Agent session for the current phase',
  该会话正被另一任务占用: 'This session is in use by another task',
  请先准备隔离工作区: 'Prepare an isolated workspace first',
  '工作区目录、分支与会话尚未核验一致':
    'Workspace directory, branch, and session have not been verified to match',
  '阶段确认快照已失效，请重新检查当前阶段':
    'The phase confirmation snapshot is outdated. Check the current phase again',
  '文档确认快照已失效，请重新审阅当前文档版本':
    'The document confirmation snapshot is outdated. Review the current document version again',
  '请显式选择 Connector 连接': 'Select a connector connection explicitly',
  '找不到指定 Connector 连接': 'The specified connector was not found',
  '连接未配置、已停用或未连接，请先检查模拟连接':
    'Connection unconfigured, disabled, or disconnected. Check the simulated connection first',
  '任务项目已移出此连接的同步范围，保留来源与本地工作':
    "The task's project is outside this connection's sync scope. Source data and local work are retained",
  '工作项类型未记录或已移出同步范围，保留来源与本地工作':
    'The work item type is unrecorded or outside the sync scope. Source data and local work are retained',
  '只读连接不能推送，请使用双向同步连接':
    'A pull-only connection cannot push. Use a two-way sync connection',
  '状态映射尚未完成或失效，请先配置映射':
    'State mappings are incomplete or invalid. Configure them first',
  '写入权限未通过检测，请先重新检测连接':
    'Write permission has not passed checks. Check the connection again',
  缺少有效操作: 'No valid action provided',
  所选项目不在该连接的配置中: 'The selected project is not configured for this connection',
  已创建本地任务: 'Local task created',
  找不到指定任务: 'The specified task was not found',
  当前阶段尚未进入待验收状态: 'The current phase is not awaiting acceptance yet',
  '当前阶段已经验收，请先返工后修改文档':
    'This phase has been accepted. Reopen it for rework before editing documents',
  不支持的文档类型: 'Unsupported document type',
  '只能保存当前阶段文档，请先返工到对应阶段':
    'Only documents for the current phase can be saved. Reopen the relevant phase first',
  '该文档属于其他阶段，请先返工到对应阶段再修改':
    'This document belongs to another phase. Reopen that phase before editing',
  找不到需要关联的历史会话: 'The past session to link was not found',
  '此迁移须通过现有准备、反馈或返工操作；同列或重复提交不能直接执行':
    'Use the existing preparation, feedback, or rework action for this transition. Same-column moves and duplicate submissions cannot run directly',
  返工阶段必须是当前或更早阶段: 'Rework must start from the current or an earlier phase',
  只有执行状态未知的阶段需要人工核查:
    'Manual review is only needed when execution state is unknown',
  不支持的人工核查结果: 'Unsupported manual review result',
  '当前会话状态与未知执行不一致，请重新核查':
    'The session state does not match the unknown execution. Review it again',
  '确认会话已结束，产出等待人工验收': 'Session confirmed ended; output awaits human acceptance',
  '确认执行失败，可检查后重试': 'Execution confirmed failed; inspect it before retrying',
  '确认仍在执行，保留会话占用': 'Execution confirmed running; session remains reserved',
  '已准备模拟隔离工作区，等待绑定会话核验目录':
    'Simulated isolated workspace prepared; connect a session to verify the directory',
  '执行状态未知，请先人工核实': 'Execution state unknown. Verify it manually first',
  '当前阶段正在运行，不能重复启动': 'This phase is running and cannot be started again',
  '请先处理当前阶段的等待、失败或验收事项':
    "Resolve this phase's pending response, failure, or acceptance first",
  '会话仍在运行或状态未知，不能启动':
    'The session is running or its state is unknown; execution cannot start',
  当前没有运行或等待中的阶段: 'No phase is running or waiting',
  不支持的执行结果: 'Unsupported execution result',
  执行会话不存在: 'Execution session not found',
  'Agent 已结束，阶段产出等待人工验收': 'Agent finished; phase output awaits human acceptance',
  '阶段执行失败，等待检查后重试': 'Phase execution failed; inspect it before retrying',
  'Agent 等待补充信息': 'Agent is waiting for more information',
  '执行状态未知，保留会话归属待人工核实':
    'Execution state unknown; session assignment retained for manual review',
  只有待验收阶段可以提出修改: 'Changes can only be requested for a phase awaiting acceptance',
  '已记录修改反馈，保留现有产出与验收历史':
    'Change feedback recorded; existing outputs and acceptance history retained',
  只有等待中的阶段可以继续: 'Only a waiting phase can resume',
  '会话不在等待状态，请先核实': 'The session is not waiting. Verify its state first',
  '执行状态未知，不能盲目重试': 'Execution state unknown; do not retry without verification',
  只有已知失败的阶段可以重试: 'Only a phase with a confirmed failure can be retried',
  '已确认失败，阶段可重新启动': 'Failure confirmed; this phase can be restarted',
  '执行状态未知，不能盲目停止': 'Execution state unknown; do not stop without verification',
  当前没有执行中的阶段: 'No phase is currently running',
  '已确认停止模拟执行，会话已结束': 'Simulated execution confirmed stopped; session ended',
  已完成或归档的任务不能暂停: 'Completed or archived tasks cannot be paused',
  '任务已暂停；正在执行的会话保持原状态':
    'Task paused; running sessions retain their current state',
  任务已恢复: 'Task restored',
  任务已归档: 'Task archived',
  只有已归档任务可以恢复: 'Only archived tasks can be restored',
  '缺少归档前状态，请显式指定旧任务恢复状态':
    'Previous state missing. Explicitly choose a restore state for this legacy task',
  全部阶段验收通过后才能人工指定为已完成:
    'All phases must be accepted before manually marking the task completed',
  '缺少有效的归档前状态，请先核查任务历史':
    'No valid previous state recorded. Review task history first',
  '已有归档前状态，不能人工指定覆盖':
    'The previous state is recorded and cannot be manually overridden',
  无效的同步状态: 'Invalid sync state',
  无效的冲突处理操作: 'Invalid conflict resolution action',
  '已暂缓同步，保留当前字段与同步状态': 'Sync deferred; current fields and sync state retained',
  '同步结果未知，不能自动选择字段，请先核实':
    'Sync result unknown. Verify it before choosing fields automatically',
  当前没有需要处理的同步冲突: 'No sync conflict needs resolution',
  '已选择本地字段，等待模拟推送': 'Local fields selected; awaiting simulated push',
  '已选择云效字段，模拟同步完成': 'Yunxiao fields selected; simulated sync complete',
  已保存本地任务标题: 'Local task title saved',
  不支持的操作: 'Unsupported action',
  刚刚: 'Just now',
  请填写云效工作项编号: 'Enter a Yunxiao work item ID',
  请填写任务标题: 'Enter a task title',
  请填写文档标题: 'Enter a document title',
  请填写文档正文: 'Enter document content',
  请填写返工理由: 'Enter a reason for rework',
  '请填写Agent 宿主': 'Enter an Agent host',
  请填写修改反馈: 'Enter change feedback',
  请填写等待事项答复: 'Enter a response to the pending question',
  请填写旧任务恢复理由: 'Enter a reason for restoring the legacy task',
  请填写模拟远端标题: 'Enter a simulated remote title',
  '已导入云效工作项 {externalId}': 'Imported Yunxiao work item {externalId}',
  '已保存本地文档 {title} V{version}，保留历史版本':
    'Saved local document {title} V{version}; previous versions retained',
  '已关联历史会话「{title}」，执行归属保持不变':
    'Linked past session “{title}”; execution assignment unchanged',
  '已绑定 {host} 模拟会话，目录与分支已核验':
    'Connected {host} simulated session; directory and branch verified',
  '已绑定 {host} 模拟会话': 'Connected {host} simulated session',
  '已补充答复，继续模拟执行：{reply}': 'Response added; resuming simulated execution: {reply}',
  '模拟人工核查：确认会话已结束，产出等待人工验收':
    'Simulated manual review: session ended; output awaits human acceptance',
  '模拟人工核查：确认执行失败，可检查后重试':
    'Simulated manual review: execution failed; inspect it before retrying',
  '模拟人工核查：确认仍在执行，保留会话占用':
    'Simulated manual review: still running; session remains reserved',
  '人工指定旧任务恢复状态：进行中；理由：{reason}':
    'Legacy task manually restored to In progress; reason: {reason}',
  '人工指定旧任务恢复状态：暂停；理由：{reason}':
    'Legacy task manually restored to Paused; reason: {reason}',
  '人工指定旧任务恢复状态：已完成；理由：{reason}':
    'Legacy task manually restored to Completed; reason: {reason}',
  '任务已恢复为进行中，阶段与历史产出保持不变':
    'Task restored to In progress; phases and historical outputs unchanged',
  '任务已恢复为暂停，阶段与历史产出保持不变':
    'Task restored to Paused; phases and historical outputs unchanged',
  '任务已恢复为已完成，阶段与历史产出保持不变':
    'Task restored to Completed; phases and historical outputs unchanged',
  '模拟同步状态：已同步': 'Simulated sync state: Synced',
  '模拟同步状态：待同步': 'Simulated sync state: Pending',
  '模拟同步状态：存在冲突': 'Simulated sync state: Conflict',
  '模拟同步状态：未知': 'Simulated sync state: Unknown',
  '任务须处于可操作状态，请先恢复暂停或归档任务':
    'The task must be actionable. Restore paused or archived tasks first',
  须为有效且尚未验收的当前阶段: 'Must be a valid current phase that has not been accepted',
  前序阶段须全部验收通过: 'All previous phases must be accepted',
  '失败、运行、等待或未知执行须先处理，不能直接提交验收':
    'Resolve failed, running, waiting, or unknown execution before submitting for acceptance',
  '本任务执行须已确知结束，运行、等待或未知会话须先核查':
    'Task execution must be confirmed ended. Review running, waiting, or unknown sessions first',
  当前阶段须有非空有效产出及准确的文档版本:
    'The current phase requires valid, nonempty output and an exact document version',
  '当前产出已因返工或修改反馈过期，请生成或保存新版本后再评审':
    'Current output is outdated after rework or feedback. Generate or save a new version before review',
  当前阶段须有本轮范围内的产出: "The current phase needs output for this round's scope",
  '旧版材料尚未确认本轮有效，请重新执行或保存新版本':
    'Legacy materials have not been confirmed valid for this round. Run again or save a new version',
  '失败、等待或未知结果不能作为成功产出，请重新执行或人工保存新版本':
    'Failed, waiting, or unknown results cannot count as successful output. Run again or manually save a new version',
  当前阶段须有可审阅的产出: 'The current phase requires reviewable output',
  暂时不能移动: 'Cannot move yet',
  无效的看板列: 'Invalid board column',
  位置未变: 'Position unchanged',
  任务已经位于此列: 'The task is already in this column',
  '任务已暂停或归档，请先恢复任务': 'Task paused or archived. Restore it first',
  已经开工的任务不能退回待办并清除执行与验收历史:
    'Started tasks cannot return to To do and clear execution or acceptance history',
  准备开始任务: 'Prepare to start the task',
  '请通过已有流程接入并核验会话；开发与验证还须准备隔离工作区，再明确开始执行':
    'Connect and verify a session through the existing flow. Development and verification also require an isolated workspace before explicitly starting execution',
  提出修改反馈: 'Request changes',
  '请填写修改反馈，保留本阶段产出与验收历史':
    "Enter change feedback; this phase's output and acceptance history are retained",
  明确返工: 'Confirm rework',
  '请确认返工阶段并填写理由，保留历史产出':
    'Confirm the rework phase and enter a reason; historical outputs are retained',
  '只有最终验证阶段可完成任务，前面阶段须逐一验收':
    'Tasks can only be completed in the final verification phase; earlier phases must each be accepted',
  '当前验证阶段须先进入待验收状态，再明确确认完成':
    'The current verification phase must await acceptance before completion is explicitly confirmed',
  验收并完成任务: 'Accept and complete task',
  提交当前阶段评审: 'Submit current phase for review',
  '请审阅当前验证产出并明确确认验收，确认后完成任务':
    'Review the current verification output and explicitly accept it to complete the task',
  '请确认提交当前阶段文档；提交只进入人工评审，不会自动验收':
    "Confirm submission of the current phase's document. Submission starts human review; it does not accept the phase automatically",
  当前状态不支持此看板迁移: 'This board transition is unavailable in the current state',
  '新的工作，从这里开始。': 'New work starts here.',
  '开始任务后，会出现在这里。': 'Tasks appear here once started.',
  '有产出等待确认时，会出现在这里。': 'Outputs awaiting acceptance appear here.',
  '完成全部验收后，在这里回看。': 'Review completed work here after all acceptance checks.',
  任务可操作: 'Task is actionable',
  当前阶段尚未验收: 'Current phase has not been accepted',
  前序阶段已验收: 'Previous phases accepted',
  执行结果已明确: 'Execution result confirmed',
  执行占用已解除: 'Execution reservation released',
  当前阶段产出与版本已保存: 'Current phase output and version saved',
  产出可供审阅: 'Output ready for review',
  产出对应本轮范围: "Output matches this round's scope",
  已进入最终验证阶段: 'Final verification phase reached',
  当前阶段等待人工验收: 'Current phase awaits human acceptance',
  完成并生成产出: 'Finish and generate output',
  '结束会话，阶段等待人工验收': 'End the session; phase awaits human acceptance',
  等待补充信息: 'Waiting for more information',
  '进入需要答复状态，保留执行占用': 'Wait for a response; execution remains reserved',
  检查未通过: 'Checks failed',
  '保留报告，可以返工或重新验证': 'Keep the report; rework or verify again',
  '连接中断，结果未知': 'Connection lost; result unknown',
  '保留执行归属，先核查再决定下一步':
    'Retain execution assignment; review before choosing the next step',
  从一件新的工作开始: 'Start with a new task',
  编辑任务: 'Edit task',
  补充阶段材料: 'Add phase materials',
  把修改意见交给下一轮: 'Carry feedback into the next round',
  重新开启阶段: 'Reopen phase',
  '已结束，产出可供审阅': 'Ended; output ready for review',
  '已确认失败，保留失败报告': 'Failure confirmed; failure report retained',
  '仍在执行，继续保留占用': 'Still running; session remains reserved',
  '产出已保存，等待你验收': 'Output saved; awaiting your acceptance',
  模拟结果已记录: 'Simulated result recorded',
  已保存到本地: 'Saved locally',
  文档新版本已保存: 'New document version saved',
  '已记录反馈，原文与历史保留': 'Feedback recorded; original content and history retained',
  已进入新的返工轮次: 'New rework round started',
  模拟执行已确认停止: 'Simulated execution confirmed stopped',
  核查结果已记录: 'Review result recorded',
  历史会话已关联: 'Past session linked',
  已记录人工恢复选择: 'Manual restoration choice recorded',
  已提交模拟执行: 'Simulated execution submitted',
  答复已用于模拟继续执行: 'Response used to resume simulated execution',
  已提交人工评审: 'Submitted for human review',
  '已确认最终验收，任务完成': 'Final acceptance confirmed; task completed',
  需求阶段已人工验收通过: 'Requirements phase accepted by a human',
  需求阶段产出已明确提交人工评审: 'Requirements phase output explicitly submitted for human review',
  '已明确返工需求阶段：{reason}；保留历史产出，等待重新接入会话':
    'Requirements phase reopened for rework: {reason}; historical outputs retained, awaiting a new session connection',
  开始需求阶段模拟执行: 'Started simulated execution of the requirements phase',
  设计阶段已人工验收通过: 'Design phase accepted by a human',
  设计阶段产出已明确提交人工评审: 'Design phase output explicitly submitted for human review',
  '已明确返工设计阶段：{reason}；保留历史产出，等待重新接入会话':
    'Design phase reopened for rework: {reason}; historical outputs retained, awaiting a new session connection',
  开始设计阶段模拟执行: 'Started simulated execution of the design phase',
  开发阶段已人工验收通过: 'Development phase accepted by a human',
  开发阶段产出已明确提交人工评审: 'Development phase output explicitly submitted for human review',
  '已明确返工开发阶段：{reason}；保留历史产出，等待重新接入会话':
    'Development phase reopened for rework: {reason}; historical outputs retained, awaiting a new session connection',
  开始开发阶段模拟执行: 'Started simulated execution of the development phase',
  验证阶段已人工验收通过: 'Verification phase accepted by a human',
  验证阶段产出已明确提交人工评审: 'Verification phase output explicitly submitted for human review',
  '已明确返工验证阶段：{reason}；保留历史产出，等待重新接入会话':
    'Verification phase reopened for rework: {reason}; historical outputs retained, awaiting a new session connection',
  开始验证阶段模拟执行: 'Started simulated execution of the verification phase',
  '{host} 已结束设计会话，{document} 等待验收':
    '{host} ended the design session; {document} awaits acceptance',
  '验证失败：{reason}': 'Verification failed: {reason}',
  '已核验隔离工作区，开始开发': 'Isolated workspace verified; development started',
};
