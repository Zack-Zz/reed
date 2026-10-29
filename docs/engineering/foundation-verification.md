# 基础工程验证记录

日期：2026-10-29，状态：本地基础工程通过。没有业务、真实来源或四端验收结论。

## 范围与环境

本轮在已有未提交的工程文档上整合 Orca 参考机制，迁入领域／操作流规格，搭建诊断骨架。
Core 采用三 crate Cargo workspace；Tauri 使用独立 workspace／锁文件；四个 npm workspace
分别构建 client、UI、Web 和 Desktop 前端。没有修改 ai-code 原型或 ai-mcp 实现。

本机 macOS 26.5.1／arm64；Rust 1.89.0（已安装 stable 别名）、Node 24.4.1、npm 11.4.2，
边界工具使用 Homebrew Python 3.14。验证命令使用 `RUSTUP_TOOLCHAIN=stable` 和显式
Homebrew PATH；这不修改全局默认工具链。工具缓存使用临时目录。
系统 Python 3.9 缺少 tomllib 的失败属于环境问题，不计作有效 RED。

## 最终检查

| 检查 | 结果／边界 |
| --- | --- |
| `cargo test --locked --workspace` | 4 项通过：诊断 DTO、loopback 范围、无任务／写路由 |
| Core `cargo clippy --locked --workspace --all-targets --all-features -- -D warnings` | 退出 0 |
| Core／Desktop `cargo fmt ... --check` | 退出 0 |
| `npm ci --no-audit --no-fund` 后 `npm run check` | 退出 0：契约漂移、四包类型、ESM 产物、前端测试、边界和 Markdown |
| 前端测试 | client 22、共享 UI 3、Desktop 传输 6，共 31 项通过 |
| Python 边界反例 | 7 项通过，覆盖别名／workspace 依赖、原生 SDK import 和壳的合法适配 |
| Tauri 原生桥 `cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml --lib` | 4 项通过：正常、损坏／超限、重定向和协议版本分类 |
| Tauri `cargo clippy ... --all-targets -- -D warnings` | 退出 0 |
| Core release／Web／Tauri release 独立构建 | 均退出 0；Core 构建不解析 Tauri/WebView |
| `node tooling/smoke-core.mjs --release` | 自有 Core 临时端口、健康诊断、无任务／写接口及退出通过 |
| 本地 JSON/TOML／相对文档链接检查 | 通过，最终交付前复验 |

总计 **46 项**行为／边界测试通过，不计零测试的库／doc-test，也不包含下面的人工 GUI 检查。
新增行为先确认有效失败再实现；复核发现的错误分类和 ESM 产物导入问题均已修复并回归。
Rust 导出的 DTO 及协议版本常量是 TypeScript 对应输入的唯一权威，生成检查已通过。

## 原生窗口与进程独立性

1. 单独运行 `target/release/reedd`，监听 127.0.0.1:47821；未打开 Desktop 时诊断为 200。
2. 通过本地构建命令生成 Reed.app（不安装、不发布），在 macOS 打开。
3. 原生 AX 及截图确认 tauri://localhost 页面显示基础阶段；点击 Refresh status 后，
   出现 Connected、Core 0.1.0、protocol 1 和 mode foundation。
4. 退出 Reed.app，系统应用状态显示 `isRunning: false`。
5. 同一 Core 再次响应 200，之后独立向测试 Core 发中断信号，正常退出 0。

本轮 GUI 截图保存在临时验收目录，不作为发行证据提交源码。
这证明当前本机壳与服务的基本边界，不证明 RSC05 内存回落／时限、正式安装、profile
单写者或四端插件通过。没有运行资源预算台架，没有将安装包大小当成运行内存。

## 制品定位

下列是本轮本地构建的 SHA-256，不是公开版本、签名或发行声明。
Core 与 .app 均为仅诊断骨架，数据能力为空。

| 文件 | SHA-256 |
| --- | --- |
| `target/release/reedd` | `5c255fa0edf9a2fd24781f567a6e4393b9872cd7bf4345290b00ef6ef2943054` |
| `apps/desktop/src-tauri/target/release/bundle/macos/Reed.app/Contents/MacOS/reed-desktop` | `cf97a3057071c620683b11e93e334ef7ac37a98c19f5b9902058c36535f3e59c` |
| `Cargo.lock` | `e81c34abaf35561042fd99c73e60ce5dc07ecf8b8b1d581a74cf9139d6913302` |
| `apps/desktop/src-tauri/Cargo.lock` | `68f8fb009ab886b639e29edd4a5342cfab8883d37bc106c2e8dffaa83c276933` |
| `package-lock.json` | `dec1af816307aac8ecdbd32c704c10314719d423d364b74adc024d5003d81075` |

## 未实现／未验证

任务、流程、SQLite、凭据、真实云效、Agent 执行、正式认证 IPC、自动发现、profile 锁、
升级安装、活动租约／空闲退出与四端插件仍未实现。业务 ready、RF 故障矩阵和 RSC 资源
门禁均待后续阶段；Windows/Linux GUI 尚未实测。

没有执行 commit、push、tag、PR、市场发布或服务安装。
独立架构顾问负责 Orca 采纳建议，前端实现者负责分配的共享前端，独立代码 Reviewer
只读复核进程／权限／契约边界；最终构建、测试、GUI 和整合由主代理完成。
