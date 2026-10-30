# Frontend development

[English](frontend.md) | [简体中文](frontend.zh-CN.md)

The product UI now has one implementation in `packages/ui/src/workbench`.
Web and Tauri compose it from their normal `src/main.tsx` entries. There is no
separate `demo-ui` package or copied desktop page. Future UI and interaction work
belongs here, not in the historical ai-code prototype.

## Ownership

| Path | Responsibility |
| --- | --- |
| `packages/ui/src/workbench/App.jsx` | Navigation and transient presentation state |
| `packages/ui/src/workbench/pages/` | Task list, task detail and session/branch views |
| `packages/ui/src/workbench/` | Shared components, internationalization, styles and typed composition |
| `packages/ui/src/mock/` | Preview fixtures, simulated rules, connector scenarios and storage adapter |
| `packages/ui/public/assets/` | Approved brand/provider artwork, shared by both shells |
| `apps/web/src/main.tsx` and `apps/desktop/src/main.tsx` | Explicitly compose WorkbenchRoot with a mock runtime |
| `apps/*/src/diagnostics.tsx` | Preserved FoundationApp diagnostic composition |

`@reed/ui` exports WorkbenchRoot, FoundationApp and internal frontend port types.
`@reed/ui/mock` is a separate opt-in entry; the main UI barrel does not export it.
Workbench pages consume an injected runtime and cannot statically import mock rules.
The Rust Core, protocol and generated client contracts remain unchanged.

> The 2026-10-30 target uses task types, five lifecycle states and optional workflows; see
> the [domain model](../product/domain-model.md) and [interaction baseline](../product/interaction.md).
> The shared frontend now implements these local mock interactions. Workflow steps appear only after an explicit template choice; custom templates can have different step counts.
> Core business behavior and real host/provider integrations remain unimplemented.

## Current mock mode

The official frontend source currently uses a mock adapter while product flows
are being defined. No real Agent, Git, CLI, credentials or provider writes are enabled.
Simulation labels remain visible in the relevant flows and About Reed.
The adapter retains the `reed-demo-v2` key, `reed-locale` and `reed-theme`. New saves use envelope version 3 and can read version 2.
Legacy step completion is not converted into task acceptance: content and original state history remain; old completed/archived records without task-level completion evidence return to Processing with a review notice.
Missing or unreadable drafts fall back to the existing samples; failed writes keep
in-memory state and report save failure. Browser and Tauri stores remain separate.

The Demo Tauri build flavor retains `dev.reed.desktop.demo` and its local origin;
rebuilding it does not reset existing preview data. It now loads the same frontend
as the normal Desktop build. This is not shared Core storage or a production sync
implementation.

The synchronous snapshot/operation seam in `workbench/ports.ts` is an internal
migration interface. It is not a stable domain model, generated wire contract or
a promise that a future asynchronous Core adapter can be plugged in unchanged.
Confirm user interactions first, then refine the business model and Core contract.

## Build and check

```sh
npm ci
npm run build:ui
npm run dev:web                 # http://127.0.0.1:1420/
npm run dev:desktop:demo        # Same UI, preserved preview application identity
npm run build:web
npm run build:desktop:demo:ui
npm test -w @reed/ui
npm run check
```

The existing health page remains at `/diagnostics.html` in Web and Desktop frontend
outputs. The Web dev proxy and native health transport retain their previous behavior.
The default workbench does not start or call Core.

The UI package uses a Vite ESM library build with separate `index` and `mock` entries,
then TypeScript declaration emission. This resolves legacy JSX imports into actual
ESM output rather than publishing dangling `.jsx` references. Node artifact checks
validate both entries without browser globals; app builds share the same source.

## Language and code quality

New composition, context, preferences and storage interfaces use strict TypeScript.
Migrated JS/JSX is kept to preserve behavior and formatted into readable page modules.
It is explicitly built with `allowJs: true` and `checkJs: false`; emitted declarations
are not proof that those legacy components are fully type-safe. New modules should
use TS/TSX and tighten view types as the interaction model settles.

Fixed text stays in `workbench/locales`; task titles, documents, IDs and source names
remain data. Counts use complete localized singular/plural groups. The list retains
full status text, hides secondary columns progressively, and stacks state beneath
the title on small screens. Font size, palette and approved artwork stay unchanged.

Use `npm run format:frontend` and `npm run check:frontend-format` for migrated source.
Tests cover the original simulated rules, adapter storage failures, SSR composition,
locale behavior and dependency boundaries. Browser/native verification remains separate
from these automated checks and from actual Core/provider acceptance.

Desktop-only exports are injected through `WorkbenchFileExport`; native SDK imports
remain in `apps/desktop`. The shared workbench has no native SDK dependency, and the
export port is a UI capability rather than a Core business contract. Browser mode
uses its original download behavior. The local native command accepts no target path.

Document downloads convert display titles to safe Markdown filenames in the shared UI;
stored titles and versions remain unchanged. Temporary form/reply drafts are presentation
state and remain usable if browser storage is denied or cached form data is unusable.
They are not business storage.

Preview restoration checks the current renderable structure inside the mock adapter only;
incomplete snapshots fall back to samples. This does not validate production Core data.

## Creating and starting local tasks

Only the title is required. Project may remain unassigned; repository and references
are grouped under Linked context and can be supplied later. Description remains
background context, without creating phase outputs or acceptance. New tasks stay
in To do. Start working moves them to Processing; users then work manually
or separately prepare an Agent execution. Creation from the board opens the task drawer
and preserves board context, prefilling a selected project filter.

Edit task details can add project, repository, description and references later.
Unsubmitted creation drafts are retained; reopening a cancelled edit uses the latest
saved task to avoid restoring stale titles. References save simulated names and file
paths/HTTP(S) URLs only, without reading files or scanning repositories. A first repository
can be linked after repository-free requirement/design sessions end; replacing an existing
repository and moving active/unknown execution or workspaces remain guarded.
Preparing a development workspace requires a linked repository.

These actions remain mock rules, not Rust Core business behavior, real file integration
or a production contract. Regressions cover title-only creation, no implicit execution,
optional context, all task types sharing the same lifecycle, repository protection, old caches and bilingual rendering.
Generic detail supports optional workflows, scope and criteria, versioned artifacts, task review submission/withdrawal/acceptance, archive restoration, explicit reopening with a reason, and read-only review history.
Internal step acceptance does not complete a task. Failed execution exposes an explicit retry; artifact revisions retain true outcomes and require explicit necessary-work coverage.
Browser interactions and real-host acceptance are reported separately from those tests.

Current UI-only evidence is recorded in [Task-flow frontend verification](task-flow-ui-verification.md) (internal Chinese record).

## Task relationship preview

The shared workbench includes a left-to-right task breakdown view, relationship forms and the existing task drawer.
Layout and temporary view types live in `workbench`; relationship and required-result rules live in `mock`.
Older version 3 drafts without `relations` receive an empty collection. Existing tasks are not relinked automatically.
The example family is added only when explicitly requested. See [relationship preview verification](task-relations-ui-verification.md) for the internal review and browser evidence.

Relationship review pins exact required completion identities, distinguishes reference
from required prerequisites, and retains a viewport for each starting task during
navigation. Same-scope artifact corrections retract affected acceptance evidence;
new-scope work preserves the earlier fulfillment. Artifacts with the same name in
different workflow steps remain separate review inputs. These are mock adapter and
presentation rules; they do not establish a Core protocol or real execution behavior.

## Local task and workflow configuration

Settings → Tasks and workflows opens the shared configuration page. Task types support
custom names, icons, ordering, recommendations and disabling. Templates support drafts,
step editing, version previews, copying and enabling or disabling. New tasks explicitly
select a published version, while adopted tasks retain their snapshot after later changes.

Changing a task workflow previews its impact and requires a reason. Unfinished required
work remains in task acceptance criteria; reviewed reusable versions become task material.
Step acceptance is independent of task completion. Optional work needs completion or a
reasoned skip. Agent artifact coverage is explicitly confirmed without changing provenance.
Artifact identity includes its workflow context; historical material is retained.

`src/mock/configuration.ts` owns mock configuration rules, while the typed UI seam and
pages remain in `src/workbench`. TypeScript source imports support the existing Node mock
tests; independent builds still expose ordinary ESM. Configuration and tasks remain browser
mock drafts, without Core storage, real Agent dispatch or cross-shell synchronization.
See the [configuration verification record](workflow-configuration-ui-verification.md)
(internal Chinese) for this iteration's tests, browser evidence and limits.
