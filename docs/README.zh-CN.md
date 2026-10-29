# Reed 设计与工程文档

[English](README.md) | [简体中文](README.zh-CN.md)

本目录是汇总后的现行 Reed 设计，先阅读[架构总览](architecture/overview.zh-CN.md)。
产品／运行规范属于设计，实际实现和验证证据独立记录，不把骨架启动写成业务验收。

| 目录 | 责任 | 入口 |
| --- | --- | --- |
| `product/` | 业务语义、流程与交互；内部中文规格 | [领域模型](product/domain-model.md)、[操作流](product/operation-flows.md)、[交互](product/interaction.md) |
| `architecture/` | 工程边界、运行、持久化／副作用及集成规则 | [总览](architecture/overview.zh-CN.md)、[本地运行](architecture/local-runtime.zh-CN.md) |
| `decisions/` | 有日期的决策及取舍 | [Rust Core ADR](decisions/0001-independent-rust-core.zh-CN.md) |
| `engineering/` | 开发／构建、实施顺序及验收 | [计划](engineering/implementation-plan.zh-CN.md)、[资源](engineering/resource-acceptance.zh-CN.md) |
| `references/` | 来源与采纳决定，不重复建立规范权威 | [来源](references/provenance.zh-CN.md)、[统一采用矩阵](references/mechanism-adoption.md) |

详细规范：[生命周期与回收](architecture/lifecycle-and-resources.md)、
[操作回执与恢复](architecture/operations-and-recovery.md)、[协议与客户端](architecture/protocol-and-clients.md)、
[关系与工作区](architecture/relations-and-workspaces.md)、[双向同步](architecture/synchronization.md)、
[故障验收](engineering/failure-acceptance.md)。

未来可选能力：[个人多设备复制与团队预留](architecture/replication.md)、
[ADR-0002](decisions/0002-optional-cloud-replication.zh-CN.md)；仅设计预留，本地 MVP 不依赖云。

不要每轮另写一份带日期的“最终设计”。持续修改所属现行文档，决策变化写 ADR，
历史材料保留日期及来源。ai-code 中旧材料用于追溯，不再作为本工程当前操作指南。
基础工程 smoke test 通过不代表业务 ready、四端集成或 RSC 资源验收通过。

实际命令与产物见[开发／构建指南](engineering/development.zh-CN.md)。

集成专题：[四端适配](architecture/host-adapters.md)、[分发与市场](architecture/distribution.md)。

本轮实际结果：[基础工程验证](engineering/foundation-verification.md)，独立于目标验收。
