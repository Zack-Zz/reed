# Shared TypeScript client — 内部边界

状态：宿主无关健康诊断客户端已实现。消费 reed-protocol 生成的 CoreHealth 类型，验证服务、协议版本、基础模式及响应字段；支持注入传输、类型化错误和请求取消；固定 HTTP 诊断含 3 秒总超时与 16 KiB 实际响应字节上限。当前没有业务 API、事件或重连。

## 责任

消费 reed-protocol 生成的通信类型；提供命令／查询、游标事件、重连／代际处理与可注入 transport；插件使用固定发行输入。

## 约束

不导入 Tauri/宿主 SDK，不直接操作 SQLite、Git 或凭据；不重试未知非幂等写入，不把断线映射成执行已取消。

## 依据

- [工程架构](../../docs/architecture/overview.zh-CN.md)
- [Rust Core 决策](../../docs/decisions/0001-independent-rust-core.zh-CN.md)
- [实施顺序](../../docs/engineering/implementation-plan.zh-CN.md)

本文件是内部维护说明。公开入口提供 [English](../../README.md) 与
[简体中文](../../README.zh-CN.md)。
