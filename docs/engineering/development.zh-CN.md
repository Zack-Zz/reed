# 开发与独立构建

[English](development.md) | [简体中文](development.zh-CN.md)

## 环境与固定版本

源码固定 Rust **1.89.0**、React **19.3.1**、TypeScript **5.9.3**、Vite **8.3.5**，
Tauri Rust **2.11.6**／build **2.6.3**、CLI/API **2.12.4**，通过清单和锁文件管理。
Tauri Rust 2.12 要求 Rust 1.90，本轮保留本机已有 1.89，所选 JS/Rust 组合本地验证，
不泛化为任意跨版本兼容。`0.1.0` 只标识开发骨架。

前端工具需 Node ≥22.12 和 npm，本轮使用 Node 24.4.1／npm 11.4.2。
可选边界门禁另需 Python ≥3.11（使用 `tomllib`），系统 Python 3.9 不适用。
Core 构建／运行不依赖 Node 或 Python。
markdownlint 的辅助工具 `run-con` 固定 1.3.2，避免 ini 7 要求更高 Node 版本。

缺少项目工具链时由开发者明确安装，例如：
`rustup toolchain install 1.89.0 --profile minimal --component rustfmt,clippy`。
本轮用已安装且版本同为 1.89.0 的 `stable` 别名验证，命令设置 `RUSTUP_TOOLCHAIN=stable`，
没有升级该工具链；这是当前进程环境选择，不修改全局设置或项目固定版本。

Tauri 还需平台 SDK：macOS 的 Apple 命令行 SDK、Windows 的 MSVC/WebView2、
Linux 的 WebKit/GTK，见[官方环境要求](https://v2.tauri.app/start/prerequisites/)。
本轮只建立本机 macOS 构建证据，不声明 Windows/Linux GUI 或签名安装器验收。

## 构建边界与产物

| 组件 | 仓库根命令 | 输出 | 依赖 |
| --- | --- | --- | --- |
| Core 服务 | `cargo build --locked --release -p reed-runtime --bin reedd` | `target/release/reedd`，Windows 加 `.exe` | Rust/Cargo，无 npm/Tauri |
| 协议类型导出 | `npm run generate:contracts` | `packages/client/src/generated/CoreHealth.ts` | Rust + Node，权威在 Rust |
| TS client | `npm run build:client` | `packages/client/dist/` | Node/npm，读取已提交生成类型 |
| 共享 React UI | `npm run build:ui` | client + `packages/ui/dist/` | Node/npm |
| 浏览器前端 | `npm run build:web` | 共享产物 + `apps/web/dist/` | Node/npm，不构建 Core |
| Desktop 前端 | `npm run build:desktop:ui` | 共享产物 + `apps/desktop/dist/` | Node/npm，不构建 Rust/Core |
| Tauri 可执行壳 | `npm run build:desktop` | `apps/desktop/src-tauri/target/release/reed-desktop` | Node + Rust + OS WebView SDK，不构建 Core |

Desktop 单独管理 Cargo workspace 和锁文件，构建 hook 只编译自己的前端；
依赖 `reed-protocol`，不依赖 `reed-core` 或 `reed-runtime`。
共享包不发布注册表包，`dist` 出口供独立检查，Vite 开发通过 alias 使用源码。
正式宿主制品导出和市场打包后续实现。

前端／工具命令先 `npm ci`。`npm run build` 只构建共享包和 Web，不隐式构建 Core 或 Tauri。
Core workspace 排除 Desktop，因此 Cargo 命令不解析 GUI 依赖。
Tauri 当前使用 `--no-bundle`，未配置签名及正式安装器发行格式。
桌面 PNG／ICNS／ICO 图标沿用已确认的独立 R，`bundle.icon` 引用
`apps/desktop/src-tauri/icons/` 下资源；未改动的 `icons/icon.png` 为源图，Demo 继承同一图标配置。

## 分别启动进程

```sh
# 终端一：只启动 Core；测试时 --listen 127.0.0.1:0 可选空闲端口。
cargo run --locked -p reed-runtime --bin reedd

# 终端二：任选一种 UI。
npm run dev:web       # http://127.0.0.1:1420，固定 /core 代理
# npm run dev:desktop # Tauri 窗口，前端开发端口 1421
```

壳不自动启动或停止 Core。Tauri 可单独退出，Core 直到自己的中断／终止信号才退出。
不创建 profile／数据库或修改用户配置。
当前 daemon 收到信号前保持运行；计划中的空闲租约、自动发现、受管理停止和 OS 自启动
**均未实现**，60+5 秒是后续门槛，不能当成本轮实际行为。

`GET http://127.0.0.1:47821/health` 是非敏感的公开诊断，返回 `mode: foundation`
和空能力列表，只允许 loopback 监听；不是正式认证 IPC 或业务 ready。
Web 开发代理和 Desktop 固定 `core_health` command 传输相同 DTO。
不开放任意 URL、进程命令、文件 API 或任务写接口。

## 正式共享工作台前端

工作台只维护在 `packages/ui/src/workbench`，Web 与 Desktop 显式装配独立的 `@reed/ui/mock`；
旧 demo-ui 工程已移除。类型化装配、旧 JSX 范围、模拟存储边界和验证命令见[前端开发指南](frontend.zh-CN.md)。

```sh
npm run dev:web                  # 127.0.0.1:1420 工作台
npm run dev:desktop:demo         # 同一正式 UI，保留预览应用身份
npm run build:desktop:demo:ui    # 正式 Desktop 前端 -> apps/desktop/dist/
npm test -w @reed/ui
```

Demo 构建变体保留原应用标识与存储键，没有另一份页面实现。
两个前端也构建 diagnostics.html，保留原 FoundationApp 和健康诊断传输；模拟模式无需 Core。
下文本机 macOS 打包命令仍可追加 `--config src-tauri/tauri.demo.conf.json`。

## 检查

```sh
cargo test --locked --workspace
cargo fmt --all --check
cargo clippy --locked --workspace --all-targets --all-features -- -D warnings
npm run check
npm run build:web
npm run build:desktop
cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml --lib
npm run smoke:core -- --release
```

`npm run check` 检查生成契约漂移、构建／类型、前端测试、架构反例、声明边界与 Markdown。
仅构建 Core 不要求执行 Node/Python 门禁。
`smoke:core` 创建自己拥有的临时端口 Core，读取诊断、验证无任务／写接口，再结束该子进程；
不是性能或真实宿主验收。Windows smoke 只检查进程终止，不冒充 Unix SIGTERM 优雅退出。

本轮不包含正式服务安装器、SQLite 迁移、云效连接、Agent 引擎、四端插件或 RSC 验收。
后续仍按[实施计划](implementation-plan.zh-CN.md)及[故障／资源规范](failure-acceptance.md)执行。

## 可选的本机 macOS 应用包

只用于本地 GUI smoke 验证，准备前端依赖后执行：

```sh
npm run tauri -w @reed/desktop -- build --bundles app --config '{"bundle":{"active":true}}'
```

产物：`apps/desktop/src-tauri/target/release/bundle/macos/Reed.app`。
这是本地应用包，不是已签名／公证的安装器或公开发行版。
默认 `build:desktop` 仍只构建可执行程序，实际结果见[基础验证记录](foundation-verification.md)。

文档的 M3 持久化底座探针与 M4 业务 ready 分开；当前健康诊断不满足任何业务 ready。
reed-core 当前无领域实现且关闭空 lib/doc-test，不能当领域测试通过；
M4 增加真实用例时须启用并验证有意义的领域/事务测试，不改写基础记录的历史数字。

## 未来服务端的构建预留

云同步设计见[复制专题](../architecture/replication.md)及 ADR-0002。
services/reed-server 和 local/replication 子模块是未来目标路径，目前未创建，
没有服务端构建/部署命令，也没有修改现有 workspace/锁文件。
到云阶段才建立独立 Cargo workspace/锁、存储/迁移及发布检查，
Core-only 构建不解析云依赖，服务不依赖 reed-runtime/Tauri。
当前命令和基础验证仍只覆盖已建立的本机诊断工程。

## 本机 macOS 应用包

```sh
npm run bundle:desktop:local
npm run bundle:desktop:demo:local
```

两者使用同一前端，`tauri.local.conf.json` 仅配置本机 ad-hoc 签名；`-` 伪身份见
[Tauri 官方说明](https://v2.tauri.app/distribute/sign/macos/#ad-hoc-signing)。
不需要 Apple 账号、钥匙串证书或公证，不代表正式发布。
生成后使用 `codesign --verify --deep --strict` 检查应用包完整性。

Desktop 注入受限文件导出端口：仅允许 1 MiB 内 .json／.md／.txt 保存到 Downloads，
独占创建并用编号避免覆盖；文件 IO 在阻塞工作线程运行，不占用 UI 线程。
网页保留 Blob 下载。壳另处理 macOS 关闭最后一个窗口后的重开事件。
