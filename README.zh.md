# Design-Agent — DSH 设计 Agent 工作区

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-dsh-blue)](https://github.com/deepseek-ai/deepseek-harness)
[![Topics: dsh](https://img.shields.io/badge/plugin-dsh-4B9CD3)](https://github.com/topics/dsh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 🇬🇧 English version: [README.md](README.md)

本仓库是 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 上**设计 Agent 的完整可复现包**：`my-agent` 预设 + `design-references` 路由技能（DSH 适配版）+ `design-router` 确定性工具插件。由 [design-references](https://github.com/haohaiHuang/my-pi-skills/tree/main/skills/design-references) 方法论升级既有 HTML 设计 Agent 而来。

> ⚠️ **本包复现的是"机器"，不是"内容"。** 路由、纪律与工具完全自包含（clone → `cp -RL` → 即用）；但**参考库是个人精选**——若干主层级资源指向 `~/Desktop/Design/...` 与 `~/resources/design-references.md`（私人资产，不随仓库走）。新机器上这些会退化为兜底链（`web_search` + `dembrandt` + 内置 hallmark 纪律）。想要完整个人参考集需自行拷贝这些目录；缺失时本包仍可用，退化为「纯 Hallmark 纪律 + 网络调研」的设计 Agent。见下方"一键复现"（随包内容 vs 自备内容）。

## 仓库内容

| 组件 | 作用 |
| --- | --- |
| [`plugins/design-router/`](plugins/design-router/) | 确定性工具 Cordis 插件（5 个只读 + 1 个本地日志写入，零外部运行时依赖） |
| [`presets/my-agent/`](presets/my-agent/) | DSH 预设（`agent.cordis.yml` + `preset.yml`）：五环节 persona + 每环节确认门禁 |
| [`skills/design-references/`](skills/design-references/) | 场景分支路由技能（A 产品/B 内容/C 通用 × 五环节），DSH 适配版 |
| [`skills/hallmark/`](skills/hallmark/) | 反 AI 味执行技能（MIT 上游副本，来自 [nutlope/hallmark](https://github.com/nutlope/hallmark)；`site/` 主题 tokens 与示例已随技能内置，自包含） |

## plugins/design-router — 确定性工具

移植自 [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) 的
`extensions/design-router`（pi extension → DSH Cordis 插件），由 `my-agent`
预设通过 `agent.cordis.yml` 中的**相对路径行**挂载（预设内 `plugins/` 为指向
仓库根 `plugins/` 的相对软链，安装时 `cp -RL` 展开——无需写死绝对路径）：

```yaml
- id: design-router
  name: './plugins/design-router/index.mjs'
```

### 工具

| 工具 | 作用 | 对应环节 |
| --- | --- | --- |
| `design_lookup <branch> <stage>` | 查 design-references 资源注册表（R/C/E/V 三维索引 + 退化链 + 来源，输出标注风格桶） | 全流程"这一步查什么" |
| `design_route <需求特征>` | 按需求关键词返回推荐风格桶组合（主桶必查 + 次桶按需）+ 各桶代表资源 | 环节 1 调研（反同质化定位） |
| `design_diversity <c1> <c2> <c3>` | 3 候选差异度机器检查（色相族/字体气质/来源桶），PASS/FAIL | 环节 1 候选展示前（反同质化校验） |
| `design_quality <report\|query>` | 质量信号记录/查询（提取成功率/回炉率/可达性等客观信号，非审美），本地日志不入 git | 环节 4 后记录 / 环节 1 消费降权 |
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
├── index.mjs          # 插件入口：注册 6 个工具（5 只读 + 1 本地日志写入，其余不碰文件）
├── checks/            # 检查器移植（TS→JS）：typography/layout/a11y/copy/contrast/cheat/types
└── data/
    └── registry.json  # registry.md 的数据化产物（79 资源 × 9 分支路由）
```

### 维护

- registry.md 是**真源**（`~/.agents/skills/design-references/references/registry.md`），
  改动后需同步 `data/registry.json`（上游用 `scripts/build-registry.mjs` 生成，
  本仓库可手动同步或后续补脚本）
- 检查器逻辑跟随上游 `extensions/design-router/checks/`，上游更新时对照移植

## 一键复现（全新机器安装本仓库）

本仓库复现**机器部分**：插件 + 预设 + DSH 适配版技能都在仓库内（参考库内容为个人精选，见文首声明）。

```bash
# —— 随包（clone 即得）——
# 1. 技能（design-references 已做 DSH 适配；hallmark 为 MIT 上游副本）
cp -R skills/design-references ~/.agents/skills/
cp -R skills/hallmark ~/.agents/skills/

# 2. 预设（cp -RL：把 presets/my-agent/plugins 相对软链展开为自包含副本，
#    装好后预设目录不再依赖仓库路径，可整体拷贝/换机迁移）
mkdir -p ~/.dsh/.agent-presets
cp -RL presets/my-agent ~/.dsh/.agent-presets/

# 3. 插件源码（保持在工作区仓库根 plugins/，可 git 管理）
#    预设通过相对路径 './plugins/design-router/index.mjs' 引用：
#    presets/my-agent/plugins 是指向仓库根 plugins/ 的相对软链，
#    cp -RL 复制时展开为真实目录，因此换机器无需改任何路径。

# 4. 外部依赖（软依赖，缺失只降级不影响主流程）
npm install -g dembrandt        # URL→设计 token（环节 1 候选验证）
# defuddle：npm install -g defuddle
# npm install -g @open-pencil/cli   # 可选：.fig/.pen 设计文件直读/转换/校验（未装时走 Figma 家族/人工核对）

# —— 自备（个人精选，缺失时走退化链）——
# 5. 本机资产（台账 + kami/zine/logo-generator 参考库，见 ~/Desktop/Design/）
#    缺失时包退化为「纯 Hallmark 纪律 + web_search/dembrandt 网络调研」，
#    主流程仍可运行，只是候选池少了个人精选资源
```

**注意**：预设中插件行用的是**相对路径** `./plugins/design-router/index.mjs`
（`presets/my-agent/plugins` 为相对软链，`cp -RL` 展开），换机器直接复制预设目录即可，
**无需修改任何路径**。若不想用软链，也可以把 `plugins/design-router/` 整体复制进
`presets/my-agent/plugins/` 再 `cp -R`（结果相同，只是多一份拷贝）。

### 仓库结构

```
├── plugins/design-router/     # 确定性工具插件（3 工具，零外部运行时依赖）
├── presets/my-agent/          # DSH 预设（agent.cordis.yml + preset.yml）
├── skills/
│   ├── design-references/     # 路由技能（DSH 适配版）
│   └── hallmark/              # 反 AI 味执行技能（MIT 上游副本，含 site/ 主题资产）
├── README.md                  # 英文（主版）
└── README.zh.md               # 中文
```

## 第三方内容与许可声明

本仓库包含以下第三方内容（均已保留上游许可/来源标注）：

| 内容 | 来源 | 许可 | 位置 |
| --- | --- | --- | --- |
| hallmark 技能 + `site/` 主题 tokens 与示例 | [nutlope/hallmark](https://github.com/nutlope/hallmark) | MIT（完整文本见 [`skills/hallmark/LICENSE`](skills/hallmark/LICENSE)） | `skills/hallmark/` |
| registry 中引用的外部设计资源（kami/zine/logo-generator 等） | 各上游仓库 | 仅链接引用（未复制入仓，来源 URL 见 [`registry.md`](skills/design-references/references/registry.md)） | — |

其余内容（`plugins/`、`presets/`、`skills/design-references/`）为本仓库自有，遵循 [MIT License](LICENSE)（Copyright © 2026 haohaiHuang）。

## 相关链接

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — 运行本包的平台（dsh，一切皆插件）
- [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) — 上游技能仓库（design-references / skill-router / vision）
- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) — DSH 插件精选列表
