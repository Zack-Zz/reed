# Orca 源码来源索引

日期：2026-10-29。O01–O10 原编号和固定源码入口保留为追溯，不维护第二套采用决定或排期。
采用/改造/待验/延后/拒绝及当前落点统一见[Orca/Codex 采用表](mechanism-adoption.md)。

原输入：ai-code docs/design/2026-10-29-reed-orca-mechanisms-reference.md，
SHA-256：64bb012b9c24ea3205c6209f292c207eaa4c0c47de7351a1676e7905267af9aa。

## 固定源码观察

本轮依据本地 `/Users/zhouze/Documents/git_projects/orca` 源码，HEAD 为 `c56d97bf0563bf4260ba41081b3085e28440c851`，检查时工作树干净。下列链接固定到该提交，方便后续定位；本轮没有启动 Orca、运行其测试或测量资源。测试文件中的断言表达作者的验证目标，不表示本机已经通过。

| 证据 | 观察到的机制与源码入口 | Reed 的采用范围 |
| --- | --- | --- |
| O01 | [运行时退出与 profile 所有权](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/orcad/orcad-lifecycle.ts#L130)、[实例锁](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/orcad/orcad-instance-lock.ts#L119) | 单写入者、精确实例识别、写入者停止后再释放锁；不复制 Electron 生命周期 |
| O02 | [空闲探测器](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/orcad/orcad-idle-exit-monitor.ts#L54) | idle/busy/unverifiable 三态探测、连续安静期；按 Reed 自有工作定义阻塞原因 |
| O03 | [终端视图清理](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/renderer/src/components/terminal-pane/terminal-pane-mount-cleanup.ts#L89)、[Agent 休眠资格](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/renderer/src/lib/agent-hibernation-pane-eligibility.ts#L50) | 先卸载视图与重订阅，进程回收另判；不假设四个宿主都支持休眠 |
| O04 | [操作回执存储](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/runtime/orchestration/db/mutation-receipts/mutation-receipt-store.ts#L35)、[重启后的未知操作](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/runtime/rpc/orchestration-mutation-executor.ts#L177) | 请求身份、输入哈希、持久回执与原操作核查；不承诺远端 exactly-once |
| O05 | [Task 与活动 Dispatch 约束](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/runtime/orchestration/db/tasks/task-status-transition.ts#L20)、[Worker 报告结算](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/runtime/orchestration/db/dispatch-context/worker-report-settlement.ts#L93) | 学习分层执行与旧结果拒绝；Reed 仍将执行完成、验收和 Task 完成分开 |
| O06 | [附件及会话来源](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/shared/worktree/types.ts#L13)、[稳定工作区身份](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/shared/worktree/identity.ts#L3)、[关联增量合并](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/shared/workspace-attachment-mutation.ts#L15) | 稳定本地 ID、带来源的关系、多客户端增量更新；不复制各平台专用字段不断扩张的结构 |
| O07 | [worktree 准备与最终提交](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/git/worktree-create-preparation.ts#L34)、[删除前检查](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/git/worktree-removal-preflight.ts#L13) | 可追踪准备操作、归属核验、失败清理和删除预检；首版不照搬预热 worktree 池 |
| O08 | [数据库版本与完整性检查](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/persistence/profile-state/profile-state-database.ts#L42) | schema/profile 检查、事务迁移、拒绝旧程序写新 schema；迁移只属于 Core 管理入口 |
| O09 | [Linear 写入分类与回读](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/linear/linear-issue-write-support.ts#L85)、[看板状态同步](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/renderer/src/components/sidebar/workspace-board-task-status-sync.ts#L84) | 失败/未确认分开、避免旧意图覆盖新意图；Reed 的 outbox、仲裁与恢复放在 Core |
| O10 | [规模化性能报告门禁](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/config/scripts/run-terminal-scale-perf-report-gate.mjs#L93)、[UI 反馈规则](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/docs/STYLEGUIDE.md#L68) | 可执行预算、真实阶段反馈及不夸大的状态文案；保留 Reed 已确认的视觉样式 |

O04 的持久回执机制覆盖其明确登记的操作集合，不能据此推导 O09 的 Linear 写入全部拥有同样保障。O09 的看板队列在 renderer 内按 worktree 排队，也不是跨客户端、跨连接的持久同步仲裁器。具体决定只维护于统一采用表，不扩张 Orca 已实现的范围。
