# Contributing to Reed

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md)

Reed is currently establishing its foundation. Start with the
[architecture](docs/architecture/overview.md), [Core decision](docs/decisions/0001-independent-rust-core.md),
and [roadmap](docs/engineering/implementation-plan.md). Internal Agent guidance is in [AGENTS.md](AGENTS.md).

## Current development setup

The framework now has Rust, npm and an optional Tauri build. Follow the
[development guide](docs/engineering/development.md) for pinned dependencies,
independent build outputs and actual check commands. Use `npm ci`; commit Cargo
and npm lockfiles with intentional dependency changes. Development must not
install system services or connect to real credentials by default.

Core builds do not require frontend dependencies or a GUI SDK. Shared UI and
client code do not import native host SDKs. Run the relevant checks, review
untracked files explicitly, and keep both public documentation languages aligned.

## Change boundaries

Keep domain rules in the Core, UI state in the frontend, and host-specific behavior
in ai-code. Introduce a new crate or package only for a real dependency, build, or
runtime boundary. Do not split every domain object into a package.

Describe the trigger, resulting behavior, failure/recovery path, and validation
boundary for behavior changes. Write a meaningful failing test before implementing
new business behavior. Documentation changes need structural and consistency
checks rather than artificial application tests.

Use synthetic fixtures. Keep personal conversations, credentials, databases,
logs, worktrees, and private acceptance evidence outside the source repository.
An ignore rule does not replace checking what is actually staged.

## Documentation

Public documentation starts in English and has a Simplified Chinese counterpart
with reciprocal language links. Keep terminology and factual status aligned.
Internal boundary notes may be Chinese. Do not add unsupported installation,
performance, host compatibility, or release claims.

## Runtime and release work

Core, Desktop, shared UI, host plugins, protocol, and schema have distinct version
boundaries. Native host verification is separate from package validation. No
release version, package ownership, or platform support is established by this
foundation. Read the [local runtime plan](docs/architecture/local-runtime.md) before adding
installation, migration, startup, or shutdown behavior.

The earlier interaction prototype has not moved. Follow the
[provenance and migration plan](docs/references/provenance.md) before importing any assets,
code, or simulated browser state. Preserve its design without promoting mock
behavior into production contracts.
