# design-agent-preset（DSH 0.2.0 的声明式预设 bundle）

「设计 Agent」预设。**本目录是源**；装到某个 profile 由 `Plugins → Add plugin`（或 `dsh plugin --profile <名> add <目录>`）完成。

## 为什么是这个形状

0.2.0 起，`$DSH_HOME/.agent-presets/<id>/`（`preset.yml` + `agent.cordis.yml`）**不再被读取**，
预设改由 bundle 里的**声明行**组成：`cordis.patch.yml` 用 `insert` 追加一条
`id: preset-<id> / name: '@deepseek-ai/dsh-agent-preset'`，其 `config.plugins` 即原来那份插件清单。
旧形态的等价物见 `../my-agent/`（已废弃）。

## 装法（两个 bundle，顺序无关）

```bash
# 1) 预设本身
dsh plugin --profile <profile> add <本仓>/presets/design-agent-preset
# 2) 它引用的插件包（@local/dsh-design-router）
dsh plugin --profile <profile> add <本仓>/plugins/design-router
```

桌面端在侧栏 **Plugins → Add plugin**，把上面两个目录的绝对路径分别装一次，然后 **Enable now**。
装完新建会话，预设列表出现「设计 Agent」（id `my-agent`）。

## 插件行为什么用包名

`config.plugins` 里那一行是 `name: '@local/dsh-design-router'`，靠 profile 的 `node_modules` 解析。
**不要**改成相对路径 `./plugins/design-router/index.mjs`：0.2.0 里预设 `config.plugins` 的行不按 patch
位置解析相对路径，实测整个预设报 `design-router (…): never started`、界面显示「加载失败」。
也**不要**靠本 bundle 的 `dependencies` 引入插件：`link:` / `file:` 方式安装的 bundle 不会安装它的嵌套依赖（同样 never started）。

这样 bundle 内**不含任何机器绝对路径**，可跨机复制；代价是插件要单独装一次。

## 维护

- 改 persona 或插件清单 → 编辑 `cordis.patch.yml` → 在 Plugins 页重装该 bundle。
- 插件源码在 `<本仓>/plugins/design-router/`；改完把那两个 bundle 重装一次即可生效。

## 与 profile patch 路线的关系

0.2.0 里自定义预设本质是"组合里的一条 insert 行"，本目录把它放在 **bundle 层**；另一条等效路线是
把它直接写进**某个 profile 的 `cordis.patch.yml`**（用户层），工具见 [`../../docs/migrate-preset-0.2.0.mjs`](../../docs/migrate-preset-0.2.0.mjs)。

| | bundle 层（本目录，本机在用） | profile patch 层（migrate 脚本） |
| --- | --- | --- |
| 装法 | Plugins → Add plugin（预设 + 插件包，各一次） | 跑脚本 `--append <profile>/cordis.patch.yml` |
| 插件引用 | 包名 `@local/dsh-design-router`（无机器路径） | 脚本把相对路径替换为**绝对路径** |
| 适用 | 想跨机复用同一份预设 | 只在单机、或不便装 bundle 时 |

两者都是同一条 insert 行，**不要同时用**（同一 `preset-<id>` 出现两次会让组合产生重复行）。
