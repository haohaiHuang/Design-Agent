# Design-Agent — DSH 设计 Agent 工作区

本工作区是 DSH 设计 Agent（`my-agent` 预设）的配套代码仓库，当前包含：

## plugins/design-router — design-references 确定性工具插件

移植自 [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) 的
`extensions/design-router`（pi extension → DSH Cordis 插件），由 `my-agent`
预设通过 `agent.cordis.yml` 中的绝对路径行挂载：

```yaml
- id: design-router
  name: '/Users/huanghaohai/Desktop/DSH/Design-Agent/plugins/design-router/index.mjs'
```

### 工具

| 工具 | 作用 | 对应环节 |
| --- | --- | --- |
| `design_lookup <branch> <stage>` | 查 design-references 资源注册表（R/C/E/V 三维索引 + 退化链 + 来源） | 全流程"这一步查什么" |
| `design_audit <target>` | 机器化 slop gates（hallmark 机器子集）+ interfaces CS-* 8 条 + 环节 4 扫描 + 继承链对比度 | 环节 4 校验 |
| `design_contrast <target>` | WCAG 2.1 + APCA 近似对比度 | 环节 4 校验 |

### 与 pi 版的差异（有意裁剪）

- **去掉** `design_research`（DSH 用「本地台账 grep + refero 探测 + web_search」退化链）
- **去掉** `hallmark_study_fetch`（DSH 用 `dembrandt` / `defuddle` 替代）
- **去掉** before_agent_start 注入与 `/design-router` 命令（DSH 技能加载机制已覆盖路由）
- **不依赖** `@deepseek-ai/dsh-tools`（工作区模块解析不到 dsh 安装目录），
  工具定义直接用完整 JSON Schema 构造，零外部运行时依赖

### 目录

```
plugins/design-router/
├── index.mjs          # 插件入口：注册 3 个工具（node:fs 直读，只读不改）
├── checks/            # 检查器移植（TS→JS）：typography/layout/a11y/copy/contrast/cheat/types
└── data/
    └── registry.json  # registry.md 的数据化产物（56 资源 × 9 分支路由）
```

### 维护

- registry.md 是**真源**（`~/.agents/skills/design-references/references/registry.md`），
  改动后需同步 `data/registry.json`（上游用 `scripts/build-registry.mjs` 生成，
  本仓库可手动同步或后续补脚本）
- 检查器逻辑跟随上游 `extensions/design-router/checks/`，上游更新时对照移植

## 配套安装（本机已就位）

| 项 | 位置 | 状态 |
| --- | --- | --- |
| design-references 技能 | `~/.agents/skills/design-references/`（已做 DSH 适配） | ✅ |
| hallmark 技能 | `~/.agents/skills/hallmark/` | ✅ |
| 资源台账 | `~/resources/design-references.md` | ✅ |
| kami/zine/logo-generator 本地资产 | `~/Desktop/Design/` | ✅ |
| dembrandt（URL→设计 token） | 全局 npm v0.30.0（`~/.npm-global/bin/dembrandt`） | ✅ |
| defuddle（URL→文本） | 全局 npm（`~/.npm-global/bin/defuddle`） | ✅ |
| openpencil（.fig 工具箱） | — | ⛔ 已决定不装（HTML 媒介不需要） |

## 预设

- `~/.dsh/.agent-presets/my-agent/`：persona 已改写为「design-references 五环节
  入口 + 完整门禁」，挂载 design-router 插件行
- 新建会话选择「设计 Agent」预设即生效
