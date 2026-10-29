# 设计来源与迁移

[English](provenance.md) | [简体中文](provenance.zh-CN.md)

这里是独立 Reed 产品工程的基础，不移动、删除或改写原型及历史设计记录。
当前 README、架构和 ADR 描述本工程现状，旧稿运行时假设不覆盖新工程约定。

## 既有设计输入

以下文件仍位于同级 **ai-code** 仓库，路径只用于追溯来源，不构成 checkout 依赖，
也不表示已发布到远端。2026-10-29 读取时部分文件未跟踪；ai-code HEAD 为
`55b2d195bb8bb0639fe3ed98783d4019b7256b0c`，该提交本身不包含全部这些文件。
哈希标识本地输入，不是发行验证。

| ai-code 内相对路径 | 检查时 SHA-256 |
| --- | --- |
| `docs/design/2026-10-27-workflow-workbench-architecture-and-plan.md` | `ae2f18e0bc99417de51ec12773de23671ce8690cf004731a5be48a52940e8785` |
| `docs/design/2026-10-27-workflow-workbench-product-research.md` | `aaa431770699772d5e46807a651e7af6cfa485502639a74c7c2327a8878660b6` |
| `plugins/reed/docs/design/2026-10-28-reed-business-domain-model.md` | `38a46663b4e32313c8edc02bdae9c57b42f6a1fcb1de0c7bb3d48b0e66abaf74` |
| `plugins/reed/docs/design/2026-10-28-reed-business-operation-flows.md` | `19329d5edfe39fc7d06cf361de81f86c979ae05678b2977c7d9252f1b60a3e7a` |
| `plugins/reed/docs/design/2026-10-28-reed-interaction-design.md` | `c944a9524501d345eef5085248ec7da21af297f83c63082ea44c8a8145d39a4a` |
| `plugins/reed/prototype/README.md` | `b246f14e7a846e3e9ca2f2413487967e648f2b015221ab7abdbf17f429a8c24c` |
| `docs/design/2026-10-29-reed-orca-mechanisms-reference.md` | `64bb012b9c24ea3205c6209f292c207eaa4c0c47de7351a1676e7905267af9aa` |
| `docs/design/2026-10-29-reed-codex-architecture-reference.md` | `97c8aecb6290ef2913cb7f96a0caaf77ef0491d4f347ff359697b0e712486bc7` |

此前架构仍写有随包 Node/TypeScript Core 和“待创建独立工程”，这些假设在本工程由
实际 Reed 仓库及已确认的独立 Rust Core ADR 替代。
旧稿保留为先前设计，不作为当前操作指南。
领域／操作规格现位于 product/；原始文件保留为来源历史，原型应用代码仍待迁移。

## 保留的产品决策

产品名 Reed，无中文名；副标题 **Many agents. One flow.**
保留已确认的平衡编织 R 插件图标与 R+eed 页面标识。
保留克制的浅色界面、系统／浅色／深色、中英文设置收纳左下角、紧凑控件、
个人看板及保留看板上下文的右侧详情抽屉。

延续独立任务生命周期、版本化证据／验收、会话和分支／工作区关系、多连接来源、
同步冲突与工作区交接要求。模拟交互不能证明正式状态机或真实来源连接可用。

## 迁移顺序

1. 清点设计文档、选定品牌资产、原型源码及许可证，记录真实内容哈希；
   不导入缓存、依赖或秘密。
2. 将业务模型／操作流与当前架构对齐；历史保留日期，调整链接不重写旧验证结论。
3. 将宿主无关 React 组件／样式提取到 `packages/ui`，应用装配放 `apps/web`；
   保留视觉决策，并明确标记模拟功能。
4. 按已验证的纵向切片，用 `packages/client` 和 Core 契约替换浏览器业务状态。
   主题／语言等无害视图偏好可以保存在各壳，本地任务／证据／同步事实不能分窗口存储。
5. Tauri 专有代码放 `apps/desktop`，原生宿主适配和市场资源留在 ai-code；
   先形成固定共享制品，再定义插件输入。
6. 本地流程、真实存储、外部回写和各宿主分别验证。
   没有明确有版本且测试过的导入／导出路径，不宣称原型 localStorage 已迁移到 SQLite。

本轮已迁入并重连业务模型与操作流，按主题汇总交互及 Orca 机制；原型应用代码仍在 ai-code。
已确认的插件图标按字节复制为 Tauri 编译图标，没有重绘品牌资产，也未把模拟配置当真实凭据读取。
现有 MIT 许可证及版权行保持不变。

## Agent Bridge 边界依据

在 ai-mcp HEAD `5167145a04620be91353a3933276bcd949017619` 检查其工作树。
现有 Bridge 声明 Node ≥22.16，并有 CLI/JSON 控制通路；只有启用对应执行适配时才引入
这个依赖，不代表 Rust Core 本体依赖 Node。
其私有 IPC 对 JavaScript 序列化字节签名，runtime 关闭会取消其拥有的任务。
跨语言原生控制需要明确公开契约和测试，客户端断开不能实现成 runtime 关闭。
这是源码核对，不是集成或性能验证。

## 独立评审合并记录

2026-10-29 按用户确认的评审结论更新本工程正式规范，未改写 ai-code 原稿。
[统一机制采用表](mechanism-adoption.md)记录两份参考的采纳/改造/先验/延后/拒绝，
不复制其全文；协议/客户端、运行/存储、关系与同步分别维护权威，
M1–M8 / RF / RSC 统一实施验收。回执顺序与租约已有规则沿用，不另建组件。
本次只更新文档；既有基础工程测试/GUI 记录保留其原日期和边界，未重跑或升格为业务通过。

本次整体复核进一步在所属规范修正 M3/M4/M5 的前置依赖、暂停中的准确答复、
阶段接受同步依据、原生回控通路、恢复后旧请求及过期观察的处理，并补齐 RF 子场景归属。
没有改变 Rust/SQLite 权威、两步安装或四端目标；来源哈希和基础验证历史保持原记录。

## 可选云复制的设计输入

2026-10-29 用户确认先个人多设备共享、未来团队协作，并要求仅补充设计。
本次新增[复制专题](../architecture/replication.md)/ADR-0002，同步现行边界与计划；
属于用户目标的后续扩展，不来自 Orca/Codex 的默认采纳。
本地 M1–M8 只预留稳定身份/设备归属/变更采集边界，C1–C3 和 RF27–34 留云阶段，
服务工程/部署/账号和云同步代码均未建立；没有改写旧来源哈希或基础验证成绩。
