# Reed

[English](README.md) | [简体中文](README.zh-CN.md)

**Many agents. One flow.**

A local-first workbench for AI coding workflows. Reed brings tasks, agent
conversations, Git branches, workspaces, and artifacts into one traceable flow,
from requirements through design and development to verification.

## Project status

**Runnable engineering foundation.** The standalone Rust Core exposes only local
health diagnostics. React provides a shared diagnostic page, and Tauri is a
separately built optional client. There are no tasks, workflow engine, SQLite,
provider sync, production IPC/authentication, or host plugins yet. No installable
release is published. The earlier business interaction prototype remains in
`ai-code/plugins/reed/`.

See the [consolidated documentation](docs/README.md) and
[development/build instructions](docs/engineering/development.md).

## Product direction

- Give every task an independent workflow and acceptance history.
- Keep a personal board with To do, In progress, In review, and Done; transitions
  into review or completion must satisfy the corresponding evidence and criteria.
- Link conversations, branches, isolated worktrees, and versioned documents to tasks.
- Connect multiple external sources, starting with Yunxiao, with explicit source
  attribution, editable mappings, bidirectional sync, and conflict handling.
- Offer one shared React experience in an optional Tauri desktop window and in
  supported Code Agent hosts, with system/light/dark themes and English/Chinese.
- Keep data on the local machine. Opening Reed Desktop must remain optional.

These are design goals, not a list of shipped features.

## Architecture

The recommended Core implementation is **Rust**. React and TypeScript own the
shared interface; Tauri provides an optional native shell. Rust owns workflow
rules, local persistence, authenticated APIs, and controlled system operations.
See [the Rust Core decision](docs/decisions/0001-independent-rust-core.md) for
tradeoffs and the work still needed to validate this direction.

```text
Optional Reed Desktop ─┐
Code Agent adapters ───┼─ authenticated client API ─ Independent Reed Core
Other approved shells ┘                            ├─ SQLite + local artifacts
                                                   ├─ connectors + Git/worktrees
                                                   └─ optional AgentExecutor
```

One OS user and one Reed profile share one Core writer and one local dataset.
Closing a window only closes that client. Core must be discoverable and startable
without installing or opening Tauri. MCP is an optional adapter, not the storage
layer or a prerequisite for the Core API.

## Repository ownership

| Repository | Responsibility |
| --- | --- |
| **reed** | Product model, Rust Core, protocol, shared client/UI, Tauri shell, connectors, local data lifecycle, product validation and distribution |
| **ai-code** | Reed adapters for Codex, Claude Code Desktop Code, ZCode, and DeepSeek Harness; host manifests, native bridges, and marketplace packaging |
| **ai-mcp** | Its reusable Agent Bridge and engine integrations, consumed through an explicit execution contract when enabled |

The four hosts are integration targets. Native pages, session identity, execution,
and callbacks need separate version-specific acceptance. Codex's third-party
embedded page path remains an open feasibility item; MCP support does not settle it.

## Layout

| Path | Intended role |
| --- | --- |
| `crates/reed-core/` | Domain rules, application use cases, and ports |
| `crates/reed-protocol/` | Versioned wire DTOs and cross-language contract authority |
| `crates/reed-runtime/` | Standalone service, management entry, storage, IPC, OS and provider adapters |
| `apps/web/` | Shared web application composition and development entry |
| `apps/desktop/` | Optional Tauri shell and its restricted UI bridge |
| `packages/client/` | Host-neutral TypeScript client and generated wire bindings |
| `packages/ui/` | Shared React interactions, presentation state, styles and branding |
| `tooling/` | Future contract generation, build and distribution tooling |
| `tests/` | Future cross-component, lifecycle, security and resource acceptance |
| `docs/` | Current architecture, decisions and implementation sequence |

The Core Cargo workspace contains three crates. Desktop's Rust shell is a separate
Cargo workspace with its own lockfile, so a Core build does not resolve WebView
or Tauri dependencies. An npm workspace builds the client, UI and two frontend
entries. The shared contract is generated from Rust. Versions of `0.1.0` identify
the current development scaffold, not a public release or package-name ownership.

## Build and run from source

```sh
# Core only: no npm, React or Desktop required.
cargo build --locked --release -p reed-runtime --bin reedd
./target/release/reedd

# In a separate terminal: optional Web or Desktop, after project dependency setup.
npm ci
npm run dev:web
# Or: npm run dev:desktop
```

The source build pins Rust 1.89.0. Node ≥22.12 is needed for frontend/tooling only;
Python ≥3.11 is needed only for the optional boundary checks. If the exact Rust
version is not installed, follow the [development guide](docs/engineering/development.md).
Core listens on `127.0.0.1:47821` by default. `GET /health` returns non-sensitive
foundation metadata, **not business readiness**. No business mutation endpoint is
exposed. Web development uses a fixed Vite proxy; Desktop uses its restricted
native diagnostic bridge. Start Core separately; these shells currently do not
install, start, stop or upgrade it. Production discovery/authentication is future work.

## Installation and local data

The planned installation has two steps: install the user-level **Reed Core**,
then install the Reed plugin in each desired host through its native marketplace.
**Reed Desktop is optional** and connects to that same Core. Installers, commands,
package names, and platform support are not published yet.

Planned profile data roots:

| Platform | Data directory |
| --- | --- |
| macOS | `~/Library/Application Support/Reed/profiles/<profile-id>/` |
| Windows | `%LOCALAPPDATA%/Reed/profiles/<profile-id>/` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/Reed/profiles/<profile-id>/` |

These directories have not been created by this foundation work. Database files,
artifacts, backups, and recovery records belong outside source trees, plugin caches,
and the Desktop installation. Credentials use Core-accessible OS secure storage;
a plain local database is not an encryption guarantee. External synchronization
sends explicitly selected data to the configured provider. Host agents may use
remote model services under their own settings. Local-first does not mean offline
execution of every connected tool.

## Read next

- [Architecture and boundaries](docs/architecture/overview.md)
- [Independent Rust Core decision](docs/decisions/0001-independent-rust-core.md)
- [Data, security, installation and upgrades](docs/architecture/local-runtime.md)
- [Implementation sequence and acceptance](docs/engineering/implementation-plan.md)
- [Resource budgets](docs/engineering/resource-acceptance.md)
- [Development and contribution](CONTRIBUTING.md)
- [Design provenance and migration](docs/references/provenance.md)

## License

[MIT](LICENSE).
