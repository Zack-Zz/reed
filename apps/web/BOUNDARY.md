# Web application composition — 内部边界

状态：默认入口装配 `@reed/ui` 的 WorkbenchRoot 与显式 `@reed/ui/mock` 适配，
与 Desktop 共用同一工作台和素材。模拟草稿暂存本 origin 的 localStorage；
`/diagnostics.html` 独立手动查询 Core 健康，不包含真实任务 API、连接器或浏览器配对。

## 责任

装配 packages/ui 和 packages/client，注入壳能力及传输；可选独立浏览器入口需另行验证配对和安全会话。

## 约束

不复制业务状态机；当前 localStorage 仅保存模拟草稿，正式权威任务必须交由 Core，不让浏览器持有长期引导凭据；共享装配不导入 Tauri/宿主 SDK。

## 依据

- [工程架构](../../docs/architecture/overview.zh-CN.md)
- [Rust Core 决策](../../docs/decisions/0001-independent-rust-core.zh-CN.md)
- [实施顺序](../../docs/engineering/implementation-plan.zh-CN.md)

本文件是内部维护说明。公开入口提供 [English](../../README.md) 与
[简体中文](../../README.zh-CN.md)。
