# 环节操作手册 — 五环节动作序列 × 资源调用 × 退化链

> 配合 SKILL.md 路由使用。每环节：目标 → 动作序列 → 资源调用（主→次→兜底）→ 产物格式 → 退化链。
> 铁律 1：参考必须转译成约束（环节 2），不"看一眼"就产出。
> 铁律 2：信息不全先问询（≤3 问），禁止跳过环节 0。
> 铁律 3：**每个环节产出必须先展示给用户确认，确认后才进下一环节。禁止连续产出多份设计稿再让用户一起看。**
> 铁律 4（冲突裁决）：**显式用户指令 > 既有资产 > 外部参考**。发现资产/参考与显式指令冲突时，标为冲突项展示给用户裁决，禁止悄悄继承、也禁止悄悄改。
> 铁律 5（认真参考）：参考不是"看看"，是"萃取"——完整 DESIGN.md 的每个 section 都要读出具体数值，缺一个 section 不算调研完。禁止凭印象发挥。

---

## 工具层 · OpenPencil CLI（软依赖，可选增强）

**前置**：需安装 `npm install -g @open-pencil/cli` 才能启用本层；**未安装时跳过本层全部命令**，流程不受影响（软依赖）。职责：**操作 .fig/.pen 设计文件**——参考为设计文件时直读精确 token（源数据证据等级最高），产物为设计文件时机器校验。只在产物/参考为设计文件时接入，不改变五环节骨架；各环节接入点命令见 pi 版 skill（my-pi-skills `skills/design-references/references/workflow.md` 工具层），DSH 版不再展开——未装 openpencil 的用法一律走退化链：参考 .fig → Figma 家族技能/人工核对；产物 .fig → 导出 PNG 人工核对。

---

## 环节 0 · 意图澄清 → Brief

**目标**：把一句话需求变成可执行的四要素 Brief。

**动作序列**：

0. **形态判定（必做第一步，先于一切）**：从技术栈/README/平台关键词判断产物形态：
   - 技术栈含 Electron/Next.js desktop → 桌面应用（产出需模拟窗口，红黄绿交通灯/标题栏）
   - 技术栈含 SwiftUI/AppKit + macOS → macOS 原生应用
   - 纯 HTML/CSS/JS + 无 Electron → 网页
   - 技术栈含 React Native/Flutter/iOS → 移动端（产出需模拟手机框）
   - 图像/印刷任务 → 画布（需定尺寸/媒介）
   - 判断不了 → 问用户，禁止默认当网页
1. 识别场景分支（A/B/C）
2. **盘点项目已有设计资产**（关键！）：若项目已有设计系统/token/品牌资产 → 继承，这是最高优先级参考，禁止"推翻重来"
3. **冲突扫描**：盘点时检查资产是否违反已知显式规则（no-emoji/no-gradient/用户明确要求等）→ 违反则列为冲突项展示，用户裁决后执行（铁律 4）
4. 按分支问询缺口（见 SKILL.md 问询协议），已推断的跳过
5. **风格方向问询（关键，开放指令必做）**：用户未指定风格时（如“做个 XX”“升级一下”），必须问一次：“你参考库里有没有想用的风格方向？”（≤3 问额度内，优先级最高）——先从 `~/resources/design-references.md` 台账 + `references/registry.md` 按场景分支筛候选给用户挑，禁止直接外部搜索定方向。
6. 输出 Brief：格式 / 渠道 / 受众 / 目标 / 硬约束
7. **形态核对**：确认产物形态（Mac 应用 → 模拟窗口；网页 → 页面；海报 → 画布）——形态错误是最低级却最常见的错误

**产物格式**：

```
场景: A1 APP | 格式: 移动端 UI | 受众: 泛 C 端 | 目标: 转化 | 硬约束: 品牌色已定/双端
已有资产: White Index v0.2 token | 形态: macOS 窗口模拟
```

**资源调用**：无（约束输入）。

**退化链**：无（问询本身就是最轻动作；拒绝用户时给出选项而非空手退出）。

---

## 环节 1 · 调研定位 → 2-3 风格候选

**目标**：拿到 2-3 个真实风格方向候选，每个带 token 草稿（色/字/距/质感）+ 适用理由。**候选必须跨风格桶、来源互异，禁止同质化**。

**动作序列**：

1. **盘点已有资产**（承接环节 0）：项目已有设计系统 → 它就是主参考，外部参考只做增强；无系统才从零调研
1b. **需求路由（反同质化第一步，必做）**：先调 `design_route <需求特征关键词>` 拿推荐风格桶组合（主桶必查 + 次桶按需）。需求特征 = 品类/气质/内容类型（如"SaaS 落地页"→ 主桶 minimal，次桶 darktech/editorial）。拿不准关键词时直接传需求原文，工具返回全部 8 桶由你挑。
2. **硬调研步骤（DSH：用 `design_lookup <branch> <stage>` 查注册表 + 本地台账 grep + refero 探测 + web_search）**：先跑确定性调研取候选池——本地台账（`~/resources/design-references.md` 按关键词 grep）→ refero 网站（web_search 探测 `styles.refero.design` 同品类） → web 搜索，每层带**证据来源**。**禁止仅凭模型内建知识直接选风格**——候选必须来自调研输出并标注证据；所有外部层失败才允许声明"无真实参考可查"并按 Kami 骨架执行。
3. **统一候选池（优先于一切外部搜索；真实产品 + Hallmark 形态/气质库同池）**：在调研输出的真实候选基础上，补 Hallmark 组合候选：
   - **真实产品参考**：`~/resources/design-references.md`（台账）+ `references/registry.md` 按场景筛 2-3 个；用户指定风格则直引对应资源。**用户精选资产永远在外部随机搜索结果之前。**
   - **Hallmark 形态/气质库**（软依赖，已装 hallmark 时可用）：21 宏结构 = **形态**维度（页面形状：Bento/Stat-Led/Manifesto…）；4 genre + 21 theme = **气质**维度（editorial/modern-minimal/atmospheric/playful + 具体配色字体）。作为预打包的"形态+气质"实例进同池。
   - 每个候选标注：`形态分 × 气质分 × 行业分 × 防重分`（四维见下方分级表）+ **来源桶 + 来源资源**（design_route 定位、design_lookup 标注）。
   - **选择优先级**：行业+形态+气质全中（真实产品）> 形态+气质（真实产品或 Hallmark 组合）> 只有气质（theme/genre）> 只有形态（macrostructure）> 兜底（catalog 静默，仅用户 go ahead 时）。
3b. **候选多样性硬规则（反同质化核心，必守）**：
   - **3 个候选必须来自 ≥2 个不同风格桶**（桶见 registry.md 或 design_route 输出），来源资源两两不同
   - **refero 等真实产品库只能贡献 1 个候选**（它占"极简现代"桶）；其余候选从其他桶取（zine/kami/hallmark 主题等）
   - 候选间**色相/字体气质/布局骨架至少两维不同**（如：极简冷色无衬线 × 暖纸衬线 × 暗色霓虹展示）
   - 产出 3 候选后**必调 `design_diversity <c1> <c2> <c3>` 机器校验**，PASS 才展示给用户；FAIL 回炉换掉同质候选
   - 每个候选标注「来源桶 + 来源资源 + 证据」，供用户追溯
4. **参考萃取（必须逐 section 读出数值，禁止摘要式浏览）**：完整 DESIGN.md 的每个 section 都要读并记录：
   - Colors → 每色 hex + 角色 + 适用场景
   - Typography → 每种字体的字号/字重/字距/适用场景
   - Spacing / Radius / Shadow → 具体数值档位
   - Do / Don't → 全清单逐条记录
   缺一个 section 就不算调研完，补完才进候选展示
4b. **参考为 .fig/.pen 文件时（源数据直读，最高证据等级）**：已装 openpencil 则直读精确 token（`analyze colors/typography/spacing`/`variables`/`info`，命令见 pi 版工具层）；未装走 Figma 家族技能或人工核对。结果等价于 DESIGN.md 的 Colors/Typography/Spacing 三 section 且数值精确到 hex。
5. 分支 A：**探测 `https://styles.refero.design/` 搜同品类真实产品**（SPA 需浏览器——DSH 无 ego-browser；用 web_search 查该站/该品类的 DESIGN.md 或走 dembrandt 验证升级）→ 拿完整 DESIGN.md（仅在用户参考库无可匹配候选时）；分支 B：Zine 路由表定位风格族 → 读族详情，**再按内容量×情绪查 `references/poster-compositions.md` 速查表选构图**（主构图 1 个 + 辅助关系 1 条）
6. **搜索失败时走决策树**（见下方「搜索失败决策框架」）
7. 每个候选记录 token 草稿 + 理由（供环节 2 直接消费）
8. **候选验证（DSH 硬步骤：对选中的 2-3 个候选逐一验证，退化链——本地 .fig 直读（openpencil，未装走 Figma 家族/人工核对）> `dembrandt <url> --design-md --save-output`（已装 v0.30.0，真浏览器渲染，产精确计算值 + google-labs 规范 DESIGN.md，落 `output/<domain>/`；command not found 时用绝对路径 `~/.npm-global/bin/dembrandt`）→ `defuddle parse <url> --md` 文本抽取（已装）→ web_search → 人工核对）**：
   - **候选是本地 .fig/.pen 文件**（用户参考库里的设计稿）→ openpencil 直读，**跳过 URL 抓取**（源数据比渲染推断更精确）；未装 openpencil → Figma 家族技能或人工核对
   - **候选是 URL** → dembrandt 渲染取精确 token（首选）；dembrandt 不可用时 defuddle 抽取文本结构信号
   验证成功（任一引擎拿到精确值）→ 该候选可"直引"（萃取具体数值进约束，dembrandt/openpencil 验证的可直接回填参考台账）；验证失败/抓不到 → 标注"未验证"，只能"属性级借用"（如"暗色仪表盘式"），禁止把未验证候选当直引参考。验证结果一并展示给用户。
9. **展示给用户选（强制）**：用户选定方向后，才能进环节 2。禁止自行拍板。开放指令（用户未指定风格）时此步为硬门槛，候选必须来自用户参考库优先。
9b. **候选可视化询问（DSH 增强，每次展示候选后必问）**：候选仅凭文字难感知差异时，主动询问用户
    「要不要先为 2-3 个候选各做一版 HTML 快速可视化 demo（灰模/占位级，按各候选 token 草稿的
    色/字/距呈现，几分钟内完成，只为辅助选择）？」同意 → 先做 demo 展示，看完再选；拒绝/直接选 → 跳过。
    demo 是辅助选择的手段，不是最终交付物——选中方向后进环节 2 定约束，完整实现仍在环节 3 按约束集做。

**产物格式**：

```
候选1: {来源桶: minimal/refero | 来源: 用户参考库/refero网站/Linear | 气质: 极简 | token草稿: 色#4F46E5系/Inter/间距4pt | 理由: 同品类标杆 | 与已有资产匹配度: 高/中/低}
候选2: {来源桶: warmpaper/kami | 来源: kami 暖纸 | 气质: 暖纸衬线 | token草稿: 色#1B365D墨蓝/衬线/暖纸底 | 理由: 书卷气排版 | 与已有资产匹配度: 高/中/低}
候选3: {来源桶: darktech/cobalt | 来源: hallmark cobalt 主题 | 气质: 暗色科技 | token草稿: 色#0F172A底/霓虹点缀/等宽 | 理由: 工具感 | 与已有资产匹配度: 高/中/低}
差异度: design_diversity 输出 PASS（3 桶 × 色相/字体互异）
```

**匹配精度分级**（四维：形态 × 气质 × 行业 × 防重，决定"命中"的定义）：

| 精度 | 定义 | 采用 |
| --- | --- | --- |
| 完美 | 同行业 + 同形态 + 同气质 | 第一优先 |
| 良好 | 同形态 + 同气质（行业可跨） | 推荐替身 |
| 可用 | 同形态（功能类似）或 同气质（视觉语言） | 可借用 |
| 不可用 | 形态不同且气质不同 | 弃用，继续降级 |

**防重维度（仅 Hallmark 来源候选）**：查 `.hallmark/log.json` 或 CSS 顶部 `/* Hallmark · macrostructure/theme */` 戳，排除连续重复（同一项目连续两次输出不得共享宏结构；主题须满足 paper band / display style / accent hue 三轴至少一个不同）。

**参考类型决定精度需求**：视觉参考（色板/字体/质感）→ 气质匹配优先，行业可跨；UX 参考（流程/交互）→ 形态匹配必须，行业可跨。

### 搜索失败决策框架（直接搜不到时必走）

```
需求 → 直接搜索
  ├─ 命中(同行业+同形态) → 采用
  └─ 未命中 → ①换关键词（同义/双语/行业术语）→ 命中 → 采用
                └─ 未命中 → ②维度拆解
  ② 需求拆解成 4 维：行业 × 形态 × 气质 × 功能
     分维度搜索，按优先级：形态 > 气质 > 行业 > 功能
     命中(形态+气质匹配) → 采用（行业可不同）
                └─ 未命中 → ③跨维度替身
  ③ 找同气质不同形态的替身（品牌视觉语言可借用）
     - 视觉参考：气质必须同，形态/行业可跨
     - UX 参考：形态必须同，行业可跨
                └─ 未命中 → ④兜底
  ④ 声明"无真实参考可查" → 回归 Kami 约束骨架 → 告知用户
     （禁止凭空发挥，宁可不参考也不编造）
```

**资源调用**（按分支）：

| 分支 | 主 | 次 | 兜底 |
| --- | --- | --- | --- |
| A | 用户参考库候选池（台账+registry）→ refero Styles 网站（网页浏览） | Beautiful UI（A1）/ Aceternity（A2） | minimal.gallery |
| B | Zine 风格库（本地） | 构图词典（poster-compositions.md，内容量×情绪选主构图）+ orange-line-illustration | web_search |
| C | 不跑本环节 | — | — |

**退化链**（用户精选资产永远在外部随机之前）：用户参考库（`~/resources/design-references.md` + registry.md）→ **本地 .fig/.pen 设计稿（Figma 家族技能 / 人工核对）** → refero Styles 网站（web_search 探测）→ Beautiful UI / Aceternity / minimal.gallery → web_search → 禁止凭空发挥（告知用户无真实参考可查）。

---

## 环节 2 · 定义约束 → 可校验约束集

**目标**：把环节 1 候选转译成 ≤10 条可执行可校验的约束。

**动作序列**：

1. 取 Kami 十条不变量 + design-tokens.css 打底（所有场景常驻）
2. 从选定候选提取：色板（取色验证 R≥G>B 暖调）→ 字体栈 → 间距（4pt 基准）→ 质感规则
3. 分支 A 补交互约束层：导航/状态/反馈（A1 用 design-md-skill 生成 DESIGN.md；或从 Beautiful UI 范式转译）
4. 输出约束集：每条满足"可执行 + 可校验"，**每条标注来源**（参考 DESIGN.md 哪条规则 / Kami 哪条不变量 / 用户资产哪个 token）——禁止无来源的约束
5. **展示约束集给用户确认**，确认后才进环节 3

**产物格式**：

```
约束集:
1. 底色 #f5f4ed 暖调（禁纯白/冷灰）〔来源: Kami 不变量1〕
2. 唯一彩色 --brand（面积 ≤5%）〔来源: Kami 不变量2 / 用户品牌色 #4A3728〕
3. 字体: serif 400/500 两档（禁加粗/斜体）〔来源: Kami 不变量5〕
...
```

**资源调用**：Kami 骨架（C 规则·主·常驻）→ refero 网站选定的 DESIGN.md（C 直引·网页浏览取得）→ **参考为 .fig 时已装 openpencil 则直接导出其 token 集合转译为约束（C 数据·次·软依赖，命令见 pi 版；未装走 Figma 家族/人工核对）** → **参考为 URL 时 `dembrandt <url> --design-md` 萃取产物可直接作约束来源（C 数据·次·已装 v0.30.0）** → design-md-skill（C 生成·A1）→ Zine 族配方（C 转译·B）→ **构图词典（C 转译：B 海报 = 主构图1 + 辅助1 + 破格≤1 + B 配方标签 + 避坑禁项；A 网页 = hero/首屏单屏构图用落地页子集 03/05/13/16/17/25/26/27/02，页面级结构仍用 Hallmark 宏结构——两层正交：宏结构管页面区块节奏，词典管单屏画面组织；来源 poster-compositions.md）**→ **logo/icon 任务必读 design_patterns.md Part 0（C 规则·次：GitHub 源 `op7418/logo-generator-skill` 优先，本地存档 `~/Desktop/Design/logo-generator-references/` 兜底）**→ **去 AI 味前置约束（hallmark 已装且任务为网页/通用时，转译进约束集并标注来源）：anti-patterns.md 禁忌清单 + 对应 genre 的允许/禁止清单（C 规则·次·软依赖，见 registry hallmark-anti-patterns / hallmark-genre-bans）**→ **动效约束（产物含交互/动效时必转译，来源 emilkowalski/skills 动效原则——频率分级/缓动决策序/时长表/物理感，见 pi 版 inject-map.md craft 约束 Animation 条目，本次修订同步；机器子集 EM-* 已进环节 4 audit）**。

**退化链**：Kami 骨架文件 → Kami 轻量版 README（本地）→ 十条不变量心法手动应用。

---

## 环节 3 · 产出 → 实际产物

**目标**：严格按约束集产出，禁止临场发挥。

**动作序列**：

1. 按分支调 E 工具（见 SKILL.md 分支 B 表 + registry E 角色）
2. **CSS/HTML 中逐条约束加注释标注**（每条约束对应的代码块前写 `/* 约束N */`）
3. **素材硬性规则**：
   - 图标一律从台账直引（Lucide / Heroicons），**禁止手写 SVG、禁止 emoji**
   - 字体从 Google Fonts 直引，禁止默认字体
   - 检查项目既有 DESIGN.md / 规则文件里的 no-emoji / no-gradient 等禁令并执行
4. **形态执行**：严格按环节 0 确认的形态（Mac 窗口 / 页面 / 画布）实现
5. 产出后对照约束集自查一遍再交付

**资源调用**（按分支）：

| 分支 | 执行工具 |
| --- | --- |
| A | kami（排版）/ huashu-design（HTML 高保真）/ Figma 家族 / motion（动效）/ **openpencil（软依赖，已装时可用作 HTML↔.fig 转换/批量建组件，命令见 pi 版；未装跳过）** |
| B1 海报 | gpt-image-2（图像）+ kami（排版） |
| B2 杂志 | gpt-image-2（插图）+ kami（版式网格） |
| B3 PPT | guizang-ppt-skill |
| C1 素材 | Lucide / Fonts / Patterns 直引 |
| C2 动效 | motion / motion-dev-animations |
| C3 文档 | kami 技能 |

**退化链**：对应技能 → 手写 HTML/任何绘图工具遵循令牌 → 任何能产出内容的工具。

---

## 环节 4 · 校验 → 达标/回炉

**目标**：对照约束集自检，不达标**回环节 2 改约束**（不打补丁）。

**动作序列**：

1. **机器化扫描（必做，禁流于形式）**：
   - 色值白名单：grep 全部 hex，非约束色值逐一解释（禁混入无关色）
   - emoji 扫描：`grep -P '[\x{1F300}-\x{1FAFF}]'` 或 python 检查，项目有 no-emoji 规则必须为 0
   - 字重扫描：grep font-weight，禁 700/600/450（除非约束允许）
   - 圆角扫描：grep border-radius，核对与约束的档位一致
   - 渐变/阴影扫描：grep gradient/box-shadow，核对约束允许范围
1b. **产物为 .fig/.pen 时（design_audit 只管 HTML/CSS，设计文件走 openpencil）**：已装 openpencil 则机器校验（`lint`/`analyze colors --threshold 5`/`analyze spacing --grid 8`/`analyze clusters`/`export -f png --thumbnail`，命令见 pi 版工具层）——覆盖命名/auto-layout/硬编码色/无障碍对比度/色板一致性/间距网格/组件化程度/视觉评审截图；任一不达标 → 回环节 2 改约束，与 HTML 产物同一裁决。**未装 openpencil → 导出 PNG + Figma 家族技能或人工核对**。
2. Kami 三查：取色 R≥G>B / 品牌色面积 ≤5% / 页面密度 60-80%
3. 风格一致性：逐条核对约束集（色板/质感/排版）；分支 B 补构图验收（poster-compositions.md 11 项：入口/焦点/主次比例/共同边线/沟槽/留白/破格≤1/图文层级/裁切安全/响应式）
4. 分支 A 补 UX QA：导航/状态/反馈可用性（design-qa-checklist）
5. 成品视觉评审（huashu 5 维；无头浏览器渲染截图 + 视觉模型复核）
6. 任一不达标 → 明确写"回环节 2：改哪条约束"，不静默打补丁
7. **自检结果展示给用户**（扫描输出 + 对照表），让用户看到每项的依据
8. **质量信号记录（环节 4 完成后、收尾前，必做）**：对本任务用到的参考来源逐个调 `design_quality report`，按客观信号定档：
   - dembrandt/defuddle 验证成功且一次通过 → `良`（多次累积升 `优`）
   - 提取部分失败/候选标注"未验证" → `中`
   - 环节 4 FAIL 且回炉 2 次仍不过 → `差`
   - 网站不可达/404 → `差`
   - **禁止以用户审美选择定档**（偏好主观）；只依据机器可验证信号
   - 记录后，下次环节 1 该来源自动降权（lookup 沉底 / route 排除代表）

**产物格式**：

```
校验结果: PASS / FAIL
机器扫描: 色值10个全在约束白名单 ✅ | emoji 0 ✅ | 字重 400/500 ✅ | 圆角 999/8/16 ✅ | 渐变 0 ✅
FAIL 项: {约束3: 品牌色面积超8% | 修正: 回环节2 收紧点缀色规则}
```

**资源调用**：Kami 三查（V 规则·主）/ huashu 5 维（V 规则·主）/ design-qa-checklist（V 规则·A）/ Zine 风格一致性（V 规则·B）/ 构图 11 项验收（V 规则·B，poster-compositions.md）/ **logo/icon 任务必读 design_patterns.md Part 4 图形质量底线（V 规则·次：GitHub 源优先，本地存档兜底）**。

**四段校验分层（每层管的东西不同，全跑）**：
1. **机器层**：`design_audit <target>`（my-agent 预设挂载的 DSH 工具：合并 hallmark 机器子集 + interfaces CS-* 8 条 + 环节 4 扫描 + 继承链对比度 + **动效 EM-* 子集**）跑可机器判定的 slop gates + 色值/emoji/字重/圆角/渐变扫描（合并了环节 4 机器扫描与 hallmark 机器子集）。动效 EM-*（grep 可查）：EM-1 `transition: all` / EM-2 入场 `scale(0)` / EM-3 UI 上 `ease-in` / EM-4 刻意动画用内置 `ease-out` / EM-5 UI 时长 >300ms 无理由 / EM-6 keyframes 用于 toast/toggle 等快速触发 / EM-7 动 width/height/margin/padding/top/left / EM-8 缺 `prefers-reduced-motion` / EM-9 hover 无 `(hover:hover) and (pointer:fine)` 门控 / EM-10 锚定弹层 `transform-origin: center`；来源 emilkowalski/skills（github.com/emilkowalski/skills，STANDARDS.md）。**机器实现映射**：EM-2/EM-3/EM-5 为 design_audit 独立 gate；EM-1 由 gate 10 覆盖、EM-7 由 gate 14 覆盖、EM-8 由 gate 27 覆盖（同语义不重复输出）；EM-4/6/9/10 为 grep 自查
2. **品牌层**：Kami 三查（取色 R≥G>B / 品牌色面积 ≤5% / 页面密度 60-80%）
3. **视觉层**：hallmark slop-test 58 gates 全量（V 规则·次·软依赖——机器子集已由第 1 层跑，视觉/上下文类由模型按 slop-test.md 自查：gate 6/8/28/29/31/32/35/36/44/45/52-54/56/57）+ **动效视觉自查**（EM-11 频率档匹配——高频区是否仍有动画 / EM-12 目的能否命名——说不出目的即删 / EM-13 crossfade 是否干净（脏则 blur(2px)<20px 遮盖）/ EM-14 stagger 30–80ms 节奏 / EM-15 退出路径与进入对称 / EM-16 慢放验证——2–5× 或 DevTools 动画检查器看缓动/原点/同步）；A 分支 hero/首屏可加构图 11 项自查（poster-compositions.md，与 gates 去重：焦点/主次比例/留白帮助阅读）
4. **UX 层**：design-qa-checklist（导航/状态/反馈可用性）

**退化链**：脚本检查 → 取色器 + 目测 → 三条检查规则人脑执行。

---

## 交付收尾与职责边界（环节 4 达标后）

**环节 4 达标即视为设计完成，进入收尾**，不再向下滑入开发：

- **交付物**：设计产物（HTML 原型/demo/幻灯片/信息图/动画）+ **设计规范文档 `designs/DECISION.md`**。
  归档到项目 designs/ 等子目录。
- **设计规范文档（收尾必生成，硬性要求）**：每次任务收尾**必须**写 `designs/DECISION.md`，四段结构：
  ```
  # DECISION.md — 设计决策与页面规范
  ## 1. Brief（环节 0）      场景分支/格式/受众/目标/硬约束
  ## 2. 候选与选择理由（环节 1）  2-3 候选（token 草稿+理由）+ 用户选定项与理由
  ## 3. 页面规范/约束集（环节 2） 最终确认的 ≤10 条约束，每条带来源标注
  ## 4. 校验结果（环节 4）    design_audit 输出 + Kami 三查对照 + PASS/FAIL
  ```
  规范供开发交接直接用，候选理由供追溯；该文档即开发交接包的主体。
- **默认不进入开发**：设计完成 ≠ 开始开发。除非用户**显式**要求（"开始开发/实现上线/继续做下去"），
  否则本流程止于设计交付——不写生产代码、不搭后端、不做工程化。
- **转开发的条件与方式**：用户要求开发时，`designs/DECISION.md` 作为开发交接包（含设计文件清单），
  建议交给开发 Agent/流程执行；不默认自己动手写生产代码。
- **收尾动作**：确认交付物齐全归档（designs/）+ DECISION.md 已生成 → 极简总结
  （做了什么、caveats、下一步可选方向，含"如需开发可转交"）。
