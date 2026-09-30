# 已废弃（DSH 0.2.0 不再读取）

本目录是**旧形态**的用户预设：`preset.yml`（显示名/描述）+ `agent.cordis.yml`（插件清单）。
0.2.0 起 Harness 只认组合里的声明行（bundle 层或 profile 的 `cordis.patch.yml`），**运行时不读这个目录**——但它仍是迁移脚本 `docs/migrate-preset-0.2.0.mjs` 的**输入源**，所以保留。

等价物（已迁移）：[`../design-agent-preset/`](../design-agent-preset/)（bundle 路线）。
另一条等效路线是迁移脚本 + profile patch 层，见该脚本头部说明。

迁移时做的三件事，留档备查：

0. `agent.cordis.yml` 里的 `workflow-worker-thread` 是 0.2.0 已移除的包（改为 `workflow-ptc`），
   死引用会让整条预设被标记 broken、从列表消失——本目录这份已就地修好（见提交 2834076）。
1. 插件清单取自 `agent.cordis.yml`，但以新版自带 `standard` 预设为基准重建——
   去掉了新版已移除的 `workflow-worker-thread`，补上新版新增的 `workflow-ptc`、`tool-plugin-manager`；其余包名未变。
2. persona 的 `prefix` / `suffix` 原样搬入（逐字符一致）。
3. 本地插件 `design-router` 改为独立安装的包 `@local/dsh-design-router`，预设用包名引用。
