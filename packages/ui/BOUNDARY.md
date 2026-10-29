# Shared React UI — 内部边界

状态：共享 React 基础状态页已实现，含集中维护的中英文文案、跟随系统／浅色／深色外观、可注入的手动 Core 诊断。完整业务原型未迁入。

## 责任

任务／看板／详情／文档／会话／分支／连接器、主题／语言与壳端口；保留 Reed 品牌、克制样式、紧凑设置和右侧抽屉。

## 约束

不导入 Tauri/宿主 SDK，不保存权威任务／验收／同步事实。看板拖拽提交 Core 用例，不能直接改状态绕过产物和验收。

## 依据

- [工程架构](../../docs/architecture/overview.zh-CN.md)
- [Rust Core 决策](../../docs/decisions/0001-independent-rust-core.zh-CN.md)
- [实施顺序](../../docs/engineering/implementation-plan.zh-CN.md)

本文件是内部维护说明。公开入口提供 [English](../../README.md) 与
[简体中文](../../README.zh-CN.md)。
