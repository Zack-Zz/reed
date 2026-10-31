const copy = {
  changeStatus: ['切换任务状态', 'Change task status'],
  statusSaved: ['任务状态已更新', 'Task status updated'],
  statusActivity: ['状态从{from}改为{status}', 'Status changed from {from} to {status}'],
  statusFailed: [
    '任务已变化或暂时不能切换，请重新核对后再试。',
    'The task changed or cannot move now. Check it and try again.',
  ],
  statusBlocked: ['暂时不能切换到此状态', 'Cannot change to this status yet'],
  checkCriteria: ['确认已满足的验收条件', 'Confirm the acceptance criteria are met'],
  finishStatus: ['设为已完成', 'Set to Done'],
  comments: ['评论', 'Comments'],
  you: ['我', 'You'],
  noComments: ['暂无评论', 'No comments yet.'],
  addComment: ['添加评论', 'Add a comment'],
  commentPlaceholder: [
    '添加讨论、进展说明或成果链接……',
    'Add a discussion, progress note or link to your work…',
  ],
  commentSaved: ['评论已添加', 'Comment added'],
  commentFailed: [
    '评论未能添加，输入已保留，请稍后重试。',
    'Could not add the comment. Your text is kept; try again.',
  ],
  linkedDocuments: ['关联文档', 'Linked documents'],
  completionHistory: ['查看完成依据与历史', 'View completion basis and history'],
  completionHistoryTitle: ['状态与完成历史', 'Status and completion history'],
  boardHint: [
    '拖拽或切换任务状态；已设置的验收条件仍需核对。',
    'Drag or change a task status. Configured acceptance criteria still need checking.',
  ],
  reviewEditHint: [
    '如需修改任务内容，先将状态切回待办或处理中。',
    'To edit the task, change its status back to To do or Processing.',
  ],
  typeValue: ['任务类型：{type}', 'Task type: {type}'],
  allActivity: ['查看全部活动', 'View all activity'],
  allActivityCount: ['查看全部活动 · {count}', 'View all activity · {count}'],
  activityTitle: ['全部活动', 'All activity'],
  noRelations: ['暂无关联', 'No linked tasks.'],
  frozenPlain: [
    '核对本次提交的任务信息，再明确确认完成。',
    'Check the submitted task details, then explicitly confirm completion.',
  ],
  reviewHint: [
    '提交将固定任务基本信息及已填写的验收条件和处理结果。',
    'Submission freezes the task details and any criteria or work results you provided.',
  ],
  reviewPlain: [
    '我确认本任务已处理完毕，提交评审。',
    'I confirm this task is ready and submit it for review.',
  ],
  completePlain: [
    '我已核对本任务，确认完成。',
    'I have checked this task and confirm it is complete.',
  ],
  complete: ['确认完成任务', 'Confirm task completion'],
  edit: ['编辑任务', 'Edit task'],
  save: ['保存任务', 'Save task'],
  content: ['任务内容', 'Task content'],
  contentOptional: ['任务内容（选填）', 'Task content (optional)'],
  contentHint: [
    '补充背景、范围或需要说明的事项。',
    'Add background, scope or anything that needs explanation.',
  ],
  noContent: [
    '未填写任务内容。标题已能说明工作时，可以留空。',
    'No additional content. Leave this empty when the title describes the work.',
  ],
  addContent: ['添加任务内容', 'Add task content'],
  criteria: ['验收条件', 'Acceptance criteria'],
  addCriteria: ['添加验收条件', 'Add acceptance criteria'],
  editCriteria: ['编辑验收条件', 'Edit acceptance criteria'],
  criteriaOptional: ['验收条件（选填）', 'Acceptance criteria (optional)'],
  criteriaHint: [
    '按需添加；未设置条件时，可以直接将任务状态切换为已完成。',
    'Add these when needed. Tasks without criteria can be set directly to Done.',
  ],
  noCriteria: ['未设置验收条件。', 'No acceptance criteria configured.'],
  result: ['处理结果', 'Work results'],
  addResult: ['填写处理结果', 'Add work result'],
  noResult: ['未填写处理结果。', 'No work result recorded.'],
  history: ['最近活动', 'Recent activity'],
  notes: ['处理补充', 'Additional work notes'],
  relations: ['任务关系', 'Task relationships'],
  addRelation: ['关联任务', 'Link a task'],
  related: ['普通关联', 'Related task'],
  parent: ['父任务', 'Parent task'],
  child: ['子任务', 'Subtask'],
  dependency: ['前置任务', 'Prerequisite task'],
  dependent: ['后续任务', 'Dependent task'],
  frozenContent: ['本次任务内容', 'Task content under review'],
  saved: ['任务已保存', 'Task saved'],
  saveFailed: [
    '任务已变化或暂时不能编辑，请保留输入并重新核对。',
    'The task changed or cannot be edited now. Keep your input and check again.',
  ],
  editHint: [
    '标题和类型必须有值，内容可以留空。评审中或完成后，先将状态切回待办或处理中再编辑。',
    'A title and type are required; content is optional. Change the status back to To do or Processing before editing a task in review or done.',
  ],
  titleRequired: ['请填写任务标题', 'Enter a task title'],
  invalidContent: ['任务内容必须为文本', 'Task content must be text'],
  basicsCheck: ['任务标题与类型有效', 'The task title and type are valid'],
} as const;

export const minimalTaskMessages = Object.fromEntries(
  Object.entries(copy).map(([key, [, en]]) => [`minimal.${key}`, en]),
);
Object.assign(minimalTaskMessages, {
  'task.status-changed': 'Task status changed',
  'task.comment-added': 'Comment added',
  'task.check-status-change':
    'This status change is not available. Archive completed tasks; restore archived tasks to Done first.',
  'task.comment-required': 'Enter a comment.',
  'task.comment-too-long': 'Comments can contain up to 20,000 characters.',
});
export const minimalTaskChineseLabels = Object.fromEntries(
  Object.entries(copy).map(([key, [zh]]) => [`minimal.${key}`, zh]),
);
Object.assign(minimalTaskChineseLabels, {
  'task.status-changed': '任务状态已切换',
  'task.comment-added': '已添加评论',
  'task.check-status-change': '暂不支持此状态切换；仅已完成可归档，已归档须先恢复到已完成。',
  'task.comment-required': '请填写评论。',
  'task.comment-too-long': '评论不能超过 20,000 个字符。',
});
