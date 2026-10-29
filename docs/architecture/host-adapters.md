# 四端宿主适配

状态：现行目标设计，尚无真实 Reed 宿主验收。
下文接口是原稿在 2026-10-27／29 的候选核对记录，不是本轮重新验收或对未来发行版的承诺。
Core 已选 Rust，Tauri 只是可选客户端。基础诊断壳不代表这些宿主能力已经实现。

## 12.1 共用与专用部分

四端共用独立 Reed 工程发布的任务投影、应用契约、共享 UI 和客户端库；ai-code 的 Reed 插件只保留各端安装清单、原生桥、权限、可信启动入口、会话绑定与能力声明。DSH、ZCode 及可行的 Codex 页面使用固定版本的同一 Web 组件；Claude Mod 使用宿主组件绘制专用视图，共用无宿主业务逻辑，不要求像素级相同。Tauri 不作为任何宿主插件的嵌入容器或依赖。

| 页面区域 | 用户可以看到和执行的内容 |
| --- | --- |
| 任务列表与详情 | 本地/外部来源、阶段进度、阻塞和下一步；新建、导入、选择流程、编辑允许的字段 |
| 阶段操作区 | 预览输入和产物要求，选择执行 Agent、准确会话和工作区；开始、继续、取消、重试和验收 |
| 分支与工作区 | 从仓库/分支反查任务、会话和验证；显式进入目录或准备隔离工作区 |
| 文档与交付 | 打开需求/设计/报告，查看生产者、内容版本、有效范围和待复核原因 |
| 同步与恢复 | 区分本地保存和远端结果；处理冲突、未知写入、失联执行及待清理工作区 |

从阶段操作区可直接发起设计、开发和验证；文档登记与打开是阶段的一部分。界面不把上述操作隐藏为只能由 Agent 自然语言触发的能力。

MCP Apps 的宿主注册和 bridge 属于插件；页面来自 Reed 的固定发行制品，工具代理连接独立 Core，不拥有另一份数据库。普通业务调用不绕行 Gateway；若以后采用聚合，须实现并验收 UI 资源 URI、metadata、资源读取和权限的完整路由。

## 12.2 已核对接口与验收缺口

接口首次核对日期为 2026-10-27，2026-10-29 补核市场/本地后端机制。它们是候选接口证据，尚无本插件的实际安装、账户和目标宿主版本验收；不承诺上游开发分支适用于所有已发布客户端。

| 宿主 | 候选实现 | 关键缺口与处理 |
| --- | --- | --- |
| DSH Desktop | Cordis/Slots 注册导航和主面板；Session scope 取准确身份；`uiWorkspace.openSession/startSession` 导航；Session prompt 与状态投影 | 固定目标版本，验收客户端模块打包、权限、会话保留、事件恢复和多仓库工作区；创建入口与真实消息提交分开 |
| ZCode Desktop | `ui.surfaces` 注册会话侧栏，MCP Apps HTML；`sendMessage`、`updateModelContext`；hooks 辅助上报 session/cwd | 交互页面当前限本地桌面工作区；页面公开 API 尚未证明直接返回原生 session ID，必须验证页面、hook、Attempt 的可靠关联；不把页面工具事件当整个 Agent 事件 |
| Claude Desktop Code | Mod 专用组件；`session.id/cwd/root/repo`；`prompt.submit`；`turn.start/complete` | EARLY ACCESS 按安装版本锁定类型；repo 信息不能替代真实 cwd 的分支检测；未确认 Mod 可枚举或打开任意其他桌面会话，保留当前会话操作及明确受限导航 |
| Codex Desktop | 已知 thread 深链、创建入口及 prompt/path 预填；可信插件 hooks 上报 session/cwd/turn；MCP Apps 页面另做原型 | 预填不代表发送；hooks session 与导航 thread 的映射须验收；公开 UI 文档主要描述 ChatGPT，不据本机渲染代码或官方 Security 插件推定第三方 Codex 页面完整可用 |

四端的无桌面启动路径分别为：ZCode 的插件 MCP 薄服务、Claude Code Mod 的受信任进程/客户端调用、DSH Host 插件 RPC，以及 Codex 的本地 stdio MCP/已信任入口。它们只调用 Core 固定启动器并连接 Core；后端可能早于页面打开启动，不承诺所有宿主有统一 onOpen 钩子。Codex 的命令 hooks 需独立信任，完整页面入口仍未确认；Claude 限支持 Mods 的本地 Code 会话，不能把普通 Chat、WSL/云端会话视为同等级；ZCode 交互页面限本地桌面工作区。

这次补核的机制来源：[Codex 本地 MCP 插件](https://developers.openai.com/plugins/deploy/desktop-only)、[Codex 插件与 hooks](https://developers.openai.com/plugins/build/plugins)、[Claude Mods](https://code.claude.com/docs/en/plugins/mods/overview)、[ZCode UI Plugin](https://github.com/zai-org/ZCode/blob/main/UI_PLUGIN.en.md)、[DSH 插件管理](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/README.md)。机制存在不等于 Reed 已加载或宿主退出后进程生命周期已通过。

隔离开发还需单独验证目标目录交接：DSH 尝试先注册工作区再创建对应 Session；Codex 可用深链 path 引导到目标 worktree，但只有用户发送并回传准确身份后才进入执行；Claude Mod 和 ZCode 当前页面路径优先操作已经位于正确目录的会话，未证实的跨目录创建使用人工打开后重新绑定。四端均不得向旧 cwd 的当前会话直接发送新工作区的开发指令。

接口证据：[DSH 公开客户端接入](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/client-modules.md)、[DSH Slots](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-slots/README.md)、[DSH 导航](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-workspace/src/client/navigation.ts)、[DSH Session](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/api/session-controller/src/client/contract/session.ts)、[ZCode UI](https://github.com/zai-org/ZCode/blob/main/UI_PLUGIN.en.md)、[ZCode hooks 指南](https://github.com/zai-org/zcode-plugins/blob/main/docs/PLUGIN_DEVELOPMENT.md)、[Claude Mods reference](https://code.claude.com/docs/en/plugins/mods/reference)、[Codex 深链](https://learn.chatgpt.com/docs/reference/commands)、[Codex hooks](https://learn.chatgpt.com/docs/hooks)、[OpenAI UI 说明](https://developers.openai.com/plugins/build/chatgpt-ui)。

本次整体复核明确三项证据边界：DSH 有公开 Client Modules/Slots 接入路径，不仅是内部页面源码；Claude 的公开 Mods reference 提醒 GitHub 类型可能落后于本机生成类型，实际发行版本应固定到验收；OpenAI 的 [Extensions](https://developers.openai.com/plugins/build/extensions) 虽有 global/thread 页面入口，文档描述的是 ChatGPT，仍不证明 Codex Desktop 第三方固定页面。ZCode 的旧 hooks 指南与新版源码存在来源限制差异，不能据旧说明判定 ai-code 市场必然不可用，也不能据 main 源码宣称所有发行版已放开；以已安装目标版本的市场启用/信任实测为准。

## 12.3 能力分级与失败分支

每个 OS/arch、宿主版本和发行包哈希分别记录：L0 安装加载、L1 业务读写、L2 准确会话关联、L3 阶段提交及结果、L4 原生跨会话导航/创建。等级是验收维度，可按单项记录；通过 L1 不推导 L3/L4，文档列表要说明真实可用操作。

P0 必须在四端分别验证最小页面、本地服务连接、身份、消息提交、执行反馈、会话跳转和实际执行 cwd，并在 Core-only 安装、Tauri 从未打开和 Tauri 完全退出三种条件下重复关键链路。Codex 若无法实现内嵌 UI，可记录本地页面加深链的受限候选，但不得替换用户要求的宿主内交互，也不能用 Tauri 窗口冒充四端页面通过。ZCode/Claude 缺少跨会话导航时，能保留关联并指引原生打开，不伪装为直接控制。

本方案四端目标的必需项是宿主内真实页面、任务读写、准确当前会话绑定、阶段提交及结果反馈（L0–L3）；L4 的跨会话创建/导航可逐项标注限制。任一必需项缺失都阻塞“四端完整支持”的结论，Codex 页面入口仍属未解决的 P0 产品能力风险；不能靠增加 Core、Tauri 或 MCP 代码补成未经宿主提供的权限。若 P0 证明某端缺接口，应停在能力结论，另行确认分阶段交付范围，不擅自下调目标或用 Bridge 外部会话替代原生执行。

每个声明支持的“宿主版本＋OS/arch＋插件包哈希＋Core 协议范围”要有可复查的安装录像/步骤、真实 ID、消息接纳与终态、退出/重连及拒绝用例。插件支持矩阵/市场内容只按已验证组合生成；单纯 MCP 工具结果、外部浏览器/Tauri 页面和第一方内部插件均不构成宿主内页面通过。

[总览](overview.zh-CN.md) · [当前构建](../engineering/development.zh-CN.md)

## 本次评审后的待验证登记与交付边界

原稿列出的 API/市场文档是候选来源记录，未在本轮重验外部站点或已安装客户端。
以下均为本插件待验证项，不推导上游完全没有能力；真实支持必须固定 OS/arch、
宿主版本、账号/许可、插件包、Core 协议和证据。

| 目标 | L0 市场/信任/无 Desktop 引导 | L1 宿主内页面及任务读写 | L2 准确当前会话/真实 cwd | L3 提交、接纳与结果 | 单独待验边界 |
| --- | --- | --- | --- | --- | --- |
| DSH Desktop | 待验证 | 待验证；Client Modules/Slots 为候选 | 待验证；Session scope 为候选 | 待验证；创建与发送分开 | 多仓/目标工作区交接，取消及断线恢复 |
| ZCode Desktop | 待验证 | 待验证；本地 MCP Apps/侧栏为候选 | 待验证；页面/hook/Attempt 的可靠关联 | 待验证；工具事件不等于 Agent 终态 | 本地工作区限制、跨会话导航及市场信任 |
| Claude Desktop Code | 待验证 | 待验证；支持 Mods 的版本/账号 | 待验证；当前 Mod 上下文与真实目录 | 待验证；原生提交/turn 绑定 | 非本地 Code 会话不默认支持；跨会话枚举/导航和精确取消 |
| Codex Desktop | 待验证 | 待验证；第三方固定/内嵌 UI 仍为 P0 产品阻塞 | 待验证；可信 hook 与 thread/session 映射 | 待验证；预填不是实际提交 | app-server/SDK 新执行不能当现有 Desktop 会话通过 |

M2（原 P0）用最小探针证明候选机制：能否呈现页面、连接独立 Core、获取可信身份，
向准确目标提交并观察回执/反馈、交接真实 cwd。可以用清楚标注的诊断/模拟响应探测桥，
但不能记作真实阶段或本地持久化通过。
M6/M8 才验实际任务—文档—原生执行—终态—验收和退出/恢复的组合闭环。
L0–L3 缺项保留阻塞；L4 创建/跨会话导航及取消逐操作声明限制，
受限候选不能自行替代“四端内操作”的产品目标。

Reed 的 Core 协议支持，不等于 Codex Desktop 提供第三方 UI；Codex 源码中的 app-server
和 SDK 可用于明确的新 AgentExecutor 路径，但不授予控制已有桌面会话或复用桌面账号的权利。
MCP 是部分宿主需要的传输/呈现适配，不是所有入口的硬性依赖，也不能补出原生权限。
宿主不可达时从 Tauri 发起原生阶段必须显示不可用，不静默改派独立引擎。

工作区验证分别覆盖创建、准确目录接入及 Reed 可控提交前再次核验；
多仓部分成功不算全部接入。cwd 漂移时拒绝 Reed 可控派发；仅预填/人工导航端使准备失效、
提示重新核对，不承诺拦截用户原生手动发送，发送情况不明则核查。RF12 在 M6 验已实现端，M8 补齐四端。
回复原生输入/权限时使用[原连接/目标契约](protocol-and-clients.md)，无能力时回原宿主处理；
不将 Reed 验收与执行授权合为一个“通过”。

M2 还需验证[Core 到插件受信端的控制连接](protocol-and-clients.md#core-到宿主的控制通路)：
宿主内页面能发 API 不等于 Tauri 可以回控宿主。逐端登记是否支持页面关闭后的命令/
准确结果、是否仅预填/导航、离线核查能力；不可用动作明确拒绝，不靠共享 UI 补权限。
Core 在无可靠离线终态核查时保持受管理观测驻留，释放页面不等于停止后台路由。
