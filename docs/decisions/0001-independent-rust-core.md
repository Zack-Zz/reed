# ADR-0001: Independent Rust Core with a shared Web UI

[English](0001-independent-rust-core.md) | [简体中文](0001-independent-rust-core.zh-CN.md)

Date: 2026-10-29. Status: **confirmed current Rust Core baseline**, retained after independent review. A diagnostic-only Rust service now exists; resource budgets are not benchmarked.

## Context

Reed must serve host plugins even when Desktop is absent. Multiple shells share
one local dataset. Performance and a self-contained startup chain matter more
than using one language everywhere. The previous design used a bundled Node/TS
Core. The user has now asked whether storage, APIs and local system operations
should use Rust. This ADR supersedes the TS Core baseline while retaining
React, optional Tauri and external Agent Bridge integration, without parallel backends.

## Decision

Use a standalone Rust service for domain/application rules, SQLite transactions,
profile lifecycle, authenticated APIs, connectors, files/worktrees and controlled
process operations. Use React/TypeScript for the shared UI and client. Tauri is a
client shell with its own Rust host process; it is not the Reed Core service.

The Core-only product must not require a global Node/Rust installation or a
Desktop-owned sidecar. Release binaries still need explicit OS/architecture and
system-library compatibility checks; “Rust” does not imply universal static binaries.
Keep optional Node/Python Agent SDK or Bridge workers outside the Core, start them
only for enabled capabilities, and account for their real resource cost.

| Area | Direction | Reason / condition |
| --- | --- | --- |
| Workflow/use cases | `reed-core` Rust library | One authoritative rule set shared by every shell |
| Persistence | SQLite in `reed-runtime` | Local transactions, migrations and consistent backups |
| Async orchestration | Tokio candidate | IPC/events/process I/O, with explicit bounded blocking workers |
| SQLite driver | Start by evaluating rusqlite plus a bounded database worker | Direct SQLite/backup control; compare SQLx if the spike shows a concrete need |
| Optional HTTP API | Axum candidate | Scoped loopback adapter only; private IPC remains first choice |
| Wire contract | Rust DTOs in `reed-protocol` generate TS; schema joins the same authority if needed | Avoid duplicate authority; generation is not runtime/permission validation |
| Desktop | Tauri client shell | Window/system presentation; no business database connections |
| Agent integration | External Bridge/SDK via `AgentExecutor` | Reuse engine integrations without rewriting them in Rust |

The first slice pins dependencies in Cargo/npm manifests and lockfiles; ts-rs
generates diagnostic types. Business dependencies and full wire protocols remain future work.
MCP, when a host requires it, remains a thin protocol adapter rather than the Core.

## Why Rust here

Rust can provide an independently distributable service without shipping a
resident Node runtime for basic local tasks. It gives precise control over
allocations, bounded buffers and native operations, and shares the native
language used by Tauri. This is a fit assessment, not a measured claim that Rust
uses a particular fraction of Node's memory or will meet every resource budget.

Node/TypeScript remains a viable service option and has a shorter path to some
Agent SDKs and the current prototype. Its costs here are a bundled runtime and
native dependency/distribution work. Rust adds ownership/async complexity, a
cross-language wire contract, and more platform build work. For Reed's priorities,
we recommend paying that engineering cost in the persistent Core while retaining
TypeScript where it already fits. Go is also viable for a standalone service but
introduces a third native language alongside Tauri; there is no current need for it.

## Constraints that the language does not solve

- One service holds a lifetime ownership lock per profile. A separate control
  lock serializes upgrade/activation metadata; neither is replaced by a PID file.
- SQLite calls run outside async executor threads, through bounded workers and
  short transactions. Network/CLI/Agent calls never hold a DB transaction open.
  Tokio's started `spawn_blocking` work cannot simply be aborted; persistent
  workers need a shutdown protocol, not an unbounded blocking-pool loop.
- Stream process output and artifact pages with size limits. Dropping a child
  handle or timing out a CLI is not proof its execution stopped. Cancellation
  needs ownership, process-group handling and observed results on each platform.
- Core-only credentials must work independently of the Desktop package, its
  unlock state and Tauri vault. Denied/locked secure storage fails explicitly,
  without falling back to plaintext. Upgrades must preserve credential access.
- Native client grants and browser/host bridges need independent authorization.
  Tauri capabilities do not authorize Core operations on their own.
- A fixed public Bridge CLI/JSON is a candidate for the first execution adapter.
  Do not reproduce ai-mcp's private HMAC/canonicalization rules in Rust. A future
  native protocol needs owner-defined bytes and cross-language test vectors.
  Closing a UI/client must not call Bridge runtime shutdown or cancel owned runs.
- Rust does not grant a host a native page, session identity or workspace control.
  Four-host feasibility and resource acceptance remain independent gates.

## First validation slice

Before implementing the full task model, prove a packaged Core can be started
from a clean GUI environment without Desktop/global Node, share one writer under
concurrent connection, read credentials, perform one durable round trip, stop and
restart safely, and report actual resource use. Validate paired browser/private
IPC denial cases, bounded SQLite work, and a crash during version activation.
Use synthetic test data. The production schema/API, Agent drivers and workflow
engine follow only after these foundation risks are addressed.

## Sources and scope

Checked on 2026-10-29. These sources document mechanisms, not Reed acceptance:

- [Tauri process model](https://v2.tauri.app/concept/process-model/): the native host and WebView are separate roles; Reed adds its independent service boundary.
- [Tokio blocking work](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html) and [process lifecycle](https://docs.rs/tokio/latest/tokio/process/): blocking/cancellation and child ownership need explicit design.
- [SQLite WAL](https://www.sqlite.org/wal.html) and [backup API](https://www.sqlite.org/backup.html): concurrent reads do not allow multiple simultaneous writers, and backups need consistency.
- [rusqlite](https://docs.rs/rusqlite/latest/rusqlite/) and [Axum](https://docs.rs/axum/latest/axum/): implementation candidates, not frozen versions.

See [runtime requirements](../architecture/local-runtime.md), [resource acceptance](../engineering/resource-acceptance.md)
and [provenance](../references/provenance.md) for related decisions and the superseded Node baseline.

Independent review retains Rust without treating Codex's language as evidence. Measure the current
release against RSC first. An equivalent packaged TS comparison is needed only if reopening the
language decision; do not maintain two production Cores.
