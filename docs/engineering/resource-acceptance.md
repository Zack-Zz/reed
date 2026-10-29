# Resource and responsiveness acceptance

[English](resource-acceptance.md) | [简体中文](resource-acceptance.zh-CN.md)

Status: **unmeasured design budgets**, carried forward on 2026-10-29. Rust/Tauri
selection is not a pass. First reference: Mac mini M4, 24 GiB; record the actual OS,
architecture, power state, build and component versions. Other platforms need
their own verified reference machine/results. Budget changes require review.

## Measurement contract

Use release builds without a dev server, DevTools or hot reload. Freeze a hashed
fixture with 10,000 tasks, 100,000 stage/sync events, 20,000 artifact indexes and
1 GiB of segmented history logs, including body sizes, paging, leases, poll
interval and visible views. Startup must not load all history.

CPU is process-group CPU time divided by elapsed time, with one logical core at
100%. Sample CPU each second. For static cases warm for 60 seconds, then measure
at least 5 minutes; sample footprint every 10 seconds, at least 30 samples.
Report sampling overhead and sampled peaks, not invented continuous peaks.

Use deduplicated process-group footprint on macOS, not a sum of RSS values.
Attribute Core, adapters, host UI, Desktop and associated WebView/XPC/GPU/network
processes. Compare paired enabled/disabled or open/closed runs with identical
fixtures. Report real CLI/Agent resources and full-group totals even when a gate
isolates Reed's control layer. Unattributable costs cannot be reported as zero.

## Budgets

| Gate | Scenario | Target |
| --- | --- | --- |
| RSC01 | Core-only idle, no Agent/CLI; harness lease | Core footprint P95 ≤150 MiB; mean CPU ≤0.5%; 1-second CPU P95 ≤2%; no Desktop/WebView |
| RSC02 | One enabled host, panel closed | Adapter/host delta ≤40 MiB and mean CPU delta ≤0.2 percentage points; Core still RSC01 |
| RSC03 | Four enabled hosts, panels closed | Aggregate paired footprint delta ≤120 MiB; Core+adapters mean CPU ≤1%; one writer |
| RSC04 | Static Desktop, Core already running | Desktop+associated WebView delta ≤200 MiB; mean CPU delta ≤0.5 percentage points |
| RSC05 | Quit Desktop while hosts stay connected | Desktop processes/subscriptions gone within 5 seconds; after 60 seconds settling and 5 minutes sampling, Core+adapters P95 ≤pre-Desktop baseline+20 MiB; execution continues |
| RSC06 | Synthetic sync: 1,000 external items, 1 KiB changes, total 20 changes/s for 10 minutes | Core P95 ≤250 MiB, mean CPU ≤20%; committed update to every active view P95 ≤250 ms; real network/CLI separate |
| RSC07 | Future one/four isolated executor streams, total 20 events/s | Core+actual Bridge/control-runtime combined P95 ≤250 MiB; projection P95 ≤250 ms; real Agent/tools and full totals separate |
| RSC08 | 1 GiB history and 1 KiB events at total 20/s; long-mounted log views | Per-page Core read overhead ≤32 MiB; each measured collection and full group final-30-minute growth ≤15 MiB; after 5-minute cooldown ≤equivalent final-data/view baseline+30 MiB |
| RSC09 | Explicit background sync, one unchanged source, 60-second poll, 30 minutes | Core P95 ≤150 MiB, mean CPU ≤0.5%; report CLI peaks/totals/call counts; more clients do not multiply polling |
| RSC10 | Static task UI in one/four hosts; separate open/close cycles | UI P95 delta ≤200/600 MiB and mean CPU delta ≤0.5/2 percentage points; final closed four-host delta ≤panel-closed baseline+40 MiB |

RSC03 is a paired four-host aggregate, not the sum of four single-host deltas.
RSC10 UI cost is measured above the already-enabled, panel-closed baseline;
adapter costs still satisfy RSC02/03. Tray mode is separate. RSC06/07 synthetic
flows do not prove real provider throughput or four real concurrent agents.

## Long logs and view release

Run RSC08 independently for the four-host UI group and the Tauri group:

- A1: tail continuously in one mounted log container for 60 minutes; no history
  paging, task changes, closing or remounting.
- A2: same task/container, tail and read the next fixed 256 KiB history page every
  5 seconds for 60 minutes; hard maximum page size 1 MiB. No closing/remounting.
- B: a separate collection test with 20 cycles of 30 seconds open/30 seconds closed,
  switching between two fixed tasks. After final close settle 60 seconds and
  measure 5 minutes; P95 ≤same-fixture closed-view baseline+30 MiB.

A1/A2 growth is each collection's P95 at minutes 55–60 minus minutes 25–30.
Cooldown keeps the same static log view; compare with a prewarmed instance using
an equivalent final dataset and visible range. B cannot offset A1/A2 leaks, and
periodically rebuilding the container cannot substitute for continuous mounting.
Core/adapter/UI/Desktop/whole-group budgets apply separately. Core P95 still
≤250 MiB; adapter caps remain 40/120 MiB, host UI 200/600 MiB, Desktop 200 MiB.
Report CPU against the RSC06 control-load budget as well. Large stable caches
cannot pass solely because growth is small.

For RSC10 first keep static views open after 60 seconds warming for 5 minutes of
sampling; separately run each host's 20 open/close cycles. After final close,
settle 60 seconds and sample 5 minutes. Do not average closed periods into open
view CPU. Capture subscriptions and task cache release, not only window count.

## Startup and readiness

Run at least 30 starts and report P50/P95/max. Under the normal fixture without
unresolved work, new Core process to authenticated, recovered, schema-checked
legal task read/write readiness: P95 ≤2 seconds. A listening socket alone is not
ready. Desktop to usable list/detail: P95 ≤2 seconds with Core ready, ≤3 seconds
including a cold Core start. A splash screen is not interactive readiness.

Recovery starts are separate: diagnostics visible within 10 seconds, writes
remain blocked until safe recovery even if the budget is missed. Separate new
process/cache-warm starts from machine-reboot/cache-cold starts. Core page-query
response P95 ≤100 ms. Trace view update latency end to end, not just server send.
Default idle exit: after all client leases end and no owned work, background sync
or other residence reason remains, wait 60 seconds, then exit within 5 seconds.
Explicit stop and maintenance must prevent immediate automatic relaunch.

No RSC measurements, benchmark harness, business/capacity target binaries or host acceptance are
included. Existing diagnostic binaries are not the resource-test product. Build the harness in the corresponding phase;
record raw samples separately from the public summary.

## Functional acceptance and language choices

This consolidation changes no RSC01–RSC10 numbers. RF06/22 reuse these resource scenarios for
reclamation and replay/control-response correctness, without another budget set.
Record single-record limits, total queue bytes and in-flight requests/producer tasks;
a stable queue length cannot hide unlimited waiting tasks.
RSC01/03 may use an explicit measured harness lease; ordinary plugin heartbeats must not
prevent production idle exit.

Measure the current Rust release first. Investigate actual hotspots before blaming language or
relaxing budgets. If reopening Rust/TS, compare equal business functions, storage/durability,
CLI/IPC, fixtures/fault semantics, OS/architecture and release builds. Include TS runtime
requirements and Rust system libraries/helper processes. Compare startup, footprint/CPU,
bounded logs/rebuilds, install/upgrade and maintenance cost, not Rust diagnostics against a
complete TS product. Do not maintain two production Cores for a comparison.
Unmeasured real CLI/Agent/host costs remain unknown; synthetic passes are not real group acceptance.

Stage applicability is defined in the [plan](implementation-plan.md): M3 foundation probes are
preliminary; RSC01's business fixture/legal writes start at M4, while complete four-host/Tauri
RSC08/10 close in M8. No threshold is added/relaxed and an unimplemented fixture is not a pass.

## Relative regression review after freezing a baseline

Retain the original plan's regression policy for equal frozen fixtures/configuration/platform:
review footprint increases above max(10% of baseline, 20 MiB), P95 latency increases above
max(15% of baseline, 100 ms), or idle CPU increases above 0.2 percentage points.
Absolute RSC budgets still apply. Keep outliers and failures rather than choosing the best run;
fixture changes do not count as equal-baseline comparisons. These restore existing requirements,
not new performance results or relaxed limits.

## Later optional-replication measurement

Keep every local M1–M8 RSC threshold with replication disabled, without cloud connections/accounts
or another resident service. C1/C2 first freeze device count, changes/attachment sizes, offline
backlog, conflicts, transport/checkpoint loads, then define enabled local CPU/memory/network/
reclamation and server cost/latency budgets. These unmeasured capabilities inherit no Core-only,
synthetic-provider or single-device UI pass. Turning replication off preserves unsent data/
unresolved effects; background replication requires an explicit residence reason.
See [replication](../architecture/replication.md).
