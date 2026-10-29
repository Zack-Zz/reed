# desktop — 内部边界

已建立可选 Tauri 薄壳及独立 Cargo workspace／锁文件。共享 React 前端通过固定 core_health 读取诊断；不启动／停止 Core，不依赖 runtime/domain，不打开业务数据库。

[工程边界](../../docs/architecture/overview.zh-CN.md) · [构建指南](../../docs/engineering/development.zh-CN.md)
