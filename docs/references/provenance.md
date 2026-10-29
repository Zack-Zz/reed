# Design provenance and migration

[English](provenance.md) | [简体中文](provenance.zh-CN.md)

This is the foundation of the independent Reed product repository. It does not
move, delete or rewrite the previous prototype or historical design records.
The current repository's README, architecture and ADR describe its present
foundation; old runtime assumptions do not override them.

## Previous design inputs

The files below remain in the sibling **ai-code** repository. Paths are source
references, not checkout dependencies or claims that they are published remotely.
They were read as local, partly untracked design inputs on 2026-10-29; ai-code HEAD
was `55b2d195bb8bb0639fe3ed98783d4019b7256b0c`, which does not itself contain all
these files. Content hashes identify the local inputs, not release verification.

| Path relative to ai-code | SHA-256 at inspection |
| --- | --- |
| `docs/design/2026-10-27-workflow-workbench-architecture-and-plan.md` | `ae2f18e0bc99417de51ec12773de23671ce8690cf004731a5be48a52940e8785` |
| `docs/design/2026-10-27-workflow-workbench-product-research.md` | `aaa431770699772d5e46807a651e7af6cfa485502639a74c7c2327a8878660b6` |
| `plugins/reed/docs/design/2026-10-28-reed-business-domain-model.md` | `38a46663b4e32313c8edc02bdae9c57b42f6a1fcb1de0c7bb3d48b0e66abaf74` |
| `plugins/reed/docs/design/2026-10-28-reed-business-operation-flows.md` | `19329d5edfe39fc7d06cf361de81f86c979ae05678b2977c7d9252f1b60a3e7a` |
| `plugins/reed/docs/design/2026-10-28-reed-interaction-design.md` | `c944a9524501d345eef5085248ec7da21af297f83c63082ea44c8a8145d39a4a` |
| `plugins/reed/prototype/README.md` | `b246f14e7a846e3e9ca2f2413487967e648f2b015221ab7abdbf17f429a8c24c` |
| `docs/design/2026-10-29-reed-orca-mechanisms-reference.md` | `64bb012b9c24ea3205c6209f292c207eaa4c0c47de7351a1676e7905267af9aa` |
| `docs/design/2026-10-29-reed-codex-architecture-reference.md` | `97c8aecb6290ef2913cb7f96a0caaf77ef0491d4f347ff359697b0e712486bc7` |

The earlier architecture still describes a bundled Node/TypeScript Core and a
not-yet-created product repository. Those assumptions are superseded here by
this actual Reed repository and the confirmed independent Rust Core ADR. The old
file is preserved as prior design, not presented as the current setup guide.
The detailed domain/operation specifications now live in product/. The original
files remain source history; prototype application code still awaits migration.

## Keep these product decisions

Reed has no Chinese product name. Its subtitle is **Many agents. One flow.**
Keep the confirmed balanced woven R as the plugin icon and R+eed as the page
wordmark. Preserve the restrained light interface, system/light/dark support,
English/Chinese settings in the lower-left, compact controls, personal board,
and right-side details drawer that keeps the board context.

Retain the independent task lifecycle, versioned evidence/acceptance, session and
branch/workspace relationships, multi-connector provenance, sync conflicts and
workspace handoff requirements. A pretty mock interaction does not establish a
production state machine or a working provider connection.

## Migration sequence

1. Inventory design documents, selected brand assets, prototype source and licenses;
   record their actual content hashes. Do not import caches, dependencies or secrets.
2. Reconcile the business model/operation flows with current architecture; keep
   history dated and relocate links without rewriting old verification claims.
3. Extract host-neutral React components/styles into `packages/ui` and application
   composition into `apps/web`; preserve visual decisions and explicitly label mocks.
4. Replace browser business state with `packages/client` and the Core contract in
   verified vertical slices. Theme/language and harmless view preferences may stay
   local to a shell; tasks/evidence/sync facts do not become per-window storage.
5. Put Tauri-only code in `apps/desktop`; leave native host adapters and marketplace
   resources in ai-code. Build fixed shared artifacts before defining plugin inputs.
6. Verify local workflows, actual storage, provider writes and each real host
   separately. Do not claim that prototype browser localStorage migrated to SQLite
   until an explicit, versioned import/export path exists and has been tested.

The domain model and operation-flow design have now been migrated and relinked;
interaction constraints and Orca mechanisms are consolidated by subject. Prototype
application code remains in ai-code. The previously approved plugin icon is copied
byte-for-byte as Tauri’s compile-time icon; no brand asset was redrawn or simulated
configuration read as real credentials.
The existing MIT license and its copyright line are preserved.

## Agent Bridge boundary evidence

The ai-mcp working tree was inspected at HEAD
`5167145a04620be91353a3933276bcd949017619`. The existing Bridge declares Node
≥22.16 and provides a CLI/JSON control route. This does not make the Rust Core
Node-dependent unless that optional execution adapter is enabled.
Its private IPC signs JavaScript serialization bytes, and runtime shutdown can
cancel owned tasks. Native cross-language control needs an explicit public
contract and tests; client disconnect must not be implemented as runtime shutdown.
This inspection is source evidence, not an integration or performance result.

## Independent-review consolidation

On 2026-10-29 the user accepted the review conclusions for this repository's current docs.
The ai-code historical inputs stay unchanged. The [combined decision matrix](mechanism-adoption.md)
records adopt/adapt/verify/defer/reject outcomes without copying the references wholesale.
Protocol/client, runtime/storage, relationships and sync remain topic authorities;
M1–M8, RF and RSC unify delivery/acceptance. Existing receipt/lease rules are refinements, not new systems.
This round edits documentation only; foundation test/GUI records retain their original date and
scope and were neither rerun nor promoted to business acceptance.

The subsequent whole-design review refines M3/M4/M5 dependencies, paused exact replies,
stage-acceptance sync basis, native control routing, post-restore old requests, stale observations
and RF subcase ownership in their topic specs. Rust/SQLite authority, two-step installation and
four-host goals stay intact; source hashes and foundation verification remain historical records.

## Optional cloud-replication design input

On 2026-10-29 the user confirmed personal multi-device sharing first and teams later, requesting
design changes only. The new [replication topic](../architecture/replication.md)/ADR-0002 extend
the user's product goals, not automatic Orca/Codex adoption.
Local M1–M8 reserve identity/device/change-capture boundaries; C1–C3 and RF27–34 remain future
cloud work. No server/deployment/account or replication code exists as a result of this change;
historical source hashes and foundation results stay intact.
