# desktop — 内部边界

已建立可选 Tauri 薄壳及独立 Cargo workspace／锁文件。默认入口与 Web 装配同一 WorkbenchRoot、样式及模拟适配，
仅注入受限的异步文件导出能力；不复制页面、模拟状态机或业务存储。
`/diagnostics.html` 另经固定 core_health 读取诊断；Demo 变体仅获得导出权限。
不启动／停止 Core，不依赖 runtime/domain，不打开业务数据库。

[工程边界](../../docs/architecture/overview.zh-CN.md) · [构建指南](../../docs/engineering/development.zh-CN.md)
