# Tauri 模拟交互预览验证

日期：2026-10-29。本记录只覆盖本机 macOS 原生模拟预览，不是正式业务、四端或资源验收。
前半部分保留初始版本事实；当前工程结构与本轮结果见末尾「正式前端迁移复验」。

## 历史基线：最初接入 Demo

- `packages/demo-ui` 复制复用旧原型的 38 个源码、素材和测试文件；保留样式、Logo 和初始模拟数据。
  原 `ai-code/plugins/reed/prototype` 保持不变。增加宿主无关的 React 入口和声明，不接 Core。
- `apps/desktop/demo` 提供单独前端装配和输出，显式 Tauri Demo 配置使用独立应用标识。
  默认 foundation 配置和前端入口不变；Core/protocol/runtime 源码及 Cargo 锁文件未改。
- Demo 没有 JavaScript 原生命令权限。壳仅为 Demo 注册本地 Blob 下载回调，
  约束 Downloads 直接子项并拒绝已存在的目标文件；默认诊断壳不启用该回调。

## 自动检查

- 复制前旧原型 121 项测试通过；复制后同一套 121 项测试通过。
- 新共享包原生 SDK 导入边界：有效 RED 后修复，8 项架构边界测试通过。
- 下载约束：有效 RED 后修复，3 项下载测试和原有 4 项诊断测试通过。
- `npm run check` 通过；最终文档另运行 `npm run lint:docs`。
- Desktop `cargo clippy --locked --all-targets --all-features -- -D warnings` 通过。
- 使用已安装的 Rust 1.89.0 和现有 Cargo 缓存离线构建本机应用包成功。
  实际命令为 `npm run tauri -w @reed/desktop -- build --bundles app`，
  额外传入 `--config src-tauri/tauri.demo.conf.json` 和 bundle.active=true 配置。
- 产物为 `apps/desktop/src-tauri/target/release/bundle/macos/Reed Demo.app`，约 16.66 MiB。
  原型主 JS 约 558 kB，构建有大 chunk 提醒；尚未优化拆包或完成内存／CPU 验收。

## 原生窗口实测

通过原生应用窗口打开实际 `.app`，页面 URL 为 `tauri://localhost`，无需前端开发服务器或 Core。
检查时没有服务监听 Core 默认端口 47821。

- 个人看板显示初始 6 个样例任务、四个分组和来源筛选。
- 点卡片打开右侧任务抽屉，关闭后保留看板；设置中的主题、语言控件可展开。
- 通过移动菜单将未验收任务移到完成时，明确列出产出／阶段验收缺项，卡片保持原位。
- 原生窗口实际点击导出演示数据，Downloads 生成 13828 字节有效 JSON，含 6 个任务和 5 份文档。
- 实际点击下载文档，生成 322 字节 Markdown，内容与导出模型中的对应 V2 文档逐字一致。
- 重启应用后模拟样例仍可读取；没有创建 Core 数据库或调用真实 Agent、Git、云效。

## 独立评审与验证范围

只读 code_reviewer 检查配置合并、权限与下载路径，发现浏览器下载在 macOS WebView 被取消的问题；
主代理回读 Tauri/Wry 源码后补齐回调，评审复核未发现新的可触发边界问题，并完成上述两类原生下载。
评审为指令级只读约束，不宣称工具权限强制隔离。

初始演示数据来自原型样例，不复制浏览器已有 localStorage；桌面与浏览器的模拟进度独立。
开发态／打包态的演示存储迁移与跨窗口数据共享未验证，正式 Core profile 共享尚未实现。
未验收真实宿主、外部同步、性能预算、Windows/Linux、正式安装、签名或公证。

## 桌面应用图标补齐

同日补齐：直接使用已确认的独立 R，源图 `apps/desktop/src-tauri/icons/icon.png`
与 Demo 的 `reed-icon.png` 字节一致。通过已安装的 Tauri CLI 生成五份桌面图标资源，
在基础配置声明 `bundle.icon`，Demo 继承；未重绘图标或加入移动端资源。

重新构建本机 macOS 应用包成功。实际 Info.plist 的 CFBundleIconFile 为 icon.icns，
应用包内 ICNS 与生成文件逐字节一致。重启应用后，系统「About Reed Demo」窗口
实际显示独立 R；主页面保留英文偏好和原来的 6 个模拟任务。
33 个页面／模拟资源文件的前后 SHA-256 全部一致；本次没有修改 UI、模拟模型、应用标识或运行数据。
双语开发文档的 Markdown 检查通过；未重复运行与图标配置无关的业务模拟测试。
Windows／Linux 图标仅生成并检查格式，没有增加对应平台运行验收声明。

## 正式前端迁移复验

同日后续迁移：`packages/demo-ui`、`apps/desktop/demo` 已移除；唯一产品 UI 位于
`packages/ui/src/workbench`，模拟规则位于 `packages/ui/src/mock`。Web 与 Desktop 正常入口
均装配该 UI，诊断页迁至 `/diagnostics.html`。初始接入记录中的目录、无命令权限及 Blob
原生下载回调仅属于历史版本，不再描述当前实现。

### 当前实现与工程检查

- 既有配色、素材和样例保留；英文导航、数量单复数与列表列宽已整理，中文及窄窗口按宽度降级。
- 新装配／端口／存储适配为严格 TypeScript；迁入 JSX 明确保留 `allowJs/checkJs=false`，
  不声明全部视图已完成类型迁移。模拟端口是内部前端接口，不是正式 Core 业务或通信契约。
- 页面不直接导入模拟规则或 Tauri SDK；mock 通过独立入口注入，原生 SDK 只在桌面壳中使用。
- 最终 `npm run check` 通过：类型、制品、测试、边界、Markdown 与格式检查均完成。
  本机命令显式使用 `PATH=/opt/homebrew/bin:$PATH`；系统 Python 3.9 缺少 `tomllib`
  的启动失败不计为代码 RED，切换到现有兼容 Python 后完成检查。
- 最终桌面 `cargo test --locked`：11 项通过；Clippy all-targets/all-features `-D warnings` 通过。
- `npm run bundle:desktop:demo:local` 生成约 11.03 MiB 的本机 `.app`；
  `codesign --verify --deep --strict` 退出 0。仅 ad-hoc 签名，无 Developer ID／公证／正式安装验收。
- Web 与 Desktop 继续有大于 500 kB 的主 chunk 提示；不是内存／CPU／启动速度达标证据。

### 原生故障与修复后实测

迁移过程中的旧 Blob 下载回调复测后窗口不可读，用户明确反馈「窗口卡住或已经关闭」。
未证明其唯一根因；不把此前测试或签名修复当作卡顿根因证据。
当前已删除旧回调，改为注入 `WorkbenchFileExport`，调用异步 `export_preview_file`：
目录由原生壳选定，仅接受有界 JSON／Markdown／文本；阻塞线程执行独占写入，自动编号避免覆盖。
权限仅对需要的窗口开放，Demo 不获得 Core 健康诊断命令权限。

修复后的最终 Demo `.app` 通过原生窗口实际走查：

- `tauri://localhost` 正常打开，保留英文偏好、6 个任务和既有演示阶段状态。
- 实际点击「Export demo data」，生成 `reed-demo-backup (2).json`，13828 字节，解析含 6 个任务；
  窗口随后可关闭对话框、进入任务列表，并显示实际保存文件名。
- 实际下载关联 V2 文档，生成 `补偿方案 (1).md`，322 字节；窗口随后仍可继续操作。
- 点击关闭窗口后再次读取／打开应用，工作台可见且可操作；这不证明 Reopen 同进程重建分支，
  最小化／隐藏后的 Dock 唤起没有单独验收。
- 最终任务列表截图：`/private/tmp/reed-formal-frontend-desktop.png`，属于本机临时证据，不入发行包。

本轮原生导出实测对象是 Demo 配置；普通 Desktop 变体的原生导出未单独走查。
浏览器与桌面的模拟存储仍独立，不接真实 Core、Agent、Git 或云效，不构成正式共享数据或业务验收。
只读 code_reviewer 对共享依赖边界及最终原生导出／权限源码独立复核未发现确认缺陷；
测试、打包和上述原生操作由主代理完成，源码审查不替代运行证据。

## 前端迁移整体复审

在此前迁移基础上重新读取完整 dirty／untracked 源码与两端装配链，而非只复用历史结论。
主代理检查页面／模拟适配／持久草稿；独立 code_reviewer 只读检查构建制品、两端装配、
权限与导出链路，并复核下述修复。只读限制是 policy_only。

本轮已修复：

- 会话答复草稿读取／清除没有保护，存储禁用会中断弹窗或后续交互；
  表单缓存 JSON 为 null 也会中断。SSR 回归先出现 2 项目标失败，修复后通过。
- 文档允许任意显示标题，却直接作为原生文件名。共享 UI 现在只为导出生成安全 Markdown 名称，
  不改原标题、版本、正文或原生校验；无扩展名、路径字符、长 UTF-8 文件名先出现 3 项目标失败，
  修复后通过，原有中文／英文 Markdown 名保持不变。
- 模拟恢复只检查任务数量，残缺快照可进入页面。mock 内部增加当前可渲染结构检查，
  2 项残缺快照反例先失败后通过；key/version 2、合法草稿、缺来源的历史迁移继续保留。
- Web／Desktop／UI 的 BOUNDARY 及交互首页描述更新为实际默认模拟工作台与独立诊断页。

最终状态重新验证：

- `PATH=/opt/homebrew/bin:$PATH npm run check` 退出 0：Desktop TS 测试 8、client 22、
  UI Vitest 28、模拟规则 Node 测试 123、Python 边界测试 10，另含类型／制品／格式／Markdown 检查。
- `npm run build:web`、`npm run build:desktop` 退出 0；后者完成 Tauri 普通配置原生 release 构建，
  未重新打包或安装 `.app`。
- Desktop `cargo test --locked` 11 项通过。Rust 使用已有 1.89.0 与本机离线缓存。
- 未修改 Rust Core、正式协议或 client；未接真实存储、云效、Agent、Git 操作或宿主插件。

当前边界仍是过渡前端端口与部分旧 JSX，不能把类型声明等同完整类型安全；直接导入检查不等同
完整传递依赖证明。本轮回读了现有调用链，并检查了实际两端构建。
未重新进行原生 GUI、安装、性能及真实业务验收，前面的原生记录保留为此前状态的证据。
主 chunk 仍有 500 kB 提示，拆包和资源预算尚未验收。无 commit／push。
