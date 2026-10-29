# Web application composition — 内部边界

状态：React 基础状态页装配与 Vite 开发入口已建立；仅手动查询 Core 健康，不含任务、存储、连接器或浏览器配对。Desktop 单独装配同一共享 UI。

## 责任

装配 packages/ui 和 packages/client，注入壳能力及传输；可选独立浏览器入口需另行验证配对和安全会话。

## 约束

不复制业务状态机，不建立 localStorage 任务数据库，不让浏览器持有长期引导凭据；共享装配不导入 Tauri/宿主 SDK。

## 依据

- [工程架构](../../docs/architecture/overview.zh-CN.md)
- [Rust Core 决策](../../docs/decisions/0001-independent-rust-core.zh-CN.md)
- [实施顺序](../../docs/engineering/implementation-plan.zh-CN.md)

本文件是内部维护说明。公开入口提供 [English](../../README.md) 与
[简体中文](../../README.zh-CN.md)。
