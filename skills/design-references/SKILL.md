---
name: design-references
description: 设计任务路由技能。第一层判定任务所处阶段（从零新建 / 有方向要落地 / 产物已存在要审计迭代 / 有参考对象要萃取 / 组件级微调），第二层再落场景分支（A产品：APP/网页/Mac；B内容：海报/杂志/PPT；C通用：组件/动效/排版），第三层路由到五环节中当前阶段需要的那一个环节（0意图/1调研/2约束/3产出/4校验），禁止无谓前滚全流程。产物已存在时的视觉审计/迭代（"这页面很丑/很怪/不协调"）直接路由环节 4 快速通道（读 references/ui-quickfix.md），不从环节 0 重走。核心原则：能引用真实资源就不凭空发挥。触发词：设计参考、风格库、design reference、用 XX 的风格、做个 APP/网页/海报/落地页、UI 设计、排版、配色、参考 beautifului/refero/uiverse、这页面很丑/不好看/不协调/很怪、帮我检查下这页面设计、截图迭代。
---

# Design References — 阶段/场景路由

**调用顺序：阶段判定（任务在流程哪个点）→ 场景分支（A/B/C）→ 路由到需要的那一个环节。**

> 资源明细见 `~/resources/design-references.md`（台账，每条带三维标注）；三维索引见 `references/registry.md`；环节操作细节见 `references/workflow.md`。

## 第一层：阶段判定（先判任务在流程哪个点，不无谓前滚）

```
设计需求
├─ 从零新建（无方向/无产物/要重样）→ 完整流程 0→4（如无明确风格需求，重调研）
├─ 有方向要落地（指定了风格/参考/已有 brief）→ 从环节 2/3 切入
├─ 产物已存在要审计迭代（"这页面很丑/很怪/不协调/帮我看看"）→ 环节 4 快速通道 ★
│     └─ 视觉迭代直接走 references/ui-quickfix.md（方向锁+grep sibling），不走 0/1/2/3
├─ 有参考对象（"看看这个网站/截图风格"）→ hallmark study / 萃取，不进设计流程
└─ 组件级微调（单按钮/单卡片/顺手改个色）→ 轻量：grep sibling + 复用 token，不触发流程
```

**判不出阶段 → 按产物是否已存在兜底：已有产物→环节 4；无产物→完整流程。** 性质不明问一次（≤3 问）。

## 第二层：场景分支（决定产出形态与工具链）

```
设计任务
├── A 产品类（可嵌入产品开发流程）
│     ├── A1 APP 应用      └── 分支内第二层：产品阶段 → 环节子集
│     ├── A2 网页/落地页
│     └── A3 Mac 桌面应用
├── B 内容/媒介类（一次性交付，直接五环节）
│     ├── B1 海报（印刷/社交）
│     ├── B2 杂志封面/插图
│     └── B3 PPT/演示
└── C 通用/辅助类（轻量，查即走）
      ├── C1 组件/素材    ├── C2 动效    └── C3 文档排版
```

识别不出具体场景 → 按任务性质归 C 类；性质不明 → 问一次（≤3 问）。

## 分支 A：产品类 — 嵌入产品开发流程

产品阶段 × 环节子集（**禁止全跑**，只跑当前阶段子集）：

| 产品阶段 | 环节子集 | 技能/参考调用 |
| --- | --- | --- |
| 探索期（需求→概念） | 0 + 1 | refero Styles 网站（网页浏览）+ Beautiful UI（A1）/ minimal（兜底） |
| 定义期（方案→设计） | 0 + 1 + 2 | Kami 骨架（C 常驻）+ refero 网站 DESIGN.md（直引·网页浏览）+ design-md-skill（A1 约束生成） |
| 执行期（开发→迭代） | 3（+2 按需） | kami / huashu-design / Figma 家族 / motion |
| 评估期（验收→反馈） | 4 → 回 2 | Kami 三查 + design-qa-checklist + huashu 5 维 |

环节 2 的约束集是**沉淀物**：定义期产出一次，执行期多次复用。

## 分支 B：内容/媒介类 — 一次性五环节

同一五环节骨架，环节调用表按子分支不同：

| 环节 | B1 海报 | B2 杂志封面/插图 | B3 PPT/演示 |
| --- | --- | --- | --- |
| 0 意图 | 媒介/尺寸/渠道（小红书/抖音/印刷）+ 内容量（单焦点/多信息/密集——构图选择输入） | 开本/版式网格偏好 | 时长/页数/受众 |
| 1 调研 | Zine 路由表（R 主）+ 构图候选池（poster-compositions.md，内容量×情绪选主构图） | Zine 风格族 + Kami 封面版式 | 无（内容驱动） |
| 2 约束 | 风格配方→prompt + 构图约束（主构图1+辅助1+破格≤1） | 版式网格 + 图像配方 | 版式骨架 |
| 3 产出 | gpt-image-2 + kami | gpt-image-2（图）+ kami（版式） | guizang-ppt-skill |
| 4 校验 | Zine 风格一致性 + 构图 11 项验收 + Kami 三查 | 同左 | 密度/节奏检查 |

## 分支 C：通用/辅助类 — 查即走，不展开工作流

| 子分支 | 动作 | 调用 |
| --- | --- | --- |
| C1 组件/素材 | 直接检索引用 | Lucide / Google Fonts / Hero Patterns / 21st.dev / Uiverse（直引·兜底） |
| C2 动效 | 调用执行 | motion / motion-dev-animations / Anime.js |
| C3 文档排版 | 套约束产出 | Kami 骨架（C 规则）+ kami 技能 |

## 五环节通用定义（A/B 分支共用）

| 环节 | 动作 | 产物 | 查注册表 |
| --- | --- | --- | --- |
| 0 意图澄清 | 问询缺口（按场景细分），一次问完 ≤3 问 | Brief | 无（约束输入） |
| 1 调研定位 | 按分支查真实产品/风格，2-3 候选 + 理由 | 风格候选 | `角色=R` |
| 2 定义约束 | 把候选转译成可校验约束集（色/字/距/质感） | 约束集 | `角色=C` |
| 3 产出 | 调用执行工具，严格按约束集 | 产物 | `角色=E` |
| 4 校验 | 对照约束集自检；不达标回环节 2，不打补丁 | 达标/回炉 | `角色=V` |

**铁律**：参考必须**转译**成约束（环节 2），不能"看一眼"就产出。约束集可校验，画面不可。

## 品牌图形 / Logo 场景挂载（跨分支，环节 2/4 必读）

任务落在 **logo / App Icon / 品牌图形 / favicon** 时（无论走 A/B/C 哪个分支），环节 2 与 4 **必须读取 logo-generator 参考文档**——这是"生成时约束 + 生成后校验"的常驻参考，不是可选调研：

- **读取方式（GitHub 优先，本地兜底）**：优先从源仓库 `https://github.com/op7418/logo-generator-skill` 的 `references/` 读取（`design_patterns.md` / `background_styles.md` / `webgl_backgrounds.md`）；仓库下架或不可达时，读本地存档 `~/Desktop/Design/logo-generator-references/`（同名文件）。
- **环节 2（约束）**：读 `design_patterns.md` **Part 0**（8 条参数化底线：元素 ≤5-6 / 留白 ≥40% / 线宽 2.5-4px / 单焦点 / 结构稳定 / 圆角切割）转译进约束集；构图方向参考 Part 1-3 模式库（点阵/几何/线条/节点网络/字母抽象）；需多个候选方向时按 Part 5 的 6+ 变体分配策略
- **环节 4（校验）**：读同文件 **Part 4** 三层检查清单（视觉：平衡/留白/缩放 16→512/简洁/独特；技术：viewBox/currentColor/分组/defs；概念：相关性/故事性/多功能）逐项自检
- **展示背景**：配展示图或主视觉背景时读 `background_styles.md`（12 种规格 + 按产品类型/情绪/对比度/复杂度四维查表）；WebGL 动态背景兜底见 `webgl_backgrounds.md`
- 来源与退化链见 registry（C 规则·次 / V 规则·次）

## 问询协议（环节 0，按分支细分）

| 分支 | 必问项 |
| --- | --- |
| A1 APP | 平台（iOS/Android/双端）、目标用户、品牌色、交互范式偏好、**风格方向（开放指令时必问：参考库候选）** |
| A2 网页 | 类型（落地页/官网/工具）、受众、C/B 端、参考产品倾向 |
| A3 Mac | 目标系统版本、原生 vs 跨端、控件语义 |
| B1 海报 | 媒介（印刷/社交/屏幕）、尺寸比例、渠道、内容量（单焦点/多信息/密集） |
| B2 杂志 | 开本、版式网格偏好、图像风格倾向 |
| B3 PPT | 时长/页数、受众、格式（HTML/PPTX） |
| 通用 | 格式、渠道、受众、硬约束 |

已能从上下文推断的项跳过。**开放指令（用户未指定风格方向）时，风格问询为必问项，优先级最高**——先从 `~/resources/design-references.md` + registry.md 按场景分支筛候选给用户挑，禁止直接外部搜索定方向。

## 资源路由

**来源规则（铁律 6）**：所有引用的参考网站/技能/本地资源，必须标注**精确来源**（URL / 仓库地址 / 完整本地路径），禁止只写名称——换电脑后按来源可精确复现。

**优先级规则（铁律 7）**：**用户精选资产 > 外部参考**。环节 1 调研时，用户积累的参考库（`~/resources/design-references.md` 台账 + registry.md）是候选池主源，外部搜索（web_search）是兜底；退化链一律先本地资产后外部搜索。

**反同质化规则（铁律 8）**：环节 1 的 2-3 个候选**必须来自 ≥2 个不同风格桶**（minimal 极简现代 / editorial 编辑杂志 / darktech 暗色科技 / bold 撞色大胆 / warmpaper 暖纸人文 / liquid 液态动效 / dataviz 数据可视化 / retro 复古档案，桶定义见 registry.md），来源资源两两不同；refero 等真实产品库只能贡献 1 个候选。候选产出后必调 `design_diversity` 机器校验差异度（色相/字体/来源），PASS 才展示；FAIL 回炉。桶定位用 `design_route`（需求特征 → 推荐桶组合，含桶健康状态与差质降权标注），查资源用 `design_lookup`（输出标注 [桶 X] 与质量等级）。

**质量与维护规则（铁律 9）**：参考来源质量由**客观信号**后验决定（提取成功率/未验证比例/回炉率/可达性），**禁止以用户审美选择打分**。任务收尾调 `design_quality report` 记录（本地 `~/.pi/design-router-quality.json`（pi）/ `~/.dsh/design-router-quality.json`（DSH），不入 git）；环节 1 消费降权（lookup 差质沉底 / route 代表排除差质源）。参考网站增删改走 registry.md 维护协议，删站后查桶健康（🔴 空桶自动走查询指引兜底）。

**加载预算（铁律 10，防上下文烧穿）**：参考文件预算**分层**——各层独立计数，不是单一总账：
- **本 skill（design-references）自己的 references/：每环节 ≤3 个文件**（主层级 1-2 个 + 当前需要的 1 个；禁止一次读完全部 references/）
- **hallmark：走它自己的按需规则，独立子预算**——环节 1 读宏结构/theme 索引（不读全部 theme 详情）；环节 3 读 1 个 genre 文件 + 命中的组件原型（5-7 个封顶，这是 hallmark 的子预算，不计入上面 ≤3）；环节 4 读 slop-test。**禁止**预读 component-cookbook 全文、全部 21 theme、全部 genre（hallmark 自述这是它最大的 token 浪费点）
- **执行技能（kami/huashu 等）：各自按需**，只读当前环节直接要用的文件
- **design_lookup/design_route 输出优先**：能由工具返回的资源清单/桶组合不重复读 registry.md 全文
- 参考文件命中即用即弃：约束转译进环节 2 约束集后，源文件不再保留在上下文中
- 超限信号：若**本 skill 层**已读 >8 个文件而任务未到环节 2，先停——问自己"哪些是当前环节必须的"，丢弃其余再继续

```
[分支] × [环节] → 查 registry.md 对应格子：
  主层级 → 必须查；次层级 → 按需查；兜底 → 无匹配才查（禁止硬凑）
```

工具缺失时走退化链（见 registry 每条资源的退化链字段）：技能 → 网站 → 搜索 → 骨架规则人工应用。工作流不依赖任何特定技能。

新增资源前先登记进 registry.md（角色/形态/层级/适用场景/退化链五栏必填），站不住位置的不装；与现有资源同型的不装。

## Hallmark 协同（软依赖增强，未安装不影响本 skill）

**分工**：本 skill 是**路由 + 方法论层**（什么时候用谁、用什么参考、怎么约束）；Hallmark（`https://github.com/nutlope/hallmark`，可选安装）是**执行层**（怎么把参考/约束转成不像 AI 生成的页面）。两者不平行竞争，按环节归位：

| 本 skill 五环节 | Hallmark 资产归位 |
| --- | --- |
| 0 意图澄清 | 三问（Audience/Use case/Tone）并入本 skill 问询协议（Tone 补入风格方向问询） |
| 1 调研定位 | 21 宏结构（形态）+ 4 genre/21 theme（气质）进**统一候选池**，四维匹配分级选择（见 workflow.md 环节 1） |
| 2 定义约束 | genre/theme 决策 + anti-patterns 禁忌**前置转译进约束集**（C 角色，见 registry hallmark-anti-patterns） |
| 3 产出 | E 工具产出 + Hallmark build 纪律（enrichment/preview/stamp）+ 六条纪律（含 pre-emit 六轴自评，交付前跑） |
| 4 校验 | slop-test 58 gates（V 角色）+ 四段校验分层（机器/Kami 三查/Hallmark 视觉/design-qa） |

**选择裁决**：用户显式指令 > 参考驱动（真实产品优先）> Hallmark 形态/气质库 > catalog 静默兜底（仅用户 go ahead 时）。去 AI 味是**两段式**：anti-patterns 进环节 2 约束（前置防线），slop-test 在环节 4 验收（后置闸门）。

**pi 平台配套**：`design-router` extension（my-pi-skills `extensions/design-router/`）提供确定性工具——`design_research`（环节 1 确定性调研退化链）/ `design_route`（需求特征 → 风格桶组合，环节 1 反同质化第一步）/ `design_lookup`（统一候选池查询，差质沉底）/ `design_diversity`（3 候选差异度机器校验）/ `design_quality`（质量信号记录/查询，环节 4 收尾写）/ `design_audit`（机器层校验）/ `design_contrast`（对比度）/ `hallmark_study_fetch`（URL→DNA），并在设计任务时注入本协同说明 + hallmark 完整规则。候选验证升级路径：全局 CLI `dembrandt`（npm，真浏览器渲染精确 token + 规范 DESIGN.md，见 workflow.md 环节 1 硬步骤②）。

**DSH 平台配套**：`design-router` 插件（my-agent 预设挂载，源码在本仓库 `plugins/design-router/`）提供确定性工具——`design_lookup`（registry 三维索引查询，输出标注风格桶+质量等级，差质沉底）/ `design_route`（需求特征 → 推荐风格桶组合，含桶健康与差质降权，环节 1 反同质化）/ `design_diversity`（3 候选差异度机器校验）/ `design_quality`（质量信号记录/查询，任务收尾写，环节 1 读）/ `design_audit`（机器层校验，环节 4 必用）/ `design_contrast`（对比度）。原 pi 版另有 `design_research`（确定性调研）与 `hallmark_study_fetch`（URL→DNA 快验）未移植——DSH 分别用「本地台账 grep + refero 探测 + web_search」与「dembrandt / defuddle」退化链替代。候选验证升级路径：全局 CLI `dembrandt`（URL→设计 token，真浏览器渲染精确 token + 规范 DESIGN.md，见 workflow.md 环节 1 步骤 8）。

## 数据源

- 资源明细台账：`~/resources/design-references.md`（A-G 浏览视图 + 每条三维标注）
- 资源三维索引：`references/registry.md`（角色 × 形态 × 层级 + 退化链）
- 环节操作手册：`references/workflow.md`
- 视觉迭代/审计快速通道：`references/ui-quickfix.md`（环节 4 用；方向锁五维 + grep sibling 复用 + native exception + 中文 gut-feel 路由，源自 Waza /ui 方法论归位）
- 构图词典：`references/poster-compositions.md`（32 构图词条 × 内容量/情绪速查，B 海报写提示词、A 网页转 CSS 约束）
- 深度方法论：`refero Styles 网站`（https://styles.refero.design/，取真实产品设计系统；SPA 需浏览器——pi 平台用 ego-browser，DSH 用 web_search 探测或 dembrandt 验证升级）
