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
| [`plugins/design-router/`](plugins/design-router/) | 确定性工具 Cordis 插件（6 个只读 + 1 个本地日志写入，零外部运行时依赖） |
| [`presets/my-agent/`](presets/my-agent/) | DSH 预设（`agent.cordis.yml` + `preset.yml`）：三层路由 persona（阶段判定 → 场景分支 → 环节）+ 每环节确认门禁 |
| [`skills/design-references/`](skills/design-references/) | 阶段/场景路由技能（阶段判定 → A 产品/B 内容/C 通用 → 五环节），DSH 适配版 |
| [`skills/hallmark/`](skills/hallmark/) | 反 AI 味执行技能（MIT 上游副本，来自 [nutlope/hallmark](https://github.com/nutlope/hallmark)；`site/` 主题 tokens 与示例已随技能内置，自包含） |

> **DSH 版本要求：`0.1.5-rc.1` 或更高。** 0.1.5 改了 persona 插件的 config schema
> （`text` → `prefix` + `suffix`），仍用 `text:` 的预设会挂载失败并报
> `$.prefix missing required value`。本仓库预设已用 0.1.5 schema，并启用了 0.1.5 新增的
> 两行：`present`（`dsh-tool-present` 交付物声明）与 `command-goal`（`/goal` 命令）。

## ⚠️ DSH 0.2.0+（桌面端）：预设不再从目录扫描

**0.2.0 换了预设机制**：0.1.x 里预设是目录（`~/.dsh/.agent-presets/<id>/agent.cordis.yml`），由
`dsh-agent-presets` **扫描发现**；0.2.0 改为 `dsh-agent-preset-registry`（config 只有 `default` /
`selectedDefault`，**没有 roots、不再扫目录**），每个预设变成 **profile 组合里的一行**
`@deepseek-ai/dsh-agent-preset`（`config.plugins` 内联，`id` 与 `plugins` 必填）。

**后果**：升级到桌面端（0.2.0-rc.2）后，放在 `~/.dsh/.agent-presets/` 的自定义预设会**从列表里消失**
——不是坏了，是那个目录不再被读取。

**迁移**（把目录格式转成根层 insert patch）：

```bash
node docs/migrate-preset-0.2.0.mjs \
  --src presets/my-agent/agent.cordis.yml \
  --plugin "$PWD/plugins/design-router/index.mjs" \
  --append ~/.dsh/profiles/desktop/cordis.patch.yml      # 自动备份 .bak.<时间戳>
```

然后**完全退出并重开**桌面端，新建会话的预设列表里就会出现「设计 Agent」。

两个格式变化要注意：① **插件行必须用绝对路径**（内联预设没有"预设目录"作相对基准，
`./plugins/...` 会落到 profile 目录去）——迁移脚本会自动改写；② **桌面 profile 由 Electron 管理**，
`cordis.patch.yml` 同时承载应用写入的设置，若某次设置变更把它整体重写，重跑一次 `--append` 即可。

> 旧的目录 `~/.dsh/.agent-presets/my-agent/` 可留作参考；0.2.0 已忽略它。

### 排障：预设装了却仍不在列表里

**预设任一插件行挂载失败，registry 会把它标记为 `broken`，UI 直接不显示**——最常见的原因是某一行
引用了**当前 DSH 版本已不再提供**的包。0.1.5 → 0.2.0 就踩了这个：

| 0.1.5 的行 | 0.2.0 的替代 |
| --- | --- |
| `@deepseek-ai/dsh-workflow-worker-thread` | `@deepseek-ai/dsh-workflow-ptc`（同为 `provider: spawn`） |

**一个死引用就足以让整条预设从列表消失。** 排查（桌面端实现在 `app.asar` 里，用 Electron 自带运行时读）：

```bash
APP="/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
ASAR="/Applications/DeepSeek Harness.app/Contents/Resources/app.asar"
# 1) 该版本实际带了哪些包
ELECTRON_RUN_AS_NODE=1 "$APP" -e "console.log(require('fs').readdirSync('$ASAR/dsh/node_modules/@deepseek-ai').join('\n'))" | sort > /tmp/dsh-pkgs.txt
# 2) 预设引用了哪些包，比对（输出即"本版本没有的包"）
grep -oE "name: '@deepseek-ai/[a-z0-9/-]*'" presets/my-agent/agent.cordis.yml | grep -oE "@deepseek-ai/[a-z0-9/-]*" | sed 's|@deepseek-ai/||' | sort -u | grep -v / > /tmp/preset-pkgs.txt
comm -23 /tmp/preset-pkgs.txt /tmp/dsh-pkgs.txt
```

另外两项检查（覆盖其他失败模式）：

```bash
# A) 组合里到底有没有你的预设（把 desktop profile 复制成非保留名即可 dump）
cp -R ~/.dsh/profiles/desktop ~/.dsh/profiles/dtest
dsh --profile dtest --dump-config | grep -n preset-design-agent   # 用完 rm -rf dtest
# B) 逐行 config 是否符合本版本 schema（抓 0.1.5 persona text→prefix 那类漂移）
dsh --profile web --dump-config-schema > /tmp/schema.json         # 再用 jsonschema 校验 plugins 列表
```

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
| `design_audit <target>` | 机器化 slop gates（hallmark 机器子集）+ interfaces CS-* 8 条 + 环节 4 扫描（含 `DR-4` 字重/圆角、`DR-5` 注释自毁与未定义变量、`DR-6` 非文本对比度 WCAG 1.4.11）+ 继承链对比度。扫描前剥离注释、解析一层 `var()`、读同目录外链样式表、支持 `slop-ignore: <理由>` 行内豁免 | 环节 4 校验 |
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
├── checks/            # 检查器移植（TS→JS）：typography/layout/a11y/copy/contrast/cheat/kill-slop/assets/types
└── data/
    └── registry.json  # registry.md 的数据化产物（91 资源 × 9 分支路由）
```

### 维护

- registry.md 是**真源**（`~/.agents/skills/design-references/references/registry.md`），
  改动后运行 `node plugins/design-router/scripts/build-registry.mjs` 重生成
  `data/registry.json`（含 `data/manifest.json` 版本元数据）；**禁止手改 registry.json**
- 检查器逻辑跟随上游 `extensions/design-router/checks/`（TS→MJS 移植），上游更新后运行
  `node plugins/design-router/scripts/check-checks-sync.mjs /path/to/my-pi-skills/extensions/design-router/checks`
  核对 gate 覆盖一致性（阈值细节仍需人工对照移植）

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

> ⚠️ **插件代码改动的生效时机**：预设里的 **persona 文本按会话读取**——保存后新建会话即生效，无需重启；
> 但 `plugins/design-router/` 是**按进程挂载一次**的 Cordis 插件（ESM 只 import 一次），
> 改动插件后必须**重启 `dsh web` 进程**才会被重新加载。改完记得 `cp -RL presets/my-agent ~/.dsh/.agent-presets/` 重装，
> 再重启服务；只重装不重启，新会话仍跑旧检查器。

## 环境前置（真机测试补充）

`design_audit` 与技能里的渲染纪律依赖几个本机工具，缺失只降级、不阻断，但会明显拉低交付质量：

```bash
# 1) 视觉复核（vision 技能 + critic 子代理的视觉直读）
#    vision-cli 与 ego-browser 常在 ~/.local/bin —— 若该目录不在 PATH，工具会报 "not found"
ln -sf ~/.local/bin/vision-cli   /opt/homebrew/bin/vision-cli
ln -sf ~/.local/bin/ego-browser  /opt/homebrew/bin/ego-browser   # 在 PATH 上的目录即可

# 2) 参考站 token 萃取
npm install -g dembrandt            # 真浏览器渲染 → 精确 token + DESIGN.md

# 3) 截图通道（本机实测结论，按序试）
#    chrome-headless-shell（Playwright 缓存）→ iframe 预览壳 →
#    ego-browser Page.printToPDF + pdftoppm
#    注意：Google Chrome 无头 --window-size=375 有最小窗宽（innerWidth 被抬到 500），
#    直接用它出窄屏图会得到"更宽布局被裁到 375"的假图。
```

## 已验证（可复跑的验证入口）

真机测试 18 例 + 修复后重跑 8 例 + 回灌轮抽样 3 例的完整判定与证据见 [`docs/test-results.md`](docs/test-results.md)；
素材生成与测试清单见 [`docs/test-plan.md`](docs/test-plan.md) 与 [`docs/test-fixtures/make-fixtures.sh`](docs/test-fixtures/)。

跨仓协议（哪些必须与上游一致、哪些是有意分叉）与历次工作切片归档在 [`docs/cross-repo/`](docs/cross-repo/)；
一条命令对账 gate 覆盖 + 所有技能副本指纹：`node plugins/design-router/scripts/check-checks-sync.mjs <上游>/extensions/design-router/checks`。

```bash
node plugins/design-router/index.test.mjs                                  # 插件单测（含 8 条误报回归）
node plugins/design-router/scripts/check-checks-sync.mjs <pi-checks-dir>   # 与 pi 版 gate 覆盖一致性
cd <my-pi-skills>/extensions/design-router/checks && node run-tests.mjs    # 上游检查器测试套（Node 可直接跑）
```

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
