# Developing Reed with Claude Code

[English](claude-code.md) | [简体中文](claude-code.zh-CN.md)

This setup lets Claude Code work on the Reed source repository. Reed's runtime
Claude Code host adapter remains a separate integration owned by ai-code.

## Shared rules and project discovery

- Root `CLAUDE.md` imports [AGENTS.md](../../AGENTS.md) using `@AGENTS.md`.
  A Markdown link alone does not load the referenced rules into startup context.
- `.claude/skills/reed-development/SKILL.md` is the project-discovery entry for
  `/reed-development`. It reads the maintained
  [shared workflow](../../skills/reed-development/SKILL.md).
- [Development standards](standards.md) and the owning module's `BOUNDARY.md`
  remain authoritative. Change those sources when changing a rule; keep the
  Claude-specific entry thin.

The checkout supplies these entries. No global skill installation, settings,
tool permissions, hooks or MCP servers are required by this setup.

## Start and check loading

With Claude Code already installed, start it from the repository root:

```sh
cd /path/to/reed
claude
```

1. Complete Claude Code's normal project trust flow if prompted. Use `/memory` to
   inspect the loaded instruction files and confirm `CLAUDE.md` imports `AGENTS.md`.
2. In the `/` menu, find `reed-development` and check that its source is this
   checkout. A personal or managed skill with the same name can take precedence.
3. For a first smoke check, use a read-only assignment:

   ```text
   /reed-development Read only. Identify the actual branch and current changes,
   then explain the module boundaries and required checks for a UI-only change.
   Do not edit files, install dependencies or perform Git writes.
   ```

Confirm the response uses this checkout's shared workflow, standards and UI
boundary. Then use the [handoff template](standards.md#task-handoff) for actual work.
Skill invocation does not authorize Git/release or external operations.

If the entry is missing, restart from the repository root and inspect settings or
managed policy that restrict project customization. Do not replace the shared rules
with `/init` output. As a fallback, explicitly ask Claude to read `AGENTS.md` and
`skills/reed-development/SKILL.md` before working.

Keep personal notes in ignored `CLAUDE.local.md` files and local permission choices
in ignored `.claude/settings.local.json` files. Review new files before committing;
shared instructions and the skill entry belong in version control.

## Evidence and limits

Setup inspection used local Claude Code **2.1.276** (`--version` and `--help` only).
The configuration follows the documented
[instruction imports](https://code.claude.com/docs/en/memory#import-additional-files)
and [project skills](https://code.claude.com/docs/en/skills#choose-where-skills-load).
Newer releases may also discover `AGENTS.md` directly; the import keeps this setup
independent of that feature. This is not a tested version-support matrix.

Structural checks can verify metadata and reference paths. They cannot prove a
real Claude Code session loaded or followed the instructions. The session checks
above remain to be run; this setup adds no Reed business API or host runtime support.
