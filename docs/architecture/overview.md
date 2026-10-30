# Architecture and repository boundaries

[English](overview.md) | [简体中文](overview.zh-CN.md)

Status: current design after product-model alignment, 2026-10-30. A diagnostic-only framework is implemented;
business, production runtime management and host integration remain unimplemented.
Rust Core is the confirmed baseline; see [ADR-0001](../decisions/0001-independent-rust-core.md).

## Product ownership

Reed owns the local task/workflow model and its evidence. A task can exist without
an external work item. A connector links provider facts; it does not own the local
workflow. Yunxiao remains authoritative for its own work items. Synchronization
reconciles mapped fields without treating external closure as local acceptance.

All task types share To do, In progress, In review, Done and Archived. Type,
lifecycle, execution and provider facts remain separate. No internal workflow is
selected by default: processing, artifacts and task acceptance can belong directly
to Task. Workflow/stage runs exist only when a template is explicitly adopted.
A conversation association grants navigation, not execution authority; step acceptance
or an Agent exit does not complete the whole task. Board transitions, task acceptance
and archival call the same guarded Core use cases as every other UI.
The [domain model](../product/domain-model.md) and [interaction baseline](../product/interaction.md)
own these business rules. This alignment changes design documents only.

## Three extension ports

| Port | Purpose | Owner |
| --- | --- | --- |
| `ProviderConnector` | External work items, identity/scope, field mappings, pull/write/reconciliation | Reed runtime; Yunxiao CLI first |
| `HostAdapter` | Use Reed inside a native host; trusted session binding, native navigation/submission/events | ai-code Reed plugin |
| `AgentExecutor` | Explicitly run an agent managed from Reed; engine lifecycle and result observation | Reed port; optional ai-mcp Bridge adapter |

A host's native session stays owned by that host. Selecting independent execution
must create an explicit execution owner and run identity; it must not silently
replace the selected desktop conversation. DSH is a host target, not automatically
a Bridge engine. Optional MCP tools map to application use cases and grants;
MCP does not replace any of these three ports.

## Dependency direction

```text
reed-runtime ──> reed-core <── domain-focused tests
      │
      └───────> reed-protocol ──> generated TS wire bindings
                                      │
Desktop/web/host bridge ──> shared UI + client ──> authenticated Core API
```

| Component | Owns | Must not own |
| --- | --- | --- |
| `crates/reed-core` | Domain invariants, workflow transitions, application commands/queries, ports | Tauri, database drivers, transport routing, provider/host SDKs |
| `crates/reed-protocol` | Public DTOs, stable error codes, handshake/event shapes, compatibility fixtures | SQL rows, domain mutation rules, credentials, host-specific APIs |
| `crates/reed-runtime` | Service/management composition; storage, IPC, lifecycle, credentials, provider/system/execution adapters | Window lifecycle, React, a second host's private implementation |
| `packages/client` | Generated wire types, typed API and event/reconnect client, transport injection | Database access, Tauri SDK imports, lifecycle/acceptance decisions |
| `packages/ui` | React features, view models, theme, language, presentation state and shell ports | Tauri/host SDKs, secrets, authoritative workflow or sync state |
| `apps/web` | Assemble shared UI/client, development entry, optional paired browser transport | Independent task storage or a second workflow engine |
| `apps/desktop` | Tauri window/menu/notification/dialog integration; restricted Core bootstrap and bridge | Database access, migrations, provider/Agent execution logic |
| `tooling` / `tests` | Build/contract/distribution tooling; integrated acceptance | User data, private evidence, undeclared runtime hooks |

Three crates form the Core Cargo workspace; the Tauri crate is a separate Cargo
workspace/lockfile under `apps/desktop/src-tauri`. It depends on the protocol only,
never the runtime or domain library. Frontend packages form an npm workspace.
The diagnostic `CoreHealth` DTO is Rust-owned; ts-rs generates the TypeScript file,
and `check:contracts` detects drift. No task API or business schema exists.

## API and system calls

Application use cases sit behind authenticated commands, queries and replayable,
cursor-based events. Transport adapters validate caller/profile/capabilities and
input; the Core applies revision, idempotency, transaction and evidence checks.
All shells use that same path. Tauri commands must not duplicate business use cases.

Prefer private per-user IPC: Unix domain sockets on macOS/Linux and named pipes on
Windows, subject to platform validation. A native bridge exposes only scoped
operations to WebViews. Optional loopback HTTP/event transport needs explicit
pairing, Host/Origin validation and browser session protection. Axum is a candidate
for that optional HTTP adapter, not a reason to expose all native operations to a
browser. Transport details are not frozen.

File access, Git/worktrees, child processes and external CLI calls live behind
runtime adapters. Pass structured arguments to a verified executable with a
known working directory; use explicit scope, bounded output and timeouts.
Do not expose a generic arbitrary-command endpoint to the frontend. A process
handle, timeout, or dropped connection is not proof its process group stopped.

## Shared UI and multiple shells

The shared UI/client import no Tauri or host SDK. A supplied `ShellBridge` handles
approved file opening, navigation and presentation capabilities; each shell owns
its implementation. Browser capabilities may be narrower. React owns pending UI
intent and local view state; committed tasks, sync operations and evidence remain
Core facts. A UI may validate early, but Core repeats authoritative checks.

Only one Core writes a profile, including when four hosts and Desktop are open.
No shell directly opens the database, starts its own synchronizer, or picks a new
profile because its protocol is incompatible. Default profile selection is shared;
other profiles require explicit selection. Window filters/drawers are independent.

The future distribution unit includes fixed UI/client/protocol versions and hashes.
ai-code consumes verified release inputs, not `../reed` checkout links, floating
`main`, or runtime downloads of `latest`. Shared source has one authority in Reed;
the adapter can assemble native host surfaces without cloning workflow logic.

## Feasibility boundary

Codex, Claude Code Desktop Code, ZCode and DeepSeek Harness need separate probes
for plugin installation, native page hosting, trusted session identity, submission,
callbacks, navigation and isolated-workspace handoff. No real Reed host acceptance
has run. Codex's third-party fixed/embedded page path remains unresolved; it is a
P0 blocker for that target. External pages or MCP-only tools must be labeled as
limited alternatives, not counted as native integration acceptance.

Future reverse integration uses `AgentExecutor`, not Tauri-specific engine code.
Keep the existing ai-mcp Bridge external. Prefer its versioned public CLI/JSON or a
separately specified cross-language contract; never port private authentication by
assuming TypeScript and Rust serialize identical bytes.

## Further reading

- [Application protocol, clients and consistency](protocol-and-clients.md) (Chinese)
- [Local runtime, storage and upgrades](local-runtime.md)
- [Implementation sequence](../engineering/implementation-plan.md)
- [Resource acceptance](../engineering/resource-acceptance.md)
- [Design provenance](../references/provenance.md)

## Consolidated specification

This overview owns component boundaries. Detailed internal specifications are
currently Chinese: [domain](../product/domain-model.md), [operation flows](../product/operation-flows.md),
[interaction](../product/interaction.md), [lifecycle/resources](lifecycle-and-resources.md),
[receipts/recovery](operations-and-recovery.md), [relations/workspaces](relations-and-workspaces.md),
and [synchronization](synchronization.md). The [Orca/Codex matrix](../references/mechanism-adoption.md)
records decisions and provenance, not a competing architecture or schedule.

## Current foundation scope

Only `GET /health` on a loopback-only diagnostic server is implemented. It returns
`mode: foundation` with no business capabilities. It is intentionally unauthenticated
and carries no user data; it does not establish the planned authenticated IPC or
business-ready barrier. Desktop reads a fixed endpoint with bounded response size,
timeout and no redirects/proxy. The Web development proxy is not a production browser
authentication design. See [build boundaries](../engineering/development.md).

Detailed targets: [host adapters](host-adapters.md), [distribution/marketplaces](distribution.md) (Chinese).

## Baseline after independent review

Keep the confirmed standalone Rust Core, React UI, optional Tauri and four thin host adapters.
The earlier TS Core/nine-package diagram is historical input, not another implementation plan.
Codex using Rust establishes no Reed performance result. Current diagnostics provide no business
storage/authentication. Application ports, wire DTOs, transports and release artifacts are separate
boundaries within the existing modules, without a full IDE, Agent engine or plugin platform.

The [protocol/client spec](protocol-and-clients.md), lifecycle, operations, relationships and sync
each own their topic. [Eight increments](../engineering/implementation-plan.md) and the
[RF catalog](../engineering/failure-acceptance.md) unify delivery/acceptance; P/T/CP/CT are aliases.
Source observations, design choices and runtime evidence remain distinct. Unsupported host routes
and unproven sync guarantees stay explicitly pending or limited.

Rust Core and ai-code HostAdapter implementations communicate through versioned, scoped control
commands/receipts, not cross-repository library imports or React-only callbacks.
Exact bindings and verified capabilities determine whether control is available; see
[protocol/clients](protocol-and-clients.md#core-到宿主的控制通路).
M4 provides manual relations/documents/read-only snapshots before M6 adds trusted execution
bindings and automated isolation handoff.

## Optional personal replication and future teams

Local-first M1–M8 remain unchanged in scope. See [replication](replication.md) (Chinese) and
[ADR-0002](../decisions/0002-optional-cloud-replication.md).
Same-device shells share one profile Core; different devices keep separate Core/SQLite replicas
and optionally join a shared space. Local revisions, IPC trust/locks and execution grants do not travel.

Future services/reed-server lives in this repository with an independent Cargo workspace/lock,
storage, deployment and upgrades. It reuses pure rules/protocol, not reed-runtime/Tauri.
Existing crates reserve data classification, stable identity, protocol boundaries and runtime hooks;
no cloud code/dependency enters Core-only now. Provider connectors and Reed data replication remain
separate. Sharing data transfers neither native control nor provider write authority.
