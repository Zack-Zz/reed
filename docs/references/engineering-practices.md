# Codex CLI／Tauri 工程实践与 Reed 取舍

本文件是内部采纳记录，不是第二份开发规范；实际约束见[开发规范](../engineering/standards.zh-CN.md)。
记录的是源码观察，不声称执行过对标项目的测试或证明其所有模块都使用同一种方式。

## 观察基线

2026-10-31 读取公开仓库并固定观察版本：

- Codex CLI `openai/codex`，`main` 的 `67f0994b532b8740f14b5b738af7b7b2a915b1d6`。
- Tauri `tauri-apps/tauri`，`dev` 的 `31f29e197e7ac18797dbb9270fe658c1ca1010c8`。

优先看这两个成熟项目的实际源码、贡献流程和 CI；语言／框架资料用于解释机制，不代替工程观察。

## 实际做法与取舍

| 主题 | 观察证据 | Reed 采纳与边界 |
| --- | --- | --- |
| Rust 单测外置 | Codex [ansi-escape/src/lib.rs](https://github.com/openai/codex/blob/67f0994b532b8740f14b5b738af7b7b2a915b1d6/codex-rs/ansi-escape/src/lib.rs#L65) 用 cfg(test)、path 和 mod 声明加载 [ansi_escape_tests.rs](https://github.com/openai/codex/blob/67f0994b532b8740f14b5b738af7b7b2a915b1d6/codex-rs/ansi-escape/src/ansi_escape_tests.rs) | Reed 采纳为默认单测组织方式：正文放独立文件，保留父模块访问关系，不另建 crate 或扩大 pub API |
| Rust 同文件单测 | Tauri [state.rs](https://github.com/tauri-apps/tauri/blob/31f29e197e7ac18797dbb9270fe658c1ca1010c8/crates/tauri/src/state.rs#L163) 在 cfg(test) 子模块中维护单测 | 保留上游事实，不将其判成违反 Rust；Reed 仍按用户确认的偏好选择单测正文独立，而不复制这条上游布局 |
| 集成测试与辅助层 | Codex [core/tests/all.rs](https://github.com/openai/codex/blob/67f0994b532b8740f14b5b738af7b7b2a915b1d6/codex-rs/core/tests/all.rs) 聚合测试模块；[workspace](https://github.com/openai/codex/blob/67f0994b532b8740f14b5b738af7b7b2a915b1d6/codex-rs/Cargo.toml#L181) 有按需测试辅助依赖 | 公开 API／跨组件测试放所属 tests；有真实复用和构建边界再抽测试辅助包，不强制每模块一个测试 crate |
| 针对特定能力的测试工程 | Tauri [workspace](https://github.com/tauri-apps/tauri/blob/31f29e197e7ac18797dbb9270fe658c1ca1010c8/Cargo.toml#L1) 包含 crates/tests/acl、restart；[test-core 工作流](https://github.com/tauri-apps/tauri/blob/31f29e197e7ac18797dbb9270fe658c1ca1010c8/.github/workflows/test-core.yml) 分别检查它们 | 测试工程按能力和平台需要建立；Reed Core 的检查不应因桌面测试引入 GUI 依赖 |
| 按职责组织多语言模块 | Tauri [架构说明](https://github.com/tauri-apps/tauri/blob/31f29e197e7ac18797dbb9270fe658c1ca1010c8/ARCHITECTURE.md#major-components) 区分核心、runtime、宏／代码生成、JS API 与 CLI | 保留 Reed 已确定的 core/protocol/runtime/UI/client/薄壳边界；不照搬 Tauri 作为框架所需的全部 crate |
| 分层检查与维护成本 | Codex [Workflow Strategy](https://github.com/openai/codex/blob/67f0994b532b8740f14b5b738af7b7b2a915b1d6/.github/workflows/README.md) 区分快速 PR 信号与合并后重检查；Tauri [test-core](https://github.com/tauri-apps/tauri/blob/31f29e197e7ac18797dbb9270fe658c1ca1010c8/.github/workflows/test-core.yml) 区分平台和 features | 先最小相关测试，再受影响的组合检查；Web 构建、原生测试及真实宿主分开记证据。不为 Reed 当前规模引入 Bazel、远端构建集群或完整平台矩阵 |
| 贡献与 AI 责任 | Tauri [贡献指南](https://github.com/tauri-apps/tauri/blob/31f29e197e7ac18797dbb9270fe658c1ca1010c8/.github/CONTRIBUTING.md#ai-tool-policy) 要求提交者审阅和测试 AI 生成内容 | Reed 的交付人须回读实现与验证证据；AI 生成或另一 Agent 声称通过不能代替检查 |

以上是有范围的样本，不是“知名项目都这样”的结论。Codex 当前贡献政策限制外部代码 PR，Tauri 有自己的社区与发行制度；
这些治理选择不自动适用于 Reed。TDD 来自 Reed 用户要求，不声称上述项目都强制采用 TDD。

## 语言与工具机制的补充依据

- [Rust 测试组织](https://doc.rust-lang.org/book/ch11-03-test-organization.html)：私有单元测试和公开 API 集成测试的可见性不同。
- [Rust 模块路径](https://doc.rust-lang.org/reference/items/modules.html)：支持将模块正文放在另一文件。
- [Cargo 包布局](https://doc.rust-lang.org/cargo/guide/project-layout.html)：src、tests、examples 等各有用途。
- [Vitest 测试文件](https://vitest.dev/guide/learn/writing-tests)：源码相邻和专门目录均被支持；Reed 选择保留现有 tests 目录。
- [React 规则](https://react.dev/reference/rules)：Hook、纯渲染和不可变输入约束；不规定所有项目必须使用同一目录树。
- [TypeScript tsconfig](https://www.typescriptlang.org/tsconfig/)：exclude 只影响 include 搜索，不能阻止源码主动导入被排除文件。
- [Python unittest](https://docs.python.org/3/library/unittest.html#test-discovery) 与 [PEP 8](https://peps.python.org/pep-0008/)：测试发现及编码风格；Reed 工程脚本沿用根 tests 的组织。
- [Maven 布局](https://maven.apache.org/guides/introduction/introduction-to-the-standard-directory-layout)：src/main/java 与 src/test/java 是 Maven 工程惯例，不是所有语言共同的布局。

## 对当前 Reed 的处理

- Rust 保留 crate/src 与公开接口 tests；Reed 的私有单测正文默认独立 `*_tests.rs`，实现模块仅条件加载。
  当前桌面诊断与导出测试按此方式迁出内嵌正文，私有 API 和测试断言保持不变。
- TS／React 已有所属模块的独立 tests；继续保持产品导入图不引用测试代码，测试依赖不进入产品构建。
- Python 工程反例测试保留根 tests。没有实际业务测试的空骨架不创建占位测试或假覆盖。
- 当前临时 services 接口、全局协调和平铺组件是已识别的结构债；新增边界遵循开发规范，具体重构按后续任务范围推进。
