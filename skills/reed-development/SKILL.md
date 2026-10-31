---
name: reed-development
description: Develop or review changes in the Reed repository using its module boundaries, language conventions, TDD workflow and scoped verification. Applies to Reed project work, not general coding tasks or host plugin installation.
---

# Reed development

Use this repository-local entry when handing Reed work to a Code Agent. It can be
read explicitly; placing it here does not prove automatic discovery by any host.
Claude Code has a thin [project entry](../../.claude/skills/reed-development/SKILL.md);
see the [setup and loading checks](../../docs/engineering/claude-code.md).

1. Establish the actual repository root, branch, HEAD and existing changes. Identify
   whether the user requested analysis, implementation or a Git/release operation.
2. Read [AGENTS.md](../../AGENTS.md), the owning module's `BOUNDARY.md`, and
   [development standards](../../docs/engineering/standards.md).
   For UI work also read [frontend development](../../docs/engineering/frontend.md).
   Follow the user-authorized scope; preserve unrelated changes.
3. Locate the implementation, consumers and existing tests. State the expected
   behavior, module owner and relevant checks. Resolve routine details within the
   assignment; raise an unresolved product or boundary decision before dependent work.
4. For behavior changes, run a meaningful failing test, implement the smallest
   change and refactor under green. For pure refactors establish the existing green
   baseline. For documentation/configuration use structural validation instead of
   artificial application tests. Follow the language-specific test organization;
   Rust unit-test bodies default to separate `*_tests.rs` files loaded through a
   test-only child module; public API integration tests stay in the crate's `tests/`.
   Do not mechanically impose one directory convention on all languages.
5. Review the final producer/consumer interfaces, failure paths, UI copy and data
   boundaries. Run the applicable checks from the standards and development guide.
   Keep source review, compile, tests, browser checks and real integrations distinct.
6. Deliver what changed, the actual verification and remaining limits. Report an
   unavailable tool or dependency as such. Do not claim a prior run verifies changed
   code. Git writes, installation and external actions require applicable session
   authorization; this skill supplies none.

Use the standards' handoff template for a new assignment. Keep detailed rules in
their owning documents rather than copying them into task files or this skill.
