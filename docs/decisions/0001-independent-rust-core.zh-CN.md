# ADR-0001：独立 Rust Core 与共享 Web UI

[English](0001-independent-rust-core.md) | [简体中文](0001-independent-rust-core.zh-CN.md)

日期：2026-10-29。状态：**已由用户确认的现行 Rust Core 基线**，独立评审后维持；
已实现仅诊断的 Rust 服务；尚未进行资源预算实测。

## 背景

没有 Desktop 时，Reed 仍要服务宿主插件，多种壳共享本地数据。
性能和自带运行条件的启动链比统一语言更重要。此前设计采用随包 Node/TS Core，
用户本次提出本地存储、API 和系统操作是否更适合 Rust。
本 ADR 替代此前 TS Core 基线，保留 React、可选 Tauri 壳及外部 Agent Bridge；不建立双后台。

## 已选方案

采用独立 Rust 服务承担领域／应用规则、SQLite 事务、profile 生命周期、认证后的 API、
连接器、文件／worktree 和受控进程操作；React/TypeScript 负责共享 UI 与客户端。
Tauri 是有自身 Rust 宿主进程的客户端壳，不是 Reed Core 服务。

Core-only 产品不依赖全局 Node/Rust 安装或 Desktop 拥有的 sidecar。
发行二进制仍须核验具体 OS／架构及系统库兼容；Rust 不自动意味着通用静态二进制。
需要 Node/Python 的可选 Agent SDK／Bridge 放在 Core 之外，仅启用对应能力时启动，
并计入真实资源成本。

| 范围 | 方向 | 原因／条件 |
| --- | --- | --- |
| 流程／用例 | `reed-core` Rust 库 | 各种壳共享一套权威规则 |
| 持久化 | `reed-runtime` 中的 SQLite | 本地事务、迁移与一致性备份 |
| 异步编排 | Tokio 候选 | IPC／事件／进程 I/O；阻塞任务必须限量隔离 |
| SQLite 驱动 | 先评估 rusqlite + 有界数据库工作线程 | 便于控制 SQLite／备份；验证显示具体需要时再对比 SQLx |
| 可选 HTTP API | Axum 候选 | 限权 loopback 适配，优先通路仍是私有 IPC |
| 通信契约 | `reed-protocol` Rust DTO 生成 TS；schema 按需纳入同源 | 避免双权威，生成不替代运行/权限校验 |
| 桌面 | Tauri 客户端壳 | 负责窗口和系统呈现，不连接业务数据库 |
| Agent 集成 | 通过 `AgentExecutor` 使用外部 Bridge/SDK | 复用引擎集成，不为 Rust 重写一遍 |

首个切片已通过 Cargo/npm 清单和锁文件固定依赖，以 ts-rs 生成诊断类型；业务依赖和完整通信协议后续实现。
某宿主需要 MCP 时仍通过薄适配提供，不把 MCP 变成 Core 本体。

## 为什么这里倾向 Rust

Rust 能支持独立分发服务，让基础本地任务不必常驻一套 Node 运行时；
内存分配、有界缓冲和原生操作便于明确控制，也与 Tauri 原生层使用同一语言。
这是适配判断，不是已经测得 Rust 比 Node 少多少内存或必然满足全部资源预算。

Node/TypeScript 仍是可行服务方案，复用部分 Agent SDK 和现有原型的路径较短，
但需要承担运行时随包及原生依赖发行成本。Rust 则增加所有权／异步复杂度、跨语言契约
和跨平台构建工作。结合 Reed 的优先级，建议将工程成本投入常驻 Core，
同时让 TypeScript 留在适合的界面与 SDK 层。Go 也能做独立服务，但会在 Tauri 之外
再引入第三种原生语言，当前没有必要。

## 语言本身不能解决的约束

- 每个 profile 的服务整个运行期持有所有权锁；另一把控制锁串行化升级／激活元数据，
  不能用 PID 文件代替。
- SQLite 通过有界工作通道在异步线程之外执行短事务；不在事务中调用网络／CLI／Agent。
  已开始的 Tokio `spawn_blocking` 不能直接 abort；长期工作线程需要退出协议，
  不应在阻塞线程池里放无限循环。
- 进程输出和产物读取必须流式、有上限。丢弃进程句柄或 CLI 超时不证明执行停止；
  取消需要所有权、进程组处理和逐平台观察结果。
- Core-only 凭据不能依赖 Desktop 包、解锁状态或 Tauri vault。
  安全存储锁定／拒绝时明确报错，不回退明文；升级后仍须验证凭据可读取。
- 原生客户端权限和浏览器／宿主桥需要独立授权，Tauri capabilities 本身不授予 Core 权限。
- 首个执行适配可评估固定公开 Bridge CLI/JSON，不在 Rust 中复制 ai-mcp 私有
  HMAC／规范化逻辑。未来原生协议由所属工程冻结字节规范及跨语言测试样例。
  关闭 UI／客户端不能调用 Bridge runtime 关闭接口或取消其拥有的执行。
- Rust 不能赋予宿主原生页面、会话身份或工作区控制能力；四端可行性与资源分别验收。

## 首个验证切片

实现完整任务模型之前，先证明正式打包 Core 能在全新 GUI 环境下、无 Desktop／全局 Node
时启动；并发连接共用一个写入者；凭据读取、一次持久化往返、安全停止重启及资源计量可用。
验证浏览器配对／私有 IPC 拒绝路径、有界数据库执行及版本激活中断恢复，使用模拟数据。
通过这些基础风险验证后，再实现业务 schema/API、Agent 驱动及流程引擎。

## 依据及边界

2026-10-29 核对。以下证明机制，不代表 Reed 验收：

- [Tauri 进程模型](https://v2.tauri.app/concept/process-model/)：原生宿主和 WebView 分工，Reed 另设独立服务边界。
- [Tokio 阻塞任务](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html)及[进程生命周期](https://docs.rs/tokio/latest/tokio/process/)：阻塞／取消与子进程所有权需要明确设计。
- [SQLite WAL](https://www.sqlite.org/wal.html)及[备份 API](https://www.sqlite.org/backup.html)：读写并发不代表多个同时写入者，备份需要一致性。
- [rusqlite](https://docs.rs/rusqlite/latest/rusqlite/)与 [Axum](https://docs.rs/axum/latest/axum/)：实现候选，不是冻结版本。

独立评审不以 Codex 使用 Rust 为采用依据；先验证当前发布构建的 RSC。只有重新打开语言决策时才作等功能/负载的随包 TS 对照，不维护双生产 Core。

相关内容见[运行要求](../architecture/local-runtime.zh-CN.md)、[资源验收](../engineering/resource-acceptance.zh-CN.md)
和[设计来源](../references/provenance.zh-CN.md)，其中标明被替代的 Node 基线。
