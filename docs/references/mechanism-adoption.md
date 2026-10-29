# Orca / Codex 机制采用与去重

日期：2026-10-29。用户已要求按独立评审结论更新正式设计；
本文记录取舍、来源和落点，不是第二套规范，也不代表实现或运行通过。

## 参考基线与证据

| 源码 | 评审提交 | 边界 |
| --- | --- | --- |
| Orca 1.4.214 | c56d97bf0563bf4260ba41081b3085e28440c851 | 评审时工作树干净，只核对源码调用链 |
| Codex | 23934d31b15b1127c83535f84854e5009f7cd51d | 干净源码快照，不是已安装 Desktop 版号 |

O01–O10 入口保留在[Orca 来源表](orca-adoption.md)；C/CP/CT 来自 ai-code 的 Codex 参考文，
输入哈希见[来源](provenance.zh-CN.md)。旧稿 TS Core 和“独立工程未创建”已由 Rust ADR
和实际诊断骨架替代，不建立双生产 Core。源码事实、推断、设计选择与运行证据分别记录。

## 去重采用矩阵

| 机制 / 原编号 | 已有覆盖 | 决定 | 收益 | 成本 / 风险 | 最小落点 | 验证 |
| --- | --- | --- | --- | --- | --- | --- |
| 工程/进程/制品 C01/C02/C12、CP01 | 三 crate / 双工程 | 采用原则 | 独立构建、单一权威 | 低；过度分包、门面泄漏 | 原 crate 内模块 | RF21/26 |
| wire / 生成 / 兼容 C05/C06、CP02/04 | protocol / 诊断生成 | 按 Reed 改造 | 防 Rust/TS 漂移 | 中；类型不等于授权校验 | 协议/客户端规范 | RF21 |
| 共享客户端/原目标回复 C03/C05、CP03/04 | client / 会话绑定 | 按 Reed 改造 | 统一壳、回复不串目标 | 中；不能复制宿主审批权 | client / HostAdapter | RF23；自有执行留 P8 |
| 补读/背压 O03、C04/C10、CP05/09 | 游标/资源门槛 | 按 Reed 改造 | 不漏更新、内存可控 | 中；无界缓冲或响应堵塞 | 原事件表/client | RF22、RSC08/10 |
| 生命周期 O01/O02/O08、C07/C08、CP06 | 生命周期/升级 | 按 Reed 改造 | 准入退出闭合 | 中高；计数不等于停止 | Core 管理/活动清单 | RF01–05/09/25 |
| 持久操作 O04、C05、RF07/08 | Operation / G7 / F06/F16 | 按 Reed 改造 | 重传恢复不重发 | 中高；非外部 exactly-once | 既有事务/调用记录 | RF07–09/20 |
| SQLite/事务 C09/C10、CP07/08 | 事务/事件/文件 | 采用原则 | 权威唯一 | 中；双权威/过早异步投影 | 用例级端口/保存承诺 | RF24 |
| 身份/关系/准备清理 O06/O07 | SessionRef/Binding / 工作区 | 采用原则 | 关联不误授控制 | 中；名称复用继承权限 | 既有关系/准备操作 | RF10–12 |
| 同步分类/仲裁 O09 | outbox / B/R/D / unknown | 按 Reed 改造 | 跨连接有序 | 高；本地顺序非远端 CAS | Core 规范对象队列 | RF14–20 |
| 四端/独立启动 C03/C07/C12 | 原 P0/T45–49 | 先验证 | 早发现交付阻塞 | 中高；MCP/源码不等于原生 UI | M2 逐端探针 | RF01/02/21/25、L0–L3 |
| 工程门禁 O10、C06/C12、CP10 | 原 T/RSC | 采用原则 | 约束可持续检查 | 中；镜像测试/字符串假安全 | 一张 RF/RSC 映射 | 真实依赖反例、全组计量 |
| registry / 多层配置 C11、CP11 | 三端口/版本化输入 | 后续再做 | 有需求后解释替换 | 中高；过早插件平台 | 首版固定装配与输入快照 | RF21；真实扩展需求 |
| Rust/TS 比较 CP12/CT16 | Rust 已确认/有骨架 | 先验证性能主张 | 避免语言替代实测 | 中高；不养双生产实现 | 先测 Rust RSC；重开语言决策才对照 | 等功能负载/发布构建/维护成本 |
| embedded 回退/无界缓存/JSONL 业务权威/完整 IDE 引擎 | 与既定边界冲突 | 不采用 | 保持资源/产品范围 | 照搬形成第二后台或权威 | 不进 MVP | RF21/22/24 |

## 关键源码观察与不能照搬之处

固定提交入口仅供追溯，没有运行参考项目的测试或应用。

- Codex [请求路径](https://github.com/openai/codex/blob/23934d31b15b1127c83535f84854e5009f7cd51d/codex-rs/app-server/src/message_processor.rs#L1025)
  与 [准入/排空同锁](https://github.com/openai/codex/blob/23934d31b15b1127c83535f84854e5009f7cd51d/codex-rs/app-server/src/turn_admission.rs#L61)
  支持准入机制；Permit 归零不是 Agent/CLI 已停止。
- [原连接回复句柄](https://github.com/openai/codex/blob/23934d31b15b1127c83535f84854e5009f7cd51d/codex-rs/app-server-client/src/server_request.rs#L12)
  不随 UI 选择变化，但内存标记不是多客户端持久仲裁。
- [无界本地事件缓冲](https://github.com/openai/codex/blob/23934d31b15b1127c83535f84854e5009f7cd51d/codex-rs/app-server-client/src/lib.rs#L370)
  是避免通知阻塞响应的取舍；Reed 改为控制/日志分别限量及补读。
- [内嵌回退](https://github.com/openai/codex/blob/23934d31b15b1127c83535f84854e5009f7cd51d/codex-rs/tui/src/lib.rs#L600)
  不符合共享独立 Core；
  [core-api 导出](https://github.com/openai/codex/blob/23934d31b15b1127c83535f84854e5009f7cd51d/codex-rs/core-api/src/lib.rs#L55)
  也不能作为纯领域边界的范本。
- [先写历史再投影](https://github.com/openai/codex/blob/23934d31b15b1127c83535f84854e5009f7cd51d/codex-rs/thread-store/src/local/live_writer.rs#L436)
  是 Codex 会话布局；Reed 保持 SQLite 业务权威。
  [实际文件 flush](https://github.com/openai/codex/blob/23934d31b15b1127c83535f84854e5009f7cd51d/codex-rs/rollout/src/recorder.rs#L1949)
  不证明 Reed 断电持久性。
- Orca [回执覆盖条件](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/runtime/rpc/orchestration-mutation-executor.ts#L54)
  及方法相关异常处理不能变成任意云效写的重试保险；
  [Worker 结算](https://github.com/stablyai/orca/blob/c56d97bf0563bf4260ba41081b3085e28440c851/src/main/runtime/orchestration/db/dispatch-context/worker-report-settlement.ts#L205)
  不替换 Reed 独立验收。
- Orca renderer 按 worktree 的内存队列不替换 Core 持久规范对象队列；强制 reset、
  force 删除、预热池、自动用户 hook、PTY 休眠不进入首版用户工作区流程。

## 唯一实施与验收入口

[实施计划](../engineering/implementation-plan.zh-CN.md)的 M1–M8 为唯一 MVP 增量；
旧 P 是追溯别名，CP/RFP 不是新项目。RF 是功能/故障主清单、RSC 是资源主清单、
W 是产品走查。T/CT 归并见[验收映射](../engineering/failure-acceptance.md)。
真实宿主、云效、OS 和性能分别留证，“采用”不等于验收或安装授权。
