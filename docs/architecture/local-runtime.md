# Local runtime, data and upgrade requirements

[English](local-runtime.md) | [简体中文](local-runtime.zh-CN.md)

Status: design requirements, not implemented. No paths or OS services below have
been created. This applies to Rust Core just as it did to the previous design.

## Two-step installation

1. Install verified user-level Core artifacts for the target OS/architecture,
   including its management/bootstrap entry and migrations. Ordinary use must not
   require globally installed Rust/Node. Desktop is optional, not the installer
   owner or source of Core's required runtime files.
2. Install the Reed adapter through each desired host's native marketplace.
   After the host's trust/enablement step, it discovers or starts the registered
   Core entry, negotiates the profile/protocol and connects. Missing Core gets an
   installation explanation, not a silent runtime install or browser launch.

Exact executable names, package identities, installers and platform support are
not published. Core code, Desktop code, plugin code and user data have separate
installation lifetimes. A thin launcher/stdio proxy may be fixed into a plugin,
but contains no database or second Core. Test its complete startup chain with
spaces/non-ASCII paths, clean GUI login and no inherited terminal PATH.
Yunxiao CLI and optional Agent engines have their own dependency/version checks;
a missing connector dependency cannot block local task use.

## Single writer and discovery

The default stable profile is shared across shells. Concurrent clients first
connect; a per-user/profile OS ownership lock allows only one service to start.
The lock spans the service lifetime, including recovery. Discovery publishes
private endpoint information, service generation, protocol capabilities and
schema facts. PID files, heartbeats or an open port are insufficient ownership.
Incompatible clients get a diagnostic, not a new database or competing service.

A separate control lock protects activation/upgrade metadata. It does not replace
the running service's writer lock. An old launcher must respect maintenance and
explicit-stop state; it cannot choose a global `latest` binary on its own.

## Storage and access boundary

| Platform | Planned profile root |
| --- | --- |
| macOS | `~/Library/Application Support/Reed/profiles/<profile-id>/` |
| Windows | `%LOCALAPPDATA%/Reed/profiles/<profile-id>/` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/Reed/profiles/<profile-id>/` |

The profile owns structured SQLite data, immutable artifact versions, segmented
logs, recovery state and backups. IPC/lock files use a private runtime directory;
OS secure storage owns connector credentials, namespaced independently of the
Desktop bundle and installed Core version. Development uses explicitly isolated
synthetic profiles, never the user's stable profile by default.

The Core alone opens the business database. Short transactions atomically persist
state revisions, durable events, idempotency receipts and sync outbox intent.
External calls happen after commit. File writes use a temporary file, validation
and atomic placement before indexing; recovery can find incomplete registrations.
Large artifacts/logs are paged without loading the whole file. Long event
subscriptions must not hold SQLite read transactions and prevent checkpoints.
Use consistent SQLite backups plus a fixed artifact manifest; copying only a live
WAL database file is not a backup strategy. Never automatically garbage-collect
unresolved evidence, user source trees or active workspaces.

The initial trust boundary is the current OS user; Reed does not claim protection
from arbitrary malicious code running as that same user. Private IPC still needs
restricted endpoints, trusted registration and profile/generation/capability
checks. A web page cannot authorize itself with a claimed host/session/cwd or a
localhost origin. Long-term credentials stay out of React, URLs, prompts, argv
and logs. A denied/locked credential store produces recovery guidance, not a
plaintext fallback or a requirement to open Desktop. SQLite/ordinary artifacts
are not claimed to be encrypted at rest.

External synchronization uploads selected fields/comments to the configured
provider. Agent engines may send supplied context to their own remote services.
Local M1–M8 deploy no cloud task database. Future optional personal replication/team boundaries
are reserved in [replication](replication.md); they are not initial runtime requirements.
Backup export/restore is explicit; on another machine, paths, session grants and
workspace ownership need reconfirmation. No automatic takeover of running work.

## Lifecycle

| Event | Required result |
| --- | --- |
| First plugin use without Desktop installed | Verified bootstrap starts Core and connects without Reed Desktop or its dedicated WebView dependencies |
| Four hosts connect together | One writer and reads deduplicated within principal/scope; cross-connector writes serialized per canonical object; only thin per-client proxies where required |
| Close a window / quit Desktop | Release that client's subscriptions and desktop processes; do not stop Core/Bridge or cancel accepted work |
| Host/client crashes | Mark observation lost; preserve tasks, evidence, pending sync and execution ownership |
| No active client leases, owned work, background sync or other explicit residence reason | Default on-demand mode waits 60 seconds, then exits within 5 seconds |
| Background sync or managed execution enabled | Retain the explicit activity reason; do not infer it from a hidden window |
| Explicitly stop background | Persist stop intent, coordinate active work, and prevent launcher/restart rules from silently undoing it |

Login start and background residence are distinct options. No unconditional
KeepAlive/restart-always policy in on-demand mode. Any crash restart is bounded,
backs off, and checks maintenance/stop intent. Cancellation request, confirmed
process stop and workflow acceptance are separate facts. Lifecycle behavior must
be verified on each supported OS; detached spawning alone is not proof.

## Independent upgrades

Immutable program artifacts are shared; each profile activates a compatible
version independently. Core, Desktop, plugin, shared UI, protocol, schema and host
versions are recorded separately. Only Core's management entry migrates data;
Tauri updater updates the shell, and plugins update only themselves.

| Step | Required durable boundary |
| --- | --- |
| Stage | Verify the new artifact and compatibility; store hash, target and old version without changing activation |
| Maintenance | Acquire control lock and persist profile maintenance; all launch/restart paths obey it |
| Drain | Stop new dispatch/writes while settling owned work; defer upgrade if a managed attempt remains unresolved; remote unknowns are not cleared or resent |
| Backup/stop | Freeze all business/event writes, flush acknowledged state/final cursor, create a consistent backup/manifest, stop old Core and release its writer lock |
| Migrate | Only the target migrator takes ownership; inspect actual schema and migration records, migrate transactionally, keep business writes disabled |
| Activate | Verify schema, recovery, projection and protocol health, atomically activate the profile version, reopen access and renegotiate generation |
| Recover | Reconcile maintenance record, actual schema and process ownership after any crash; contradictions keep writes disabled |

If schema changed or the new Core accepted writes, do not automatically restore
an old backup or start an older binary. Preserve diagnostics and use forward
repair or a separately authorized restore. Retain artifacts referenced by any
profile, process or recovery record, including Windows locked binaries.
Uninstalling Desktop or one plugin preserves Core and data. Core removal must
handle owned work and startup registration; permanent data/credential deletion
is a separate explicit operation. These are requirements, not current installer behavior.

## Detailed runtime rules

Lease issuance/expiry, admission races, local unverifiable activity and resource release
are specified in [lifecycle/resources](lifecycle-and-resources.md) (Chinese).
Authenticate and authorize receipt queries before reevaluating mutable preconditions
for new operations. Restoring an old backup preserves pre-restore records, pauses
automatic dispatch/outbox, and reconciles external effects; missing recent receipts
do not prove those effects never occurred. See [operations/recovery](operations-and-recovery.md).

## Persistence acknowledgements and bounded storage

SQLite remains authoritative for tasks, acceptance, relationships, operations, sync intent and
their transactional events. Application code uses narrow use-case transaction ports, not exposed
connections, per-table generic CRUD or downcasts. The first implementation may query current tables
directly; asynchronous search/statistics are introduced only when needed and remain rebuildable.
A failed derived index never replays an Agent invocation, provider write or acceptance decision.

A business save acknowledgement requires the chosen SQLite commit boundary to complete.
A file-backed evidence acknowledgement also requires verified content at its final location and
committed metadata; staging/index failures cannot appear as valid acceptance evidence.
Files and SQLite are not one atomic transaction: recovery handles orphaned placements, incomplete
registration and missing/changed content explicitly.

The initial required guarantee is recovery after a Core process crash. Power-loss guarantees are
a separately specified and verified durability level, not inferred from COMMIT, flush or rename.
M2/M4 must freeze SQLite journaling/synchronization, file and directory sync policy, supported
filesystems and failure behavior. If a deployment requires power-loss durability, do not claim
that level or release that deployment before its configuration and fault evidence exist.
No positive save receipt precedes its promised boundary; errors remain visible and recoverable.
An accepted operation receipt still does not confirm its eventual external effect.

Pagination bounds page count, source bytes, decoded records and output, including oversized single
records. Prepare bounded input before a short write transaction; never hold a writer while waiting
for network/file streams. Any later index rebuild uses checkpoints and the same acknowledged
authority. See [protocol/client consistency](protocol-and-clients.md) and RF24.

M3 validates SQLite/migrations/private IPC persistence in an isolated profile of the same runtime;
M4 adds business schema/legal task writes before business-ready acceptance. Do not create a
second probe service or database authority. Old-backup restore also rotates the acceptance
namespace under [operation recovery](operations-and-recovery.md#65-旧备份恢复后的缺失回执):
an already-executed but missing old request cannot become a new invocation after reconnect.
Normal restart/upgrade does not arbitrarily rotate that boundary; known old operations are reconciled.

## Optional replication and device identity

Each Core keeps exclusive access to its local SQLite; the cloud service has separate storage
ownership. Devices never share database files/locks. Profile and logical dataset/space differ;
device identity/authentication is not copied with backups or replicas. New devices register again.
Default local use creates no account and probes no cloud. Durable unsent changes do not force
residence. Cloud outage preserves local saves/accepted runs; new shared-coordination actions
follow [replication](replication.md) restrictions. Disconnecting replication neither cancels sent
effects nor clears unresolved ownership.
