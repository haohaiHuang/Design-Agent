# Design-Agent — DSH 设计 Agent 工作区

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-dsh-blue)](https://github.com/deepseek-ai/deepseek-harness)
[![Topics: dsh](https://img.shields.io/badge/plugin-dsh-4B9CD3)](https://github.com/topics/dsh)

> 🇬🇧 English version: [README.md](README.md)

本仓库是 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 上**设计 Agent 的完整可复现包**：`my-agent` 预设 + `design-references` 路由技能（DSH 适配版）+ `design-router` 确定性工具插件。由 [design-references](https://github.com/haohaiHuang/my-pi-skills/tree/main/skills/design-references) 方法论升级既有 HTML 设计 Agent 而来。

## 仓库内容

| 组件 | 作用 |
| --- | --- |
| [`plugins/design-router/`](plugins/design-router/) | 确定性工具 Cordis 插件（3 个只读工具，零外部运行时依赖） |
| [`presets/my-agent/`](presets/my-agent/) | DSH 预设（`agent.cordis.yml` + `preset.yml`）：五环节 persona + 每环节确认门禁 |
| [`skills/design-references/`](skills/design-references/) | 场景分支路由技能（A 产品/B 内容/C 通用 × 五环节），DSH 适配版 |
| [`skills/hallmark/`](skills/hallmark/) | 反 AI 味执行技能（MIT 上游副本，来自 [nutlope/hallmark](https://github.com/nutlope/hallmark)） |

## plugins/design-router — 确定性工具

移植自 [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) 的
`extensions/design-router`（pi extension → DSH Cordis 插件），由 `my-agent`
预设通过 `agent.cordis.yml` 中的绝对路径行挂载：

```yaml
- id: design-router
  name: '/绝对/路径/到/plugins/design-router/index.mjs'
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

## 一键复现（全新机器安装本仓库）

本仓库是**完整可复现包**：插件 + 预设 + DSH 适配版技能都在仓库内。

```bash
# 1. 技能（design-references 已做 DSH 适配；hallmark 为 MIT 上游副本）
cp -R skills/design-references ~/.agents/skills/
cp -R skills/hallmark ~/.agents/skills/

# 2. 预设
mkdir -p ~/.dsh/.agent-presets
cp -R presets/my-agent ~/.dsh/.agent-presets/

# 3. 插件源码（保持在工作区，供预设绝对路径引用）
#    把 plugins/ 放到你想要的目录，然后改下面一行：
#    presets/my-agent/agent.cordis.yml 中 design-router 行的 name 改为
#    插件 index.mjs 的绝对路径

# 4. 外部依赖（软依赖，缺失只降级不影响主流程）
npm install -g dembrandt        # URL→设计 token（环节 1 候选验证）
# defuddle：npm install -g defuddle

# 5. 本机资产（台账 + kami/zine/logo-generator 参考库，见 ~/Desktop/Design/）
#    ——来自用户个人精选，不在本仓库；缺失时走退化链
```

**注意**：预设中插件行是绝对路径（`/Users/huanghaohai/Desktop/DSH/Design-Agent/...`），
新机器必须改成你自己的路径，否则挂载失败。

### 仓库结构

```
├── plugins/design-router/     # 确定性工具插件（3 工具，零外部运行时依赖）
├── presets/my-agent/          # DSH 预设（agent.cordis.yml + preset.yml）
├── skills/
│   ├── design-references/     # 路由技能（DSH 适配版）
│   └── hallmark/              # 反 AI 味执行技能（MIT 上游副本）
├── README.md                  # 英文（主版）
└── README.zh.md               # 中文
```

## 相关链接

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — 运行本包的平台（dsh，一切皆插件）
- [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) — 上游技能仓库（design-references / skill-router / vision）
- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) — DSH 插件精选列表
