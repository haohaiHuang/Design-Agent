# 原子动作模型（Atomic Ops）— Design-Agent 流程解耦设计

> 状态：**DSH 侧验证中**（本地已生效）。验证跑顺后再回灌上游 [my-pi-skills](https://github.com/haohaiHuang/my-pi-skills) 的 `skills/design-references`，避免 pi / DSH 两平台同时改出分叉。

## 一、为什么拆：现状的三个问题

当前结构是 `阶段判定（5 档）→ 场景分支（A/B/C）→ 环节（0-4）`。环节内部其实已有 20+ 子步骤，且已做条件化（`5b 事实验证门` / `1a 品牌资产门` / `2b 概念发散` / `9a/9b` / `9 减法 pass`）。
**粒度不是瓶颈，缺的是三样东西**：

| # | 问题 | 后果 |
| --- | --- | --- |
| ① | **入口单位是"环节"而非"步骤"** | 进入某环节就得顺序走完它的全部子步骤；无法只跑其中一步 |
| ② | **子步骤没有输入/输出契约** | 无法中断续跑、无法交接、无法并行；产物散落在对话里 |
| ③ | **门禁绑在环节末** | 中途进入会丢掉该有的用户确认点 |

附带问题：**工具与步骤是散文绑定的**（`design_route` 写在 1b、`design_audit` 写在 4.1），"只扫一下"这类请求需要反推该调哪个工具。

## 二、切分标准

**以"可独立交付 / 可交接"为单位切**，不按"叙述步骤"切。理由：op 的价值在于可以被独立请求、独立产出、独立验收；过细会推高路由推理负担与上下文预算压力（技能已有"铁律 10 加载预算"）。

## 三、12 个原子动作

| op | 名称 | 输入 | 产物（落盘） | 工具 / 校验 | 门禁 |
| --- | --- | --- | --- | --- | --- |
| `0.brief` | 意图澄清 | 用户需求 | `designs/brief.md`（场景/格式/受众/目标/硬约束/形态） | 问询 ≤3 问 | 用户确认 |
| `0.facts` | 事实验证 | 产品/品牌/版本/规格 | `designs/facts.md` | `web_search`（+`tool-web` fetch） | 自动 |
| `1.route` | 需求路由 | brief / 需求原文 | `designs/route.md`（主桶+次桶） | `design_route` | 自动 |
| `1.extract` | 参考萃取 | URL / .fig / 截图 | `designs/tokens-<name>.md` | `dembrandt` / `defuddle` / openpencil | 自动 |
| `1.diverge` | 候选发散 | route + tokens | `designs/candidates.md` + `candidate-*.html` | `design_lookup` + `design_diversity` | 用户选定 |
| `2.constrain` | 约束转译 | 选定候选 / tokens | `designs/constraints.md`（≤10 条，每条带来源） | 可执行+可校验自检 | 用户确认 |
| `3.build` | 实现产出 | constraints | `designs/<name>.html` | `/* 约束N */` 注释齐全 | 自动 |
| `4.audit` | 机器校验 | 产物 | gate punch list | `design_audit` | 自动 |
| `4.critique` | 独立评审 | 截图 + 方向锁 + moodboard | 四维评分 | `ego-browser` 截图 + critic 子代理 | 自动 |
| `4.refine` | 减法 / 回炉 | 产物 + 约束集 | `designs/refine.md` | Type A 机器抓 / Type B 人定清单 | 用户确认 |
| `5.advise` | 修改建议 | 现有产物（只读） | `designs/修改方向.md` | 五要素齐全自检 | 用户确认 |
| `5.handoff` | 交付交接 | 建议 + 原型 + 约束 | `DECISION.md` + `reference-*.html` + 交接提示词 | `present` | 自动 |

## 四、两个解耦机制

### 1. 产物契约（artifact contract）

op 之间**只通过 `designs/` 下的文件交接**，不靠对话上下文。四个副产品：

- **中途进入**：某 op 的输入产物已存在 → 该 op 可单独启动
- **断点续跑**：`constraints.md` / `修改方向.md` 就是断点
- **并行**：多个参考站可并行 `1.extract`；`4.audit`（静态分析）与 `4.critique`（截图评审）可并行
- **交接**：产物即交接包（复用已定义的"交接三件套"）

### 2. 门禁挂 op（declarative gate）

每个 op 自带 gate 声明（`用户确认` / `用户选定` / `自动`），而不是"每环节末确认一次"。中途进入的请求同样受正确门禁保护。

## 五、入口判定：从"猜意图"改为"看产物"

设计任务的**第一动作是盘点现状**，而不是判断任务类型：

1. **用户给了什么**：URL / 截图 / .fig / 现有 HTML / 设计系统
2. **`designs/` 已有哪些产物**：`brief.md` / `route.md` / `tokens-*.md` / `candidates.md` / `constraints.md` / 产物 HTML / 建议文档
3. **从"第一个输入未被满足的 op"进入**；拿不准时一次问清（≤3 问）；仍无法判断 → 按产物存在性兜底（**有产物 → `4.audit`；无产物 → `0.brief`**）

### 三档粒度

| 档 | 含义 | 例子 |
| --- | --- | --- |
| **L0 单点** | 只跑一个 op | "扫一下有没有 AI 味" → `4.audit`；"看看这个网站的设计系统" → `1.extract`（止于此，不进流程） |
| **L1 分段** | 跑一条子链 | "用 Linear 那种风格做" → `1.extract` → `2.constrain` → `3.build` → `4.audit` |
| **L2 全流程** | 从零新建 | `0.brief` → … → `5.handoff` |

### 常用入口对照

| 用户说 | 入口 | 档位 |
| --- | --- | --- |
| 帮我做个落地页 | `0.brief` | L2 |
| 给我几个风格方向 | `1.route` → `1.extract` → `1.diverge` | L0/L1 |
| 用 Linear 那种风格做 | `1.extract` → `2.constrain` → `3.build` → `4.audit` | L1 |
| 看看这个网站的设计系统 | `1.extract`（止于此） | L0 |
| 这页面很丑 | `4.audit` → `4.critique` → `5.advise` → `5.handoff` | L1 |
| 扫一下有没有 AI 味 | `4.audit` | L0 |
| 评审一下这个成品 | `4.critique`（+`4.audit`） | L0 |
| 把约束给我，我自己实现 | `2.constrain`（止于此） | L0 |
| 改个按钮圆角 | `5.advise`（轻量单项） | L0 |
| 帮我核实这个大疆 Pocket 4 发布了没 | `0.facts` | L0 |

## 六、生效位置（DSH 侧）

| 层 | 承载什么 |
| --- | --- |
| **persona**（`presets/my-agent/agent.cordis.yml`） | op 表 + 三档粒度 + 入口对照 + 产物契约 + 门禁原则（**运行时生效层**） |
| **技能** `design-references`（`skills/design-references/`） | 各 op 的**具体做法**（五环节细节、ui-quickfix、critic 提示词等），未改动 |
| **插件** `design-router` | op 依赖的确定性工具（`design_route` / `design_lookup` / `design_diversity` / `design_audit` / `design_contrast` / `design_quality`） |

> 本文件是**设计文档**：记录拆分理由、契约与入口表，供审阅与将来回灌上游使用。运行时以 persona 中的表为准。

## 七、回灌上游的触发条件（验证清单）

在 DSH 侧跑顺后再动 `my-pi-skills`，验证项：

1. 入口判定准确：至少 5 类不同请求（L0 单点 / L1 分段 / L2 全流程 / 审计迭代 / 纯萃取）都能命中正确 op，无"无谓前滚"
2. 产物契约成立：中断后能从 `constraints.md` 或 `修改方向.md` 续跑
3. 门禁不错位：中途进入的请求仍会在正确的 op 停下确认
4. 边界不破：`5.advise` / `4.*` 全程不碰原项目文件
5. 上下文预算可控：单次任务读取的参考文件数未明显上升（对照"铁律 10"）
