# Shared React UI — 内部边界

状态：唯一产品前端已迁入 `src/workbench`，Web／Tauri 共用组件、页面、文案、主题和素材。
`src/mock` 通过独立入口显式注入，提供模拟规则和本地演示草稿，不代表 Core 业务。
FoundationApp 保留为独立健康诊断页；默认工作台不调用 Core。

## 责任

任务／看板／详情／文档／会话／分支／连接器、主题／语言与壳端口；保留 Reed 品牌、克制样式、紧凑设置和右侧抽屉。

## 约束

不导入 Tauri/宿主 SDK，不保存正式业务的权威任务／验收／同步事实。当前模拟流转仅调用注入的 mock 规则；
正式接入后由 Core 用例判定，不能直接改状态绕过产物和验收。临时前端端口不等于正式通信契约。

## 依据

- [工程架构](../../docs/architecture/overview.zh-CN.md)
- [Rust Core 决策](../../docs/decisions/0001-independent-rust-core.zh-CN.md)
- [实施顺序](../../docs/engineering/implementation-plan.zh-CN.md)

本文件是内部维护说明。公开入口提供 [English](../../README.md) 与
[简体中文](../../README.zh-CN.md)。
