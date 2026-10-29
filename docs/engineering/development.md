# Development and independent builds

[English](development.md) | [简体中文](development.zh-CN.md)

## Prerequisites and versions

The source pins Rust **1.89.0**, React **19.3.1**, TypeScript **5.9.3**, Vite **8.3.5**,
Tauri Rust **2.11.6** / build **2.6.3**, and Tauri CLI/API **2.12.4** in manifests/locks.
Newer Tauri Rust 2.12 requires Rust 1.90; this slice deliberately retains the existing
Rust 1.89 toolchain. The JS/Rust combination is checked locally, not a general
cross-version compatibility promise. `0.1.0` is a development identifier only.

Frontend tooling needs Node ≥22.12 and npm (verified locally with Node 24.4.1/npm
11.4.2). Optional boundary gates need Python ≥3.11 (`tomllib`); Python 3.9 will not
work. Python and Node are not Core runtime/build dependencies. The markdownlint
helper `run-con` is locked to 1.3.2 to avoid ini 7's newer Node requirement.

Install a missing project toolchain explicitly yourself, for example
`rustup toolchain install 1.89.0 --profile minimal --component rustfmt,clippy`.
The local verification used the already-installed `stable` alias at exactly 1.89.0
with `RUSTUP_TOOLCHAIN=stable`; it did not upgrade that toolchain. That override
is an environment choice, not a change to global settings or the project pin.

Tauri source builds also require platform prerequisites. On macOS this includes
the Apple command-line SDK; Windows needs MSVC/WebView2, Linux the documented
WebKit/GTK libraries. See [official prerequisites](https://v2.tauri.app/start/prerequisites/).
Only the local macOS build is established in this slice; no Windows/Linux GUI
acceptance or signed installer is claimed.

## Build boundaries and outputs

| Component | Command from repository root | Output | Requires |
| --- | --- | --- | --- |
| Core runtime | `cargo build --locked --release -p reed-runtime --bin reedd` | `target/release/reedd` (`.exe` on Windows) | Rust/Cargo, no npm/Tauri |
| Protocol type export | `npm run generate:contracts` | `packages/client/src/generated/CoreHealth.ts` | Rust + Node; source is Rust |
| TS client | `npm run build:client` | `packages/client/dist/` | Node/npm, committed generated type |
| Shared React UI | `npm run build:ui` | client + `packages/ui/dist/` | Node/npm |
| Browser frontend | `npm run build:web` | shared output + `apps/web/dist/` | Node/npm; no Core build |
| Desktop frontend | `npm run build:desktop:ui` | shared output + `apps/desktop/dist/` | Node/npm; no Rust/Core build |
| Tauri executable | `npm run build:desktop` | `apps/desktop/src-tauri/target/release/reed-desktop` | Node + Rust + OS WebView SDK; no Core build |

Desktop has its own Cargo workspace and lock. Its build hook builds only the
Desktop frontend. It imports `reed-protocol`, not `reed-core` or `reed-runtime`.
Shared packages publish no registry packages: their local `dist` exports support
independent checks, while Vite aliases source for development. Production plugin
artifact exports and marketplace packaging are still future work.

Run `npm ci` before frontend/tooling commands. `npm run build` builds shared packages
and the Web frontend only; it does not implicitly build Core or Tauri. Core Cargo
commands do not resolve GUI dependencies because Desktop is excluded from that workspace.
The Tauri build uses `--no-bundle`; signing, icons for installers and installer
formats are not configured for distribution.

## Run each process explicitly

```sh
# Terminal 1: Core only. --listen 127.0.0.1:0 selects an ephemeral port for tests.
cargo run --locked -p reed-runtime --bin reedd

# Terminal 2: choose one UI.
npm run dev:web       # http://127.0.0.1:1420; fixed /core proxy
# npm run dev:desktop # Tauri window; frontend dev server on 1421
```

The shells do not auto-start or stop Core. Close/quit Tauri independently; Core
continues until its own interrupt/termination signal. No profile/database/user
configuration is created. The daemon currently stays resident until signaled:
planned idle leases, automatic discovery, managed stop and OS autostart are **not
implemented**. The 60+5-second target is a future lifecycle gate, not current behavior.

`GET http://127.0.0.1:47821/health` is a public, non-sensitive diagnostic with
`mode: foundation` and an empty capability list. Only loopback binds are allowed.
This is not authenticated business IPC or business-ready. The Web dev proxy and
Desktop's fixed `core_health` command are separate transports for that same DTO.
No arbitrary URL, process command, file API or task mutation is exposed.

## Checks

```sh
cargo test --locked --workspace
cargo fmt --all --check
cargo clippy --locked --workspace --all-targets --all-features -- -D warnings
npm run check
npm run build:web
npm run build:desktop
cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml --lib
npm run smoke:core -- --release
```

`npm run check` checks generated-contract drift, builds/types, frontend tests,
negative architecture fixtures, declared boundaries and Markdown. For a Core-only
build none of these Node/Python checks are required. `smoke:core` launches its own
Core on an ephemeral port, reads diagnostics, verifies absent task/write endpoints,
and terminates only that child. It is not a performance or real-host test.
The Windows smoke checks process termination but not Unix SIGTERM graceful semantics.

No production service installer, SQLite migration, Yunxiao connection, Agent engine,
four-host plugin acceptance or RSC resource acceptance is included. Future gates
remain in the [implementation plan](implementation-plan.md) and
[failure/resource specifications](failure-acceptance.md).

## Optional local macOS application bundle

For local GUI smoke verification only, run the following after frontend setup:

```sh
npm run tauri -w @reed/desktop -- build --bundles app --config '{"bundle":{"active":true}}'
```

Output: `apps/desktop/src-tauri/target/release/bundle/macos/Reed.app`.
It is a local application bundle, not a signed/notarized installer or published
release. Default `build:desktop` still builds the executable without bundling.
Actual local results are in the [foundation verification record](foundation-verification.md) (Chinese).

M3 persistence-foundation probes differ from M4 business readiness; current health diagnostics
pass neither business readiness nor a capacity gate. reed-core currently has no domain implementation
and disables empty lib/doc-tests. M4 must enable meaningful domain/transaction tests for real use
cases rather than treating that empty package or old foundation counts as domain acceptance.

## Future server build reservation

See [replication](../architecture/replication.md) and ADR-0002.
services/reed-server and local/replication submodules are planned paths, not existing projects.
No server build/deploy commands or workspace/lock changes are introduced.
The cloud phase creates an independent Cargo workspace/lock, storage/migrations and release checks.
Core-only builds must not resolve cloud dependencies; the server must not depend on reed-runtime/Tauri.
Current commands and foundation evidence still cover the local diagnostic framework only.
