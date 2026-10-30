# Reed design and engineering documents

[English](README.md) | [简体中文](README.zh-CN.md)

This directory holds the consolidated current Reed design. Start with the
[architecture overview](architecture/overview.md). Product and operational
specifications are designs; implementation evidence is recorded separately.

| Directory | Responsibility | Entry |
| --- | --- | --- |
| `product/` | Business meaning, workflow and interaction (internal Chinese specs) | [Domain](product/domain-model.md), [flows](product/operation-flows.md), [interaction](product/interaction.md) |
| `architecture/` | Boundaries, runtime, persistence/effects and integration rules | [Overview](architecture/overview.md), [runtime](architecture/local-runtime.md) |
| `decisions/` | Dated decisions and their tradeoffs | [Rust Core ADR](decisions/0001-independent-rust-core.md) |
| `engineering/` | Development/build instructions, implementation and acceptance | [Plan](engineering/implementation-plan.md), [resources](engineering/resource-acceptance.md) |
| `references/` | Design provenance and adoption decisions, not normative duplicates | [Provenance](references/provenance.md), [Orca/Codex decisions](references/mechanism-adoption.md) |

Detailed internal architecture specs: [lifecycle/resources](architecture/lifecycle-and-resources.md),
[operation receipts/recovery](architecture/operations-and-recovery.md),
[protocol/clients](architecture/protocol-and-clients.md),
[relationships/workspaces](architecture/relations-and-workspaces.md),
[synchronization](architecture/synchronization.md), and
[fault acceptance](engineering/failure-acceptance.md). These are currently Chinese.

Future optional capability: [personal replication/team reservation](architecture/replication.md)
(Chinese) and [ADR-0002](decisions/0002-optional-cloud-replication.md).
These reserve the design; local MVP requires no cloud.

Do not create a new dated “final design” on each change. Update the responsible
current document; add an ADR for a changed decision and retain dated source facts.
Historical material in ai-code is provenance, not this repository's active setup guide.
A passed framework smoke test does not satisfy business-ready, four-host or RSC gates.

For actual commands and outputs, see [development/builds](engineering/development.md) and
[shared frontend development](engineering/frontend.md).

Internal integration specifications: [host adapters](architecture/host-adapters.md) and [distribution](architecture/distribution.md) (Chinese).

Local implementation results: [foundation verification](engineering/foundation-verification.md) (Chinese), distinct from target acceptance.
