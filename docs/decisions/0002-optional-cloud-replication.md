# ADR-0002: Optional personal multi-device replication, future team spaces

[English](0002-optional-cloud-replication.md) | [简体中文](0002-optional-cloud-replication.zh-CN.md)

Date: 2026-10-29. Status: **accepted design reservation; not implemented**.
The user selected personal multi-device sharing first and teams later. This round edits docs only;
it creates no server project and runs no cloud synchronization.

## Decision

- Keep local-first Rust Core. Local tasks need no account/cloud connection.
  UI/host adapters use their device's Core; one writer per local profile remains.
- In the cloud phase, add services/reed-server in this repository with its own Rust workspace,
  lockfile, build, storage, deployment and upgrades. Local packages carry no cloud dependencies.
  Reserve pure domain rules, versioned replication DTOs and the runtime adapter within existing crates.
- Separate space/device/replica identity from profile. Replicate allowlisted business data and
  selected attachments, with shared acceptance versions distinct from local revisions.
  Never replicate SQLite/WAL, credentials, control capabilities or consumable operation queues.
- Preserve historical decisions separately from current applicability. Keep offline changes;
  resolve conflicts explicitly rather than timestamp-merging acceptance.
  Receiving a replica does not replay Agent, acceptance or Yunxiao commands.
- Explicitly assign native execution devices and per-canonical-object provider write devices.
  Unresolved effects block automatic handoff; lease expiry grants no takeover.
- Deliver C1 data replication; new shared native dispatch/provider writes, manual or rule-driven,
  wait for C2 acceptance. Existing-run reconciliation/stop and unshared tasks are exceptions.
  Add team membership/policy in C3.
  Local M1–M8 reserve boundaries only; P8 reverse integration is independent.

## Tradeoffs and non-goals

One repository reuses pure rules/contracts while separate workspaces isolate cloud dependencies.
Costs include different storage adapters, protocol compatibility, identity/conflicts and device recovery.
Personal replication promises neither real-time cross-device consistency nor external exactly-once.
New coordinated actions wait for valid shared basis/occupancy; local saves and accepted runs continue.
Do not prebuild CRDTs, full event sourcing, generic scheduling or a team permission platform.

The [replication specification](../architecture/replication.md) (Chinese) owns detailed boundaries;
the [plan](../engineering/implementation-plan.md) and [RF catalog](../engineering/failure-acceptance.md)
own phases/acceptance. This ADR changes no current three-crate or historical foundation evidence.
