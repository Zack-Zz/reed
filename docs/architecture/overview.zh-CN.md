# 架构与工程边界

[English](overview.md) | [简体中文](overview.zh-CN.md)

状态：2026-10-30 产品模型校准后的现行设计；已实现仅诊断的工程骨架，业务、正式运行管理及宿主集成尚未实现。
Rust 已由用户确定用于本轮基础工程，决策见 [ADR-0001](../decisions/0001-independent-rust-core.zh-CN.md)。

## 产品归属

Reed 拥有本地任务、工作流及其证据。任务可以没有外部工作项；连接器关联外部事实，
不拥有本地流程。云效仍是其工作项的权威来源；同步只协调映射字段，不能把外部关闭
直接当成本地验收通过。

所有任务类型共用待办／处理中／评审中／已完成／已归档生命周期，默认无内部流程；
类型、主状态、执行和来源事实分开。任务直接关联人工/Agent 处理、会话、仓库、分支／工作区、
产物及任务级验收；显式选用模板才增加流程/步骤轮次，不造空阶段。
关联会话只获得导航，不获得控制权；步骤通过和 Agent 结束不代表整件任务完成。
看板读取统一生命周期；任务级提交/通过/归档均调用与其他界面相同的受保护 Core 用例。
具体业务以[领域模型](../product/domain-model.md)及[交互基线](../product/interaction.md)为准；本次只校准设计，未修改代码。

## 三种扩展端口

| 端口 | 作用 | 归属 |
| --- | --- | --- |
| `ProviderConnector` | 外部工作项、主体与范围、字段映射、拉取／回写／核查 | Reed runtime，先实现云效 CLI |
| `HostAdapter` | 在宿主内使用 Reed；可信会话绑定、原生导航／提交／事件 | ai-code Reed 插件 |
| `AgentExecutor` | 明确由 Reed 管理一次 Agent 执行，观察引擎生命周期与结果 | Reed 定义端口，可选接 ai-mcp Bridge |

原生会话仍由宿主拥有。选择独立执行必须记录明确的执行所有者和运行身份，不能静默
替换用户选定的桌面会话。DSH 是宿主目标，不自动成为 Bridge 引擎。
可选 MCP 工具映射到应用用例及权限，不替代上述三种端口。

## 依赖方向

```text
reed-runtime ──> reed-core <── 领域测试
      │
      └───────> reed-protocol ──> 生成的 TS 通信类型
                                      │
Desktop/Web/宿主桥 ──> 共享 UI + client ──> 认证后的 Core API
```

| 组件 | 拥有 | 不拥有 |
| --- | --- | --- |
| `crates/reed-core` | 领域不变量、流程转换、应用命令／查询与端口 | Tauri、数据库驱动、路由、来源／宿主 SDK |
| `crates/reed-protocol` | 公开 DTO、稳定错误码、握手／事件结构、兼容样例 | SQL 行、领域变更规则、凭据、宿主专有 API |
| `crates/reed-runtime` | 服务／管理入口装配；存储、IPC、生命周期、凭据、来源／系统／执行适配 | 窗口生命周期、React、其他宿主的私有实现 |
| `packages/client` | 生成的通信类型、类型化 API／事件／重连、可注入传输 | 数据库访问、Tauri SDK、流程／验收决策 |
| `packages/ui` | React 功能、view-model、主题／语言、呈现状态与壳端口 | Tauri／宿主 SDK、秘密、权威流程或同步状态 |
| `apps/web` | 共享 UI/client 装配、开发入口、可选配对浏览器传输 | 独立任务存储或第二套流程引擎 |
| `apps/desktop` | Tauri 窗口／菜单／通知／对话框、受限 Core 引导及桥接 | 数据库访问、迁移、来源／Agent 执行逻辑 |
| `tooling` / `tests` | 构建／契约／发行工具、集成验收 | 用户数据、私有证据、未声明的运行 hook |

三个 crate 组成 Core Cargo workspace；Tauri 在 `apps/desktop/src-tauri` 使用独立
Cargo workspace／锁文件，只依赖 protocol，不依赖 runtime 或 domain 库。
前端组成 npm workspace。当前只实现 `CoreHealth` 诊断 DTO，由 Rust 通过 ts-rs
生成 TypeScript，并通过 `check:contracts` 检查漂移；没有业务 API 或数据库 schema。

## API 与本地系统调用

应用用例通过认证后的命令、查询及带游标可回放事件暴露。传输适配验证调用方、profile、
权限和输入；Core 再检查修订版本、幂等、事务与验收证据。所有壳共用此路径，
不在 Tauri command 中再实现业务用例。

优先采用用户私有 IPC：macOS/Linux 的 Unix domain socket、Windows 的 named pipe，
分别验证平台行为。原生桥只向 WebView 提供限权操作。
可选 loopback HTTP／事件传输需要明确配对、Host/Origin 校验和浏览器会话保护。
Axum 是可选 HTTP 适配候选，不是把全部系统能力暴露给网页的理由，传输细节尚未冻结。

文件访问、Git/worktree、子进程及外部 CLI 均在 runtime 适配中执行。
核验可执行程序，传结构化参数，明确工作目录、授权范围、输出上限和超时；
不向前端开放通用任意命令接口。进程句柄丢弃、超时或连接断开不证明整个进程组已停止。

## 共享 UI 与多种壳

共享 UI/client 不导入 Tauri 或宿主 SDK。通过注入 `ShellBridge` 提供允许的文件打开、
导航和呈现能力，各壳拥有具体实现，浏览器能力可以更少。
React 管理待提交意图和局部视图状态；已经提交的任务、同步操作和证据仍以 Core 为准。
UI 可提前校验，但 Core 必须重复执行权威检查。

四端和 Desktop 同时打开时，同一 profile 仍只有一个 Core 写入者。
壳不直开数据库、不启动自己的同步器，也不因协议不兼容另选 profile。
默认 profile 选择共享；其他 profile 必须显式选择，窗口筛选和抽屉状态可以独立。

后续发行单元记录固定的 UI/client/protocol 版本与哈希。ai-code 使用已核验的发行输入，
不引用 `../reed` 开发目录、不浮动跟随 `main`、不运行时下载 `latest`。
共享源码以 Reed 为唯一权威；适配器可装配原生页面，但不复制流程规则。

## 可行性边界

Codex、Claude Code Desktop Code、ZCode、DeepSeek Harness 需要分别验证插件安装、
原生页面、可信会话身份、提交、回调、导航与隔离工作区交接，当前没有真实 Reed 宿主验收。
Codex 第三方固定／内嵌页面通路仍未确定，是该端 P0 阻塞项。
外部页面或 MCP-only 工具只能明确标为受限替代，不能记作原生集成通过。

未来反向集成使用 `AgentExecutor`，不把引擎代码绑定在 Tauri 中。
保留 ai-mcp Bridge 为外部服务，优先采用其有版本的公开 CLI/JSON 或另行定义的跨语言契约；
不能假设 TypeScript 和 Rust 序列化字节一致，从而移植私有认证。

## 后续阅读

- [应用协议、共享客户端与一致性](protocol-and-clients.md)
- [本地运行、存储与升级](local-runtime.zh-CN.md)
- [实施顺序](../engineering/implementation-plan.zh-CN.md)
- [资源验收](../engineering/resource-acceptance.zh-CN.md)
- [设计来源](../references/provenance.zh-CN.md)

## 汇总设计的专题权威

本总览负责模块边界，详细规则按主题维护，不再以 ai-code 旧稿为现行规范。

- 产品：[业务模型](../product/domain-model.md)、[操作流](../product/operation-flows.md)、[交互](../product/interaction.md)
- 运行：[安装／存储／升级](local-runtime.zh-CN.md)、[生命周期／资源回收](lifecycle-and-resources.md)
- 一致性：[操作回执／恢复](operations-and-recovery.md)、[关系／工作区](relations-and-workspaces.md)、[双向同步](synchronization.md)
- 工程：[实施阶段](../engineering/implementation-plan.zh-CN.md)、[资源预算](../engineering/resource-acceptance.zh-CN.md)、[故障验收](../engineering/failure-acceptance.md)
- 来源：[Orca/Codex 统一采用矩阵](../references/mechanism-adoption.md)，只记录取舍与溯源，不另设规范或排期。

## 当前骨架范围

目前仅实现 loopback-only 服务的 `GET /health`，返回 `mode: foundation` 且无业务能力。
接口刻意不认证，只承载非敏感元数据；它不代表已实现正式认证 IPC 或业务 ready 屏障。
Desktop 有界读取固定端点，禁止重定向／代理，有超时；Web 的开发代理不是生产浏览器
配对方案。分模块构建见[开发指南](../engineering/development.zh-CN.md)。

四端逐项能力与验收见[宿主适配](host-adapters.md)，跨仓制品与市场见[分发](distribution.md)。

## 本次评审后的统一基线

正式工程沿用已确认的独立 Rust Core + React + 可选 Tauri + 四端薄适配。
此前 TS Core / 九分包目录图属于来源历史，不重新建立，也不因为 Codex 使用 Rust
推导 Reed 的性能优势。当前诊断骨架尚无业务存储/认证，不能作为完整 Core 已完成。
领域/应用端口、wire DTO、传输适配和发行制品分别建模；
采用参考机制先在既有模块落点，不扩为完整 IDE、Agent 引擎或通用插件平台。

当前规则按专题维护：[协议/客户端](protocol-and-clients.md)、生命周期、操作恢复、关系/工作区、
同步各有一个权威文档；[八项实施增量](../engineering/implementation-plan.zh-CN.md)
及[RF 主清单](../engineering/failure-acceptance.md)统一排期/验收，旧 P/T/CP/CT 只作追溯。
源码观察、设计选择和真实运行证据分开，缺接口的宿主与缺保证的同步动作保持显式待验证/受限。

Rust Core 与 ai-code 插件的 HostAdapter 实现通过有版本、受限的控制命令/回执连接，
不是跨仓 Rust 库调用或仅靠 React 页面回调。准确绑定和已验收能力决定是否可回控；
定义见[协议与客户端](protocol-and-clients.md#core-到宿主的控制通路)。
M4 先提供人工关系/文档与只读代码快照，M6 再扩可信执行绑定和自动隔离交接。

## 可选个人云复制与团队预留

本地优先的 M1–M8 不变；未来个人多设备复制再到团队，见[复制专题](replication.md)
及 [ADR-0002](../decisions/0002-optional-cloud-replication.zh-CN.md)。
同机多壳共享一个 profile Core，跨设备则各自 Core/SQLite 加可选共享空间；
本机 revision、IPC 信任/锁、执行能力不能跨机直接复制。

未来 services/reed-server 与产品同仓、独立 Cargo workspace/锁/存储/部署，
只复用纯领域与协议，不依赖 reed-runtime/Tauri。三个现有 crate 内先预留数据分类、
稳定身份、复制协议边界与 runtime 挂接点；不创建云代码或把云依赖加入 Core-only。
云效 ProviderConnector 与 Reed 数据复制分开，数据共享不转移会话或来源写入权。
