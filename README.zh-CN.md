# Reed

[English](README.md) | [简体中文](README.zh-CN.md)

**Many agents. One flow.**

Reed 是本地优先的 AI 编程工作台，把任务、Agent 会话、Git 分支、工作区和产物
串成可追溯的完整流程，覆盖需求、设计、开发与验证。

## 项目状态

**可运行的工程骨架。** 独立 Rust Core 目前只提供本机健康诊断；React 提供共享
诊断页面，Tauri 是单独构建的可选客户端。尚无 Core 任务业务、流程引擎、SQLite、外部同步、
正式 IPC／认证或宿主插件，也没有公开安装发行版。
已确认的工作台已迁入[正式共享前端](docs/engineering/frontend.zh-CN.md)，Web 与 Tauri 使用同一套
页面和独立模拟适配器。原原型保留在 `ai-code/plugins/reed/` 用于追溯，后续 UI 在 Reed 内维护。

先阅读[汇总设计入口](docs/README.zh-CN.md)及
[开发／构建指南](docs/engineering/development.zh-CN.md)。

## 产品方向

- 每个任务拥有独立类型、统一生命周期和验收历史，内部流程按需选用。
- 个人看板包含待办、处理中、评审中、已完成；完成后可归档进历史，评审或完成检查任务产出和条件。
- 围绕任务关联会话、分支、隔离 worktree 与有版本的文档。
- 支持多个外部来源，首个接入云效；来源明确，映射可编辑，支持双向同步和冲突处理。
- 可选 Tauri 独立窗口与受支持的 Code Agent 宿主复用 React 交互，支持系统／浅色／深色
  主题和中英文。
- 数据保存在本机，不打开 Reed Desktop 也能使用插件。

以上是设计目标，不代表已经交付的功能。

## 架构

Core 推荐使用 **Rust**。React 与 TypeScript 负责共享界面，Tauri 提供可选原生壳；
Rust 负责流程规则、本地存储、认证后的 API 与受控系统操作。
[独立 Rust Core 决策](docs/decisions/0001-independent-rust-core.zh-CN.md)
说明了取舍及仍需验证的部分。

```text
可选 Reed Desktop ─┐
Code Agent 适配器 ──┼─ 认证后的客户端 API ─ 独立 Reed Core
其他获准的壳 ───────┘                      ├─ SQLite + 本地产物
                                           ├─ 连接器 + Git/worktree
                                           └─ 可选 AgentExecutor
```

同一操作系统用户、同一 Reed profile 共用一个 Core 写入者和一份本地数据。
关闭窗口只关闭当前客户端；Core 的发现和启动不依赖安装或打开 Tauri。
MCP 是可选适配协议，不是存储层，也不是 Core API 的前提。

## 工程归属

| 仓库 | 职责 |
| --- | --- |
| **reed** | 产品模型、Rust Core、协议、共享客户端和 UI、Tauri 壳、连接器、本地数据生命周期、产品验证和发行 |
| **ai-code** | Codex、Claude Code Desktop Code、ZCode、DeepSeek Harness 的 Reed 适配；宿主清单、原生桥及插件市场打包 |
| **ai-mcp** | 自身可复用的 Agent Bridge 和引擎集成；启用后通过明确的执行契约使用 |

四端是接入目标，原生页面、会话身份、执行和回调需要按具体版本分别验收。
Codex 第三方内嵌页面通路仍是待确认的可行性问题，不能用支持 MCP 代替结论。

## 目录

| 路径 | 计划职责 |
| --- | --- |
| `crates/reed-core/` | 领域规则、应用用例、端口 |
| `crates/reed-protocol/` | 有版本的通信 DTO 与跨语言契约权威 |
| `crates/reed-runtime/` | 独立服务、管理入口、存储、IPC、系统和来源适配 |
| `apps/web/` | 共享 Web 应用装配与开发入口 |
| `apps/desktop/` | 可选 Tauri 壳及受限 UI 桥 |
| `packages/client/` | 宿主无关的 TypeScript 客户端和生成的通信类型 |
| `packages/ui/` | 共享 React 交互、呈现状态、样式和品牌资产 |
| `packages/ui/src/mock/` | 产品操作流确认期间使用的显式模拟适配与样例 |
| `tooling/` | 后续契约生成、构建与发行工具 |
| `tests/` | 后续跨组件、生命周期、安全和资源验收 |
| `docs/` | 当前架构、决策与实施顺序 |

Core Cargo workspace 包含三个 crate；Desktop Rust 壳是独立 Cargo workspace，
使用自己的锁文件，因此构建 Core 不解析 Tauri／WebView 依赖。
npm workspace 组织 client、UI 及两个前端入口；通信类型由 Rust 生成。
`0.1.0` 只是本轮开发骨架标识，不代表公开发行或包名归属。

## 从源码构建与运行

```sh
# 只构建 Core，不需要 npm、React 或 Desktop。
cargo build --locked --release -p reed-runtime --bin reedd
./target/release/reedd

# 另开终端，可选启动 Web 或 Desktop，先安装项目内依赖。
npm ci
npm run dev:web
# 或：npm run dev:desktop
# 无需 Core 的桌面模拟预览：npm run dev:desktop:demo
```

源码固定 Rust 1.89.0；仅前端／工具需要 Node ≥22.12，边界检查工具另需 Python ≥3.11。
本机没有指定 Rust 工具链时按[开发指南](docs/engineering/development.zh-CN.md)准备。
Core 默认监听 `127.0.0.1:47821`，`GET /health` 只返回非敏感基础元数据，
**不表示业务 ready**，不开放业务写接口。
Web 开发使用固定 Vite 代理，Desktop 通过受限原生诊断桥访问。
当前需要单独启动 Core；壳不自动安装／启动／停止／升级它，正式发现和认证后续实现。

## 安装与本地数据

计划采用两步安装：先用户级安装 **Reed Core**，再在所需宿主的原生市场安装 Reed 插件。
**Reed Desktop 可选**，连接同一个 Core。安装器、命令、公开包名和平台支持尚未发布。

计划中的 profile 数据根目录：

| 平台 | 数据目录 |
| --- | --- |
| macOS | `~/Library/Application Support/Reed/profiles/<profile-id>/` |
| Windows | `%LOCALAPPDATA%/Reed/profiles/<profile-id>/` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/Reed/profiles/<profile-id>/` |

本轮基础建设没有创建这些数据目录。数据库、产物、备份和恢复记录不放在源码、插件缓存
或 Desktop 安装目录中。凭据通过无桌面也可使用的系统安全存储管理；本地数据库本身不代表
已加密。外部同步会把明确选择的数据发送到配置的来源；宿主 Agent 也可能按自身设置使用
远程模型。本地优先不表示所有接入工具都离线运行。

## 文档导航

- [架构与边界](docs/architecture/overview.zh-CN.md)
- [独立 Rust Core 决策](docs/decisions/0001-independent-rust-core.zh-CN.md)
- [数据、安全、安装与升级](docs/architecture/local-runtime.zh-CN.md)
- [实施顺序与验收](docs/engineering/implementation-plan.zh-CN.md)
- [资源预算](docs/engineering/resource-acceptance.zh-CN.md)
- [开发与贡献](CONTRIBUTING.zh-CN.md)
- [设计来源与迁移](docs/references/provenance.zh-CN.md)

## 许可证

[MIT](LICENSE)。
