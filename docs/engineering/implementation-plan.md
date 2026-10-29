# Implementation sequence and acceptance

[English](implementation-plan.md) | [简体中文](implementation-plan.zh-CN.md)

Status: current consolidated plan after independent review, 2026-10-29. Rust Core is the baseline,
with no parallel TS backend. F0 already includes three crates, React/client/UI, optional Tauri
diagnostics and migrated product designs. [Foundation verification](foundation-verification.md)
records historical results; this documentation change did not rerun them.
Business, SQLite, authentication/runtime management, real hosts and Yunxiao have not passed
target acceptance. This round edits docs only; the sequence grants no coding, install, external
write or publication authority.

## Eight dependency-ordered MVP increments

This is the single route consolidating P0–P7. Old IDs are traceability aliases,
not a parallel CP/RFP schedule. Refinements reuse existing objects and mechanisms.

| Increment / old phase | Scope | Dependencies and exit evidence | Cost of omission |
| --- | --- | --- | --- |
| M1 Boundaries/contracts refinement / P1 | Keep three Rust crates/separate Tauri workspace; application ports/wire DTOs, generation/validation/compatibility, stable object/dataset/device scopes and replicable-data classification; authoritative product specs | Foundation; RF21 dependency counterexamples, drift and fixed version combinations; diagnostic generation is not business completion | Obsolete TS plans and duplicated host rules |
| M2 Feasibility first / P0 | Each native surface/identity/submission/feedback/cwd; Core-only GUI bootstrap/credentials/OS lock; per-operation Yunxiao CLI probes; frozen RSC fixture | M1 minimum contract; versioned host/OS/arch/plugin/CLI positive and denial evidence; retain unknowns | Late discovery of unavailable UI, authority or provider guarantees |
| M3 Standalone lifecycle refinement / P2/P7 | User-level discovery/start, profile writer lock, admission/drain, activities/leases, explicit stop, SQLite/migration persistence and credentials; data separated from device auth, isolated seven-step upgrade probes | M1/relevant M2 platform; foundation subcases of RF01–05/09/25; durable probe/restart/migration, not business-ready or capacity RSC acceptance | Competing backends, automatic resurrection, unsafe upgrades or Desktop-only recovery |
| M4 Local workflow/durable operations refinement / P2 | Manual requirements–design–development–verification without a connector; task/scope/template/stage/attempt/acceptance/completion; business tables on the foundation, evidence/receipts/event/outbox; minimum manual session/repo/branch references/read-only snapshots; transactional change-capture hook and device provenance, no cloud worker | M1/M3; RF07–09/13/20/24 and W walkthroughs; a real use case across revision/occupancy/receipt recovery; business-ready/RSC01/startup acceptance begins here | Duplicate effects, conflated states and UI-dependent recovery |
| M5 Shared interaction/consistent data / P1/P6 | Review/migrate style/assets to UI/Web; lists/personal board/right drawer/task–branch views; snapshot watermark/replay, bounded client/logs, system theme and EN/ZH settings | M1/M4; RF06/11/13/21/22; available-UI boundedness/resource probes, with four-host/Tauri RSC08/10 in M8; preserve visual/context goals | Lost updates, unbounded buffers or UI bypass |
| M6 Native execution/workspace/document refinement / P4/P5 | DSH then ZCode; separate preparation/submission/acceptance/result/workflow acceptance; trusted sessions, exact worktree/cwd, versioned docs, multi-repo relations and owned cleanup | Relevant M2 host, M3–M5; DSH/ZCode subcases of RF08–13/23; real IDs/results, wrong-cwd denial; no external substitute for native sessions | Links become grants, preparation becomes execution, overlaps or lost user work |
| M7 Yunxiao sync refinement / P3 | Official CLI, multiple source connections, configuration/discovery drafts, identity/mapping, canonical-object outbox, B/R/D and unknown/risk recovery | M2 operation capabilities, M4/M5; RF14–20; separately authorized test-account write/readback evidence; RSC06/09 | Duplicate effects, connector bypass and equality mistaken for request confirmation |
| M8 Integrated delivery/acceptance / P6/P7 | Complete verified Claude/Codex paths and optional Tauri; fixed cross-repository artifacts/markets; four-host/multi-shell/upgrade/resource integration | Required four-host M2 capabilities, M3–M7; applicable RF01–26 and RSC01–06/08–10; support/provenance/evidence | Packages, mocks or one host replacing four-host proof; hidden resource costs |

M2 can use clearly labeled diagnostic/mock probes to establish entry points, not business success.
A missing required host capability blocks that host and the complete four-host claim, not unrelated
internal slices. Never silently reduce the product target. M7 can run alongside independent
host-adapter work after local contracts exist; M6/M7 converge in M8.
Run relevant checks at every increment, not only at final acceptance.

## Existing mechanisms and scope

- Operations, events, outbox, occupancy and relationships are existing designs. Snapshot fencing
  and origin-bound replies refine contracts without a message bus, generic scheduler/approval
  platform or mandatory repository per table.
- Installation remains Core-only plus selected adapters; Tauri is optional. Reed owns UI/client
  source; ai-code consumes fixed artifacts and owns adapters/markets.
  See [independent builds](development.md).
- Prototype/asset migration and contract replacement differ. Preserve selected visuals;
  browser localStorage is not declared migrated without an explicit import path.
  Product specs already moved: do not schedule that migration again.
- P8 remains later reverse integration through versioned public Bridge/SDK/CLI/ACP contracts:
  one engine before bounded concurrency; owned approvals/stop/recovery and RSC07 separately,
  outside this MVP.
- Measure the current Rust release against RSC first. Compare a packaged TS alternative only if
  reopening the language decision, with equivalent functions/fixtures/platform and maintenance
  cost; do not maintain two production Cores or infer a performance pass from Rust.

## Product acceptance retained

1. Local tasks need no Yunxiao. Stages allow manual or Agent execution; LLMs propose.
   Task/execution/acceptance/delivery/sync facts differ. Scope/template changes invalidate
   affected evidence without rewriting history.
2. The personal board supports todo/in-progress/review/done drag transitions. Review/done require
   current outputs and acceptance; denial keeps the card and explains gaps. A right drawer retains
   filters/scroll; switching task/branch views has no Git side effects.
3. Documents/sessions/repositories/branches/worktrees remain traceable to task stages. Links grant
   no control. Missing/changed evidence, lost sessions and wrong cwd stay visible;
   cleanup never removes resources owned by others.
4. External records identify their Connector/source. Configuration, detection, organization/project
   selection and mappings are operable in the UI. Mock discovery is not a real scan;
   token-only organization discovery requires verified support.
5. Local save differs from external confirmation. No CAS means no strict concurrency guarantee.
   Unknown effects are not blindly retried; changing connections preserves history;
   changed scope/completion basis revalidates unsent intent.
6. Never-installed/opened, quit or uninstalled Desktop does not break declared plugin capabilities
   or shared data. Each host passes required L0–L3 independently; external pages or separate
   Agent sessions do not replace native-host interaction.

## One acceptance/evidence route

The [RF catalog](failure-acceptance.md) consolidates T/CT aliases; [RSC](resource-acceptance.md)
alone owns resource fixtures/budgets; W01–W35 retain product-flow walkthrough identity.
Reuse captures rather than writing three mirrored suites. Record versions/artifact hashes,
fixtures, real/mock providers, steps, raw outcomes and limits.
Report source/build/tests/persistence/real-host/Yunxiao/performance evidence separately.

## Exit applicability and dependency closure

An RF reference assigns scenario groups, not every future-dependent subcase to an early stage.
Future C1–C3 are not prerequisites for local M1–M8.

| Stage | Required now | Evidence completed later |
| --- | --- | --- |
| M1/M2 | Static contracts/compatibility fixtures, minimum host/CLI probes, frozen fixtures and enablement conditions | Mocks do not pass production auth/persistence or real task/provider workflows |
| M3 | SQLite/transaction/migration foundation in the same runtime, isolated durable probes, ownership/credentials/stop/recovery; no second probe service | Use isolated fixtures over the real adapter, not production SQL/probe-write endpoints; M4 adds business schema/readiness, M6/M7 real effects, M8 integrated upgrades |
| M4 | Manual workflow, versioned evidence/minimum stable relations/read-only repo observations and receipt recovery; meaningful domain tests | M5 builds dual views on these; M6 adds trusted control bindings, automated worktrees/multi-repo handoff without blocking the manual path |
| M5–M7 | Functional/fault subcases for implemented UI/hosts/connectors, with resource probes labeled | M8 completes required four-host/Tauri combinations; owned-engine interactions remain P8 |
| M8 | Required product capabilities, version/platform matrix and RF/RSC evidence; repeatable denials | Missing required native UI/binding/execution or bidirectional writes remains a product blocker, not excluded as inapplicable |

RSC01's business fixture and legal-task readiness begin at M4. M3 probe costs cannot count as that
pass. Complete four-host/Tauri RSC08/10 in M8; earlier host evidence is partial. Successful M2
probes still require the real business path to be rechecked for the supported version.

M1 fixes the versioned HostAdapter control contract, M2 probes Core-to-trusted-plugin command/
feedback, and M6/M8 implement each host; bootstrap/cross-repository inputs are not deferred to M8.
M4 relations only reference/navigate; they grant neither native control nor isolated-workspace creation.

## Cloud reservation: local hooks and later independent phases

Personal multi-device replication comes first, teams later; see [replication](../architecture/replication.md)
(Chinese) and [ADR-0002](../decisions/0002-optional-cloud-replication.md).
The eight local MVP increments require no cloud delivery/account/network/deployment.
Reserve boundaries in existing modules, without empty service projects, network workers or a generic engine.

| Local increment | Design reservation | Implemented only in the cloud phase |
| --- | --- | --- |
| M1 | Stable object/dataset/device scopes; distinct local/shared versions and request/mutation identity; allowlist and protocol namespace | Cloud DTO/account/space implementation, generated fixtures and compatibility matrix |
| M3 | Separate data from device credentials/replica identity; backups do not copy control authority | Cloud pairing, registration, checkpoint and restore checks |
| M4 | Version/provenance and transactional change-capture hook; content identity separate from device location | Enabled allowlisted change journal/upload queue; bootstrap earlier history from a consistent snapshot, not an unlimited cloud log |
| M8 | Local builds/installations carry no cloud-service dependencies and default to no cloud/account traffic; existing RF21/26/RSC scope | Server artifacts/deployment and cloud-enabled loads are separate evidence |

The following optional route is not a ninth local increment and does not depend on completing
P8 Agent reverse integration. Schedule C1/C2/C3 independently under the relevant authorization;
separate source/mock/real-device/external-effect evidence.

| Phase | Dependencies and delivery | Exit evidence |
| --- | --- | --- |
| C1 Personal data replication | Real local M1/M3/M4 contracts/storage and selected M5 task/conflict UI; independent services/reed-server workspace/lock/storage/deployment; accounts/personal spaces/devices, metadata/selected attachments, snapshot/incremental replay/dedup/conflicts/revocation/restore | RF27–29/31–33 plus RF30 ownership/no-takeover subcases; two real devices editing offline/reconnecting, no secrets in uploads, availability states; accepted local runs continue; all new shared native dispatch/provider writes, manual or rule-driven, remain disabled; reconciliation/stop and unshared tasks are exceptions |
| C2 Controlled shared actions | C1 and the actual selected M6/M7 actions; defined ordering for shared-version acceptance, dispatch occupancy, stable intent and device ownership; explicit native/provider handoff/reconciliation | Real-effect subcases of RF29/30/31/33; no takeover on unreachable/unknown old device, no command replay, new shared effects wait without valid coordination; retain provider no-CAS limits |
| C3 Team spaces | The selected capabilities from C1/C2; SyncSpace membership/roles/visibility/audit/revocation; explicitly selected personal data | RF34 and cross-space denials/offline permissions/member revocation; shared-edit permission grants no device control; no immediate offline-cache erasure claim |

A C1 replication receipt confirms neither a provider write, an Agent run nor receipt by every device.
C2 enables only actually accepted actions; manual C1 buttons cannot bypass that gate.
Data replication does not enable every host/provider feature.
Remote SDK/executor/multi-engine work retains its separate P8 proof.
Freeze cloud identity, attachment/backup protection, deployment/recovery compatibility and enabled
resource/network fixtures before acceptance; no unmeasured performance promise is made here.
RF27–34 are future scenarios, not current M8 prerequisites alongside local RF01–26.
