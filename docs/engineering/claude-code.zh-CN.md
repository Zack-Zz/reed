# 使用 Claude Code 开发 Reed

[English](claude-code.md) | [简体中文](claude-code.zh-CN.md)

此配置用于让 Claude Code 开发 Reed 源码。Reed 运行时的 Claude Code 宿主适配是另一项集成，归 ai-code 所有。

## 共用规则与项目发现

- 根 `CLAUDE.md` 通过 `@AGENTS.md` 导入 [AGENTS.md](../../AGENTS.md)。
  普通 Markdown 链接本身不会把目标规则加载到启动上下文。
- `.claude/skills/reed-development/SKILL.md` 是 `/reed-development` 的项目发现入口，
  读取持续维护的[共享工作流](../../skills/reed-development/SKILL.md)。
- [开发规范](standards.zh-CN.md)和所属模块的 `BOUNDARY.md` 继续负责具体规则。
  修改规则时维护这些源文件，Claude 专用入口保持薄适配。

这些入口随仓库提供。本配置不需要安装全局 Skill、修改全局设置、预授工具权限、添加 hook 或 MCP 服务。

## 启动与加载检查

已安装 Claude Code 时，从仓库根目录启动：

```sh
cd /path/to/reed
claude
```

1. 如出现项目可信提示，按 Claude Code 的正常流程处理。通过 `/memory` 查看已加载的指令文件，
   确认 `CLAUDE.md` 导入了 `AGENTS.md`。
2. 在 `/` 菜单中找到 `reed-development`，确认来源是当前仓库。
   个人或受管理的同名 Skill 可能优先于项目入口。
3. 首次可以使用只读任务检查：

   ```text
   /reed-development 本轮只读。核对实际分支和已有改动，
   再说明仅修改 UI 时的模块边界和必要检查。
   不编辑文件、不安装依赖、不执行 Git 写操作。
   ```

确认回答依据当前仓库的共享工作流、规范和 UI 边界，再用[交接模板](standards.zh-CN.md#交接给另一个-agent)布置实际任务。
调用 Skill 本身不授予 Git／发布或外部操作权限。

若没有发现入口，先从仓库根重新启动，检查限制项目定制的设置或管理策略。
不要用 `/init` 生成结果覆盖现有共享规则。也可以在任务开头显式要求读取 `AGENTS.md` 和
`skills/reed-development/SKILL.md` 作为回退。

个人备注使用已忽略的 `CLAUDE.local.md`，本地权限选择使用已忽略的 `.claude/settings.local.json`。
提交前仍须检查新文件；共享指令和 Skill 入口应纳入版本控制。

## 证据与限制

本地检查使用 Claude Code **2.1.276**，仅执行了 `--version` 和 `--help`。
配置依据官方的[指令导入](https://code.claude.com/docs/en/memory#import-additional-files)和
[项目 Skill](https://code.claude.com/docs/en/skills#choose-where-skills-load)机制。
较新版本也可能直接发现 `AGENTS.md`；保留导入使本配置不依赖该能力。这不是经过实测的版本支持矩阵。

结构检查只能确认元数据和引用路径，不能证明真实 Claude Code 会话已经加载或遵循规则。
上面的会话检查仍待执行；此配置不增加 Reed 业务 API 或运行时宿主支持。
