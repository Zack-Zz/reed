# Development standards and agent workflow

[English](standards.md) | [简体中文](standards.zh-CN.md)

These are Reed's development rules for people and Code Agents. They apply to the
current Rust/React/Tauri repository, not to the historical ai-code prototype.
Engineering practice observations and adoption decisions are recorded separately
in [the Codex CLI / Tauri comparison](../references/engineering-practices.md).

## Authority and current scope

- [AGENTS.md](../../AGENTS.md) routes Agent work and records repository safeguards.
- [Architecture](../architecture/overview.md) owns package responsibilities and
  dependency direction; each module's `BOUNDARY.md` states its local scope.
- [Product specifications](../product/domain-model.md) own business semantics.
  This document owns development practice, not a second product model.
- [Development](development.md) owns versions, commands and build outputs;
  [frontend development](frontend.md) owns the current shared UI implementation.
- A task or skill does not grant permission beyond the user's assignment. Existing
  authorization covers routine implementation choices; do not repeatedly ask for it.
  Raise an uncovered product decision, boundary change or irreversible action before
  doing the dependent work. Git/release and external writes need their own authorization.

The formal workbench currently uses an explicit mock adapter. Core business storage,
authenticated business APIs and real host/connector execution remain future work.
Implement only the assigned slice and label its evidence accurately.

## Before changing files

Check the real repository, branch, HEAD, working tree and untracked files. Read the
root instructions, contribution guide, docs navigation and the owning boundary note.
Trace the relevant implementation, callers and tests. Give a proportionate plan:
expected behavior, files/modules affected, failure cases and validation. An analysis
or review request stays read-only unless implementation is also authorized.

Do not overwrite another task's changes. Parallel tasks need disjoint file ownership
or explicit coordination; a separate worktree does not isolate shared databases,
ports or remote resources. Avoid automatic stash/reset/cleanup of other work.

## Module and dependency rules

| Owner | Responsibility and limits |
| --- | --- |
| `crates/reed-core` | Pure domain/application rules and ports; no storage, network, GUI or host SDK implementation |
| `crates/reed-protocol` | Versioned wire types and compatibility; no database entities or application decisions |
| `crates/reed-runtime` | Independent service and infrastructure adapters; no window or React dependency |
| `packages/client` | Host-neutral transport and generated types; no UI, app-shell or native SDK dependency |
| `packages/ui` | Shared product presentation; may consume client, never import an app shell or native SDK |
| `apps/web`, `apps/desktop` | Compose shared UI/client and inject allowed capabilities; do not import each other's implementation |
| `packages/ui/src/mock` | Explicit preview adapter, fixtures and simulated rules; not a Core contract or production persistence |
| `tooling`, root `tests` | Engineering checks and their tests, not a product service or user-data directory |

Workbench and the public UI entry must not obtain mock code indirectly through a
barrel/helper. Shell composition may explicitly select `@reed/ui/mock`. Production
JS/TS sources must not import test files or test-only framework modules; tests may
import the implementation. Type-only imports still create an ownership dependency.

Rust manifests and the two Cargo workspaces keep Core builds independent of GUI
dependencies. The present foundation checker rejects all dependencies in reed-core
and allows only a small protocol set. When real domain work needs an additional
pure dependency, review its ownership and deliberately update the gate and fixtures;
do not evade the check with an alias or silently broaden it.

Add a crate/package only for an actual dependency, build or runtime boundary.
Keep external connectors replaceable. Host adapters belong to ai-code; reusable
Agent Bridge code belongs to ai-mcp. Cross-repository changes need that repository's
instructions and applicable authorization.

## Code organization and language practice

- **Rust:** use the pinned toolchain, rustfmt and scoped Clippy checks. Keep binary
  entry points thin, expose the smallest useful library/port surface, and return
  structured errors for expected failures. Isolate blocking filesystem/database
  operations from asynchronous execution threads; bound queues, reads and outputs.
- **TypeScript/React:** new modules and boundaries use TS/TSX with strict checking.
  Keep Hooks at the top level, rendering pure and props/state immutable. Move actual
  effects into handlers/effects or injected adapters and clean up subscriptions/timers.
  Existing migrated JSX retains its documented `allowJs` / `checkJs: false` scope.
- **Internal UI contracts:** define producer/consumer interfaces together. Prefer
  feature-specific capabilities and narrow view projections; do not add a component's
  private assertion of an untyped service as a substitute for a shared interface.
  Existing synchronous/unknown mock ports are migration debt, not the Core API.
- **Placement:** pages compose features; reusable forms must not depend on page
  modules. Keep task, relation and connector-specific components/coordination near
  their feature. Share a component/helper only when actual consumers justify it.
  Create local feature directories when needed, not empty scaffolding or new packages.
  Existing flat files need not all move in an unrelated change.
- **Python/tools:** follow PEP 8 naming/indentation and keep scripts small, deterministic
  and standard-library based when practical. Report a nonzero exit for a failed gate.
  Python/Node tooling does not become a Core runtime dependency.
- **Copy/styles:** centralize fixed UI copy in `workbench/locales`; preserve user-authored
  content as data. Keep public documents bilingual. Reuse existing theme tokens,
  components and CSS ownership; check both languages/themes and narrow widths for
  affected UI when a preview is available. No blanket visual redesign during cleanup.

Language mechanisms and mature-project examples inform these choices. They do not
make every upstream convention mandatory. In particular, Reed does not inherit
Codex's Bazel infrastructure or Tauri's release/governance policy.

## TDD and test organization

TDD is a **Reed development policy**. For a behavior change: write the smallest
observable failing case, run it and confirm the expected assertion fails, implement
the minimal change, then refactor under green. A missing tool/dependency, syntax
failure or blocked environment is not RED. Do not weaken existing assertions merely
to pass, mirror the implementation, invent empty suites or equate test count with coverage.
Pure refactors require a green baseline; documentation/format-only changes use
structural checks and existing relevant tests rather than artificial RED.

| Language / layer | Reed organization |
| --- | --- |
| Rust private unit tests | Default to separate `foo_tests.rs` module files; the implementation contains only a `#[cfg(test)]` / `#[path]` child-module declaration, keeping private access without embedding test bodies |
| Rust public API integration | The owning crate's `tests/`; common helpers in submodules; do not expose private production API just to move a test |
| TS/React/Vitest | Existing module-local `tests/**/*.test.ts(x)`; no tests embedded in product implementation files |
| Node mock rule tests | `packages/ui/tests/mocks/*.test.mjs`, separate from `src/mock` |
| Python engineering gates | Root `tests/test_*.py`, discovered by unittest; product tests remain with their product owner |

A physical file, Rust module and independent Cargo/npm package are different
boundaries. Reed chooses separate unit-test bodies as its default; do not add
inline test bodies to product implementation files. Keep the Rust test module
conditionally compiled rather than making private functions public. Do not create
a test workspace or empty test directory for every component. The reference
comparison records both upstream Rust layouts; Reed's choice is a project policy,
not a claim that the alternative is invalid Rust. A deliberate exception needs a
recorded rationale under the rules-change policy below.

For example, `src/feature.rs` loads `src/feature_tests.rs` with:

```rust
#[cfg(test)]
#[path = "feature_tests.rs"]
mod tests;
```

Test fixtures, assertion snapshots and test helpers belong to the test layer;
preview sample data belongs to the explicit mock adapter. Test dependencies
stay development-only. Build configuration excludes test artifacts; excluding files
in tsconfig alone is not an import firewall. Use synthetic data and deterministic
assertions, and release only the test-owned ports, processes and temporary directories.

## Verification and delivery

Run the smallest relevant test during implementation, then the affected integration
checks on the final files. Use this matrix with the commands in the development guide:

| Change | Validation |
| --- | --- |
| Docs, instructions, skill | Markdown, relative links, bilingual facts and instruction consistency; validate skill metadata |
| Boundary/tool behavior | A meaningful rejected fixture and allowed fixtures, Python tests, actual repository boundary check |
| Shared UI/client or shell frontend | Relevant tests/typecheck, `npm run check`, and both affected Web/Desktop frontend builds |
| Core/protocol/runtime | Relevant Cargo tests plus fmt/Clippy; protocol changes regenerate TS and check drift |
| Native desktop adapter | Separate native Cargo tests/build and appropriate OS verification; frontend build alone does not cover this |
| Real persistence/host/connector/resource behavior | Explicit authorized runtime/failure scenarios; mocks and diagnostics cannot prove these |

On the currently installed Node 22.16 environment, commands that execute the mock
tests' TS imports need `NODE_OPTIONS=--experimental-strip-types`; for example
`NODE_OPTIONS=--experimental-strip-types npm run check`. Verify the actual tool
version first; do not upgrade global tools or rewrite locks to make a check appear green.

Review producer/consumer interfaces, optional task flows, stale/concurrent changes,
resource cleanup and failure feedback. Before handoff inspect the complete diff and
untracked files, record commands/results and name any unverified boundary. Report
what changed, why, remaining risks and the next permitted operation. Browser tests,
native runs, persistence and real-host acceptance are separate evidence levels.

The boundary checker uses the pinned TypeScript parser for frontend syntax and
requires the installed Node/npm toolchain for that part. It checks declared
dependencies and supported literal local imports; it is not full build resolution,
type checking, a security sandbox or proof of business ownership. Computed specifiers,
custom build aliases and third-party dependency graphs still need review.
JSDoc type metadata in migrated JS/JSX is not traversed by the current import scan;
its ownership constraints still apply in review.
A local pass is not evidence of a remote CI run or branch-protection rule.

## Task handoff

Give another Agent a concrete assignment using this compact template:

```text
Read AGENTS.md, docs/engineering/standards.md and the owning BOUNDARY.md first.
Goal / expected user-visible behavior:
Owned modules / permitted changes:
Required constraints / failure cases:
Expected tests / evidence:
Existing changes to preserve:
Authorized Git / external operations, if any:
```

Maintain the owning current document when a rule changes. Record the rationale and
scope of a deliberate exception; do not create a competing dated rulebook or copy
the full rules into every task, skill or host configuration.
