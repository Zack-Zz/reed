# tooling — 内部边界

已提供契约生成／漂移检查、独立 Core smoke、声明依赖及前端 import 边界检查。Node/Python 只用于这些工程工具，不进入 Core 运行时。

`check_boundaries.py` 保留 Rust manifest 依赖约束，并检查以下前端方向：

- client 不依赖或导入 UI／应用；UI 不依赖或导入应用；Web 与 Desktop 不互相依赖或导入。
- manifest 检查 dependencies、devDependencies、peerDependencies 与 optionalDependencies，识别工作区实际包名、npm 别名及 file/link 路径。
- 共享前端不导入原生 SDK；workbench 与 UI 主入口不经本地中间模块或再导出依赖 mock。壳仍可明确装配 `@reed/ui/mock`，mock 可引用纯呈现类型及 helper。
- JS/TS 产品 src 不导入明确的测试专用模块，或 tests／test／__tests__ 与 `.test`／`.spec` 文件；测试目录仍可正常导入 src。Rust 单测正文按 Reed 约定独立文件，由 cfg(test) 子模块加载。

前端语法由 `frontend_imports.mjs` 调用项目已锁定的 TypeScript 解析器提取，不执行项目源码；
因此前端检查需要 Node 和已安装的锁定 npm 依赖。没有前端源文件的 Rust manifest 检查不启动 Node。
Python 对 import、export-from、import-equals、类型导入及字面量 import()/require() 建立有限本地源码图，
诊断包含违规路径及引用位置。注释、字符串或正则中的示例不视为依赖，语法错误明确失败，循环引用不会无限遍历。
这不是完整构建解析或类型检查：不求值计算得到的 specifier、带插值的模板表达式，不保证任意构建别名或 package exports 映射，
不解析 require 的局部绑定，也不扫描第三方传递依赖或编译产物；这些仍需构建和代码评审。
当前不遍历迁入 JS/JSX 的 JSDoc 类型元数据（如 @typedef import 或 @import）；其中的类型归属仍须评审，不把该部分当作已自动覆盖。
测试模块识别基于明确包名与约定路径，不能证明任意代码没有测试正文。
`tests/test_boundaries.py` 维护失败及允许方向的临时 fixture，不生成真实产品数据。

[工程边界](../docs/architecture/overview.zh-CN.md) · [构建指南](../docs/engineering/development.zh-CN.md)
