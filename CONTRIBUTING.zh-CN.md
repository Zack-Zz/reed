# 参与 Reed 开发

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md)

Reed 当前处于基础建设阶段。先阅读[架构](docs/architecture/overview.zh-CN.md)、
[Core 决策](docs/decisions/0001-independent-rust-core.zh-CN.md)和
[实施顺序](docs/engineering/implementation-plan.zh-CN.md)；Agent 内部规则见 [AGENTS.md](AGENTS.md)。

## 当前开发准备

框架已具备 Rust、npm 和可选 Tauri 构建。
固定依赖、独立产物和实际检查命令见[开发指南](docs/engineering/development.zh-CN.md)。
使用 `npm ci`，有意修改依赖时同时维护 Cargo/npm 锁文件。
开发默认不安装系统服务或连接真实凭据。

Core 构建不需要前端依赖或 GUI SDK；共享 UI/client 不导入原生宿主 SDK。
运行与改动对应的检查，单独审阅未跟踪文件，保持双语公开文档一致。

## 改动边界

领域规则留在 Core，界面状态留在前端，宿主专有行为留在 ai-code。
只有实际依赖、构建或运行边界需要时才新增 crate/package，不按每个领域对象拆包。

行为改动说明触发条件、结果、失败恢复路径和验证边界；新增业务行为先有意义的失败测试，
再实现。文档改动做结构和一致性检查，不人为编写应用测试。

使用模拟数据，不把私人会话、凭据、数据库、日志、worktree 或私有验收证据放进源码仓库。
忽略规则不能代替检查真实暂存内容。

## 文档

公开文档默认英文，提供简体中文对应版本及双向语言切换；术语与事实状态保持一致。
内部边界说明可以中文。不添加没有依据的安装、性能、宿主兼容或发行声明。

## 运行与发行

Core、Desktop、共享 UI、宿主插件、协议和 schema 分别管理版本边界。
真实宿主验证独立于包校验。本轮基础建设不确定发行版本、包名归属或平台支持。
新增安装、迁移、启动或退出行为前，先阅读[本地运行方案](docs/architecture/local-runtime.zh-CN.md)。

旧交互原型尚未迁移。导入资产、代码或模拟浏览器状态前，按
[设计来源与迁移计划](docs/references/provenance.zh-CN.md)执行；保留设计，不把模拟行为升级为正式契约。
