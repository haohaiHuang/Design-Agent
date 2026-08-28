# 资源注册表 — 三维索引

**维度**：`角色`（R调研源 / C约束模板 / E执行工具 / V校验标准）× `形态`（直引 / 转译 / 规则 / 工具）× `层级`（主 / 次 / 兜底）+ 适用场景 + **退化链** + **精确来源**。

**查法**：`[分支] × [环节] → 找对应格子`。主层级必查，次按需，兜底无匹配才查。
**填法**：新增资源先登记再使用；一条资源可占多行（每行一个格子），但每行只占一格。
**装前规则**：新增资源必须六栏全填（含**精确来源**——URL/仓库/本地路径，禁止只写名称）；与现有资源**同型**（同角色+同形态+同场景）的不装；站不住位置的不装。
**来源规则**：所有资源必须带可复现来源——换电脑后按来源（URL/仓库/路径）可精确找到，禁止仅凭名称。

> **本文件只存共通定义**（资源是什么、怎么用、来源在哪）。本机是否安装、装在哪 = 机器状态（DSH 无 skill-router：手动维护台账 `~/resources/design-references.md`，并同步 design_lookup 工具的数据 `plugins/design-router/data/registry.json`——registry.md 改动后需用 `node plugins/design-router/scripts/build-registry.mjs` 重生成，或手动同步）。

---

## R 调研源（环节 1：真实产品/作品，回答"别人怎么做的"）

| 资源 | 形态 | 层级 | 适用场景 | 退化链 | 精确来源 |
| --- | --- | --- | --- | --- | --- |
| refero Styles 网站（真实产品设计系统，150K+ 屏幕，网页浏览） | 转译 | 主 | APP / 网页 / Mac | → 用户参考库候选池（台账+registry）→ web_search | 网站 `https://styles.refero.design/`（SPA，需浏览器——DSH 用 web_search 探测 + dembrandt 验证升级，或人工） |
| Zine 风格库（52 个 AI 海报技能风格配方） | 转译 | 主 | 海报 / 杂志 | → 本地文件直读（无退化） | 本地目录 `~/Desktop/Design/zine-style-references/`（上游合集 README + 样图）；上游合集 `https://github.com/tluy/skill-zine-summary` |
| VoltAgent awesome-claude-design（68 个真实产品 DESIGN.md 合集） | 直引 | 次 | 网页 / Mac | → getdesign.md 官网 | `https://github.com/VoltAgent/awesome-claude-design`；`https://getdesign.md/` |
| dembrandt（URL→设计 token 提取 CLI：真浏览器渲染读 computed styles，产颜色/字体/间距/圆角/阴影/动效/组件 + DESIGN.md/DTCG/Tailwind/WCAG 多格式） | 工具 | 主 | APP / 网页 / Mac（环节 1 候选验证升级路径：需精确 token 直引 / JS 重站点 / defuddle 抽取不足时） | → defuddle（文本抽取，零依赖）→ web_search / 人工核对 | npm 全局 `dembrandt`（已装 v0.30.0，MIT）；command not found 时用绝对路径 `~/.npm-global/bin/dembrandt`；仓库 `https://github.com/dembrandt/dembrandt`；官网 `https://dembrandt.com/` |
| Beautiful UI（AI-native 界面范式） | 转译 | 次 | APP | → 官网浏览 → web_search | `https://www.beautifului.ai/` |
| Aceternity UI（落地页组件/区块范式） | 转译 | 次 | 网页 | → 官网浏览 → web_search | `https://ui.aceternity.com/` |
| 21st.dev（shadcn/ui 组件市场） | 转译 | 次 | 网页 | → 官网浏览 | `https://21st.dev/` |
| minimal.gallery（极简网页灵感） | 转译 | 兜底 | 网页 | → web_search | `https://minimal.gallery/` |
| Uiverse Galaxy（组件/按钮素材） | 直引 | 兜底 | 网页 | → 本地克隆 grep | `https://uiverse.io/` |
| orange-line-illustration（纽约客风编辑插画风格） | 转译 | 次 | 海报 / 杂志 | → 技能本地文件 | skill 仓库 `https://github.com/orange2ai/orange-line-illustration.git` |
| Lucide（图标库·首选） | 直引 | 兜底 | 通用 | → CDN 直引（无退化） | `https://lucide.dev/`；CDN `https://unpkg.com/lucide-static@latest/icons/<name>.svg` |
| Heroicons（图标库·补充） | 直引 | 兜底 | 通用 | → CDN 直引 | `https://heroicons.com/`；`https://cdn.jsdelivr.net/npm/heroicons@latest/24/outline/<name>.svg` |
| Google Fonts（字体源） | 直引 | 兜底 | 通用 | → CDN 直引 | `https://fonts.google.com/` |
| Hero Patterns（SVG 背景纹理） | 直引 | 兜底 | 通用 | → 官网复制 | `https://heropatterns.com/` |
| CSS 渐变工具 | 直引 | 兜底 | 通用 | → 官网 | `https://cssgradient.io/`（或同类） |
| DESIGN.md 格式规范（Google spec） | 直引 | 次 | 通用 | → 官网 | `https://getdesign.md/`；参考实现 `https://github.com/google-labs-code/design.md` |
| Liquid Gooey（React 液态 UI 效果库：Morph 粘性融合/果冻形变/接触溶解 + Move 液态拖尾） | 转译 | 次 | 网页动效（液态/粘性/果冻效果） | → 官网 demo 浏览 → web_search | 官网 `https://gooey.jakubantalik.com/`；npm `liquid-gooey`；仓库 `https://github.com/Jakubantalik/Libraries` |
| transitions.dev（30+ UI 过渡动画范式库：卡片缩放/数字弹跳/菜单折叠/3D 倾斜/Toast…） | 转译 | 次 | 网页动效（UI 过渡/微交互） | → 官网复制 → web_search | `https://transitions.dev/`（含 agent skill 集成） |
| vibeprompts.dev（Tailwind 营销区块库：Auth/Pricing/Features-Bento/Hero/CTA/Stats/Nav） | 转译 | 兜底 | 网页（Tailwind 区块，与 Aceternity/21st.dev 同型） | → 官网浏览 → web_search | `https://vibeprompts.dev/` |

## C 约束模板（环节 2：规则/令牌，回答"我们怎么做"）

| 资源 | 形态 | 层级 | 适用场景 | 退化链 | 精确来源 |
| --- | --- | --- | --- | --- | --- |
| Kami 约束骨架（十条不变量 + 设计令牌） | 规则 | 主 | 通用排版（所有场景常驻） | → Kami 轻量版 README → 十条不变量心法手动应用 | 本地目录 `~/Desktop/Design/kami-design-principles/`（README.md + design-tokens.css，自 kami 技能 references/design.md 提取） |
| Kami 完整设计规范 | 规则 | 主 | 文档 / 网页 | → 本地文件直读（无退化） | skill 仓库 `https://github.com/tw93/Kami`（规范在 `references/design.md`） |
| Zine 风格族配方（从风格库提炼的色板/质感/排版规律） | 转译 | 主 | 海报 / 杂志 | → style-families.md 直读 | 本地 `~/Desktop/Design/zine-style-references/style-families.md`（⚠️ 该文件是提炼资产，可能未生成——需要时从上游 52 skill README 提炼） |
| DESIGN.md（选定参考的设计系统文件） | 直引 | 主 | APP / 网页 / Mac | → refero 网站网页浏览拿 / getdesign.md | refero 网站（见上）；`https://getdesign.md/` |
| dembrandt 萃取产物（`--design-md` → google-labs 规范 DESIGN.md；`--dtcg` → W3C DTCG tokens） | 直引 | 次 | APP / 网页 / Mac（选定候选验证后的约束素材，等同 refero 网站 DESIGN.md，可回填参考台账） | → refero 网站网页浏览拿 DESIGN.md / getdesign.md | 本地运行 `dembrandt <url> --design-md --save-output` 落盘 `output/<domain>/`；仓库 `https://github.com/dembrandt/dembrandt` |
| design-md-skill（Google spec 生成器） | 工具 | 主 | APP / 网页 / Mac（约束生成） | → 手动写约束集（遵循 workflow.md 格式） | skill 仓库 `https://github.com/s-a-s-k-i-a/design-md-skill`；CLI `@google/design.md`（npm） |
| huashu-design 设计哲学（20 条，含反 AI slop） | 规则 | 次 | 网页 / 通用 | → 技能本地文件 | skill 仓库 `https://github.com/alchaincyf/huashu-design` |
| brand-guidelines / theme-factory（anthropics） | 规则 | 兜底 | 通用 | → 手动应用品牌准则 | `https://github.com/anthropics/skills` |
| logo-generator 设计模式库（8 条参数化原则 + 构图模式 + 检查清单） | 规则 | 次 | logo / App Icon / 品牌图形 | → 上游仓库 → 原则人工应用 | 源 `https://github.com/op7418/logo-generator-skill`（`references/design_patterns.md`）；不可达时读本地存档 `~/Desktop/Design/logo-generator-references/design_patterns.md` |
| logo-generator 背景风格库（12 种展示背景规格：色值/噪点/纹理/氛围/饱和度） | 转译 | 次 | 海报 / 展示图 / logo showcase 背景 | → GitHub 直读 → 本地兜底 | 源 `https://github.com/op7418/logo-generator-skill`（`references/background_styles.md`）；不可达时读本地存档 `~/Desktop/Design/logo-generator-references/background_styles.md` |
| logo-generator WebGL 动态背景规格 | 规则 | 兜底 | 网页动态背景 / C2 动效 | → GitHub 直读 → 本地兜底 | 源 `https://github.com/op7418/logo-generator-skill`（`references/webgl_backgrounds.md`）；不可达时读本地存档 `~/Desktop/Design/logo-generator-references/webgl_backgrounds.md` |
| hallmark anti-patterns 约束集（反 AI 生成禁忌：默认字体/渐变文字/emoji 图标/编造指标/假 chrome/标题斜体/transition-all/重绘 UI chrome…） | 规则 | 次 | 网页 / 通用（去 AI 味**前置约束**，环节 2 常驻，产出前转译进约束集） | → skill 本地文件直读（软依赖，未安装则跳过，靠 Kami 骨架兜底） | `https://github.com/nutlope/hallmark`（`references/anti-patterns.md` + `typography.md`/`color.md`/`layout-and-space.md`/`motion.md`/`copy.md`） |
| hallmark genre 允许/禁止清单（editorial / modern-minimal / atmospheric / playful 各自的允许项与禁止项） | 规则 | 次 | 网页 / 通用（按 genre 信号加载对应文件） | → skill 本地文件直读（软依赖，未安装则跳过） | `https://github.com/nutlope/hallmark`（`references/genres/*.md`） |
| interfaces cheat-sheet 约束集（数值/配方级 craft：只用 woff2 / 语义 token 分层（禁按外观命名/跨角色复用）/ 按钮按压 0.95-0.98 / 图标 cross-fade / hit-area 24-44-40 / hover 包 @media (hover:hover) / text-wrap balance+pretty / 逻辑属性 / 智能标点 / 文案动词开头+每流程一词 / 对比度按实际渲染背景） | 规则 | 次 | 网页 / 通用（细节级 craft，环节 2 转译；机器子集已由 design_audit 的 CS-* 检查覆盖） | → 官网直读（静态文档） → 人工应用 | 官网 `https://interfaces.dev/cheat-sheet`；机器子集 DSH 版见 `https://github.com/haohaiHuang/my-pi-skills`（`extensions/design-router/checks/cheat.ts`） |

## E 执行工具（环节 3：能动手的技能）

| 资源 | 形态 | 层级 | 适用场景 | 退化链 | 精确来源 |
| --- | --- | --- | --- | --- | --- |
| kami 技能（WeasyPrint 排版 → HTML/PDF） | 工具 | 主 | 文档 / 海报排版 / 网页 | → 手写 HTML 遵循令牌 | `https://github.com/tw93/Kami` |
| huashu-design（HTML 高保真原型/幻灯片/动画） | 工具 | 主 | 网页 / 通用 | → kami / 手写 HTML | `https://github.com/alchaincyf/huashu-design` |
| baoyu-design（HTML 设计产物：mockup/deck/落地页） | 工具 | 次 | 网页 / 通用 | → huashu-design | 仓库 `https://github.com/JimLiu/baoyu-design`（注意：非 baoyu-ai，npm 无包） |
| frontend-design（anthropics/skills） | 工具 | 次 | 网页 / Mac | → 手写 HTML/CSS | `https://github.com/anthropics/skills`（skill 路径 `skills/frontend-design/`） |
| gpt-image-2（图像生成/编辑） | 工具 | 主 | 海报 / 杂志插图 | → 其他绘图工具 | 源仓库 `https://github.com/Wangnov/gpt-image-2-skill` |
| imagegen（openai/skills 官方图像生成） | 工具 | 次 | 海报 / 杂志插图 | → gpt-image-2 | `https://github.com/openai/skills`（skill 路径 `skills/imagegen/`） |
| Figma 家族（openai/skills：generate/implement/design-system-rules） | 工具 | 次 | APP / 网页 | → HTML 原型 | `https://github.com/openai/skills`（skills/figma-*） |
| guizang-ppt-skill（横向翻页网页 PPT） | 工具 | 主 | PPT | → kami slides 路径 | `https://github.com/op7418/guizang-ppt-skill` |
| motion（Motion.dev 官方，动效） | 工具 | 次 | 通用（网页动效） | → motion-dev-animations / CSS 动画 | `https://github.com/motiondivision/motion`（⚠️ 该仓库为 JS 库非 skill，且与 motion-dev-animations 同型，按装前规则不装） |
| motion-dev-animations（动效补充） | 工具 | 兜底 | 通用（网页动效） | → CSS 动画 | `https://github.com/199-biotechnologies/motion-dev-animations-skill` |
| Anime.js（动效补充） | 工具 | 兜底 | 通用（动效） | → motion | `https://animejs.com/` |
| hyperframes（HTML 渲染视频/动画） | 工具 | 次 | 通用（视频） | → 静态 HTML 分段 | `https://github.com/heygen-com/hyperframes` |
| diagram-design（架构/流程/图表 SVG） | 工具 | 次 | 通用（图表） | → 手写 SVG | `https://github.com/cathrynlavery/diagram-design` |
| theme-factory / brand-guidelines / canvas-design / algorithmic-art（anthropics） | 工具 | 兜底 | 通用 | → 手动应用 | `https://github.com/anthropics/skills` |
| OpenAI imagegen（官方图像） | 工具 | 兜底 | 海报 / 杂志 | → gpt-image-2 | `https://github.com/openai/skills`（skills/imagegen/） |
| OpenMotion（AI 动效导演工具：描述→可编辑场景计划→canvas+timeline→导出视频/WebM/HTML；免费，兼容 Claude Code/Codex 订阅） | 工具 | 次 | 视频动效（品牌片/产品视频/logo 动效/说明片） | → hyperframes（HTML 渲染） → 手动视频工具 | 官网 `https://openmotion.design/`（macOS/Windows） |

## V 校验标准（环节 4：检查清单）

| 资源 | 形态 | 层级 | 适用场景 | 退化链 | 精确来源 |
| --- | --- | --- | --- | --- | --- |
| Kami 三查（取色 R≥G>B / 品牌色面积 ≤5% / 页面密度 60-80%） | 规则 | 主 | 通用排版 | → 取色器 + 目测 → 三条规则人脑执行 | 本地 `~/Desktop/Design/kami-design-principles/README.md`（三查章节） |
| huashu 5 维评审（设计成品多维度审查） | 规则 | 主 | 网页 / 通用 | → Kami 三查 + 人工评审 | `https://github.com/alchaincyf/huashu-design`（5 维评审章节） |
| Zine 风格一致性自检（对照选定风格族的色板/质感/排版核对） | 规则 | 次 | 海报 / 杂志 | → 人工对照 style-families.md | 本地 `~/Desktop/Design/zine-style-references/style-families.md` |
| design-qa-checklist（UI QA 清单） | 规则 | 主 | APP（交互可用性） | → 手动过导航/状态/反馈三问 | skill 仓库 `https://github.com/Owl-Listener/designer-skills`（子技能 `design-ops/skills/design-qa-checklist/`） |
| 设计研究 UX 方法（interview/empathy/journey/affinity/usability 等 11 个） | 规则 | 主 | APP / 网页（UX 调研） | → 手动走方法步骤 | 同上仓库 `https://github.com/Owl-Listener/designer-skills` 的 `design-research/skills/` |
| logo-generator 图形质量底线（元素 ≤5-6 / 留白 ≥40% / 线宽 2.5-4px / 单焦点 / 缩放 16-512） | 规则 | 次 | logo / App Icon / 品牌图形 | → 上游仓库 → 原则人工应用 | 源 `https://github.com/op7418/logo-generator-skill`（`references/design_patterns.md` Part 0 + Part 4）；不可达时读本地存档 `~/Desktop/Design/logo-generator-references/design_patterns.md` |
| hallmark slop-test 58 gates（去 AI 味**验收**：视觉/结构/动效/多样性/布局安全/排版/输入态/对比度/导航页脚/诚实文案/chrome/token 纪律/响应式非谈判项） | 规则 | 次 | 网页 / 通用（产出后校验；机器可判定子集已由 DSH 的 design_audit 工具合并执行） | → skill 本地文件直读（软依赖，未安装则靠 Kami 三查 + 机器扫描兜底） | `https://github.com/nutlope/hallmark`（`references/slop-test.md`）；机器子集 DSH 版见 `https://github.com/haohaiHuang/my-pi-skills`（`extensions/design-router/checks/`） |

---

## 登记空白区（缺格子 — 待补/待增强）

| 格子 | 状态 | 动作 | 候选 |
| --- | --- | --- | --- |
| R·海报场景·主 | 已有 Zine 风格库 | 无缺 | — |
| R·杂志场景·主 | 已有 Zine 风格库 | 无缺 | — |
| R·Mac 场景·主 | refero 已覆盖（2000+ 产品含桌面） | 无缺 | — |
| R·UX 研究方法 | ✅ 已补（design-research 组 11 个方法） | 无缺 | — |
| C·APP 场景·约束模板 | ✅ 已补（design-md-skill：Google spec 生成器，支持 --no-figma） | 无缺 | — |
| V·APP 场景·校验 | ✅ 已补（design-qa-checklist） | 无缺 | — |
| E·Mac 场景·执行 | 依赖通用工具，无原生 SwiftUI 执行链 | 待评估 | frontend-design / 原生 |

## 安装裁定（决策记录 — 为什么装/不装，共通判断）

| 资源 | 裁定 |
| --- | --- |
| Owl-Listener/designer-skills | ✅ 精选安装（非同型全装，只取缺口子技能）：design-qa-checklist + design-research 组 11 个 |
| s-a-s-k-i-a/design-md-skill | ✅ 安装（Google spec 生成器，替代 wenyen-hsu 版） |
| wenyen-hsu/design-md-skill | ⛔ 不装（无 SKILL.md + Figma 依赖，已被 s-a-s-k-i-a 版替代） |
| VoltAgent awesome-claude-design | ⛔ 不装（与 refero 同型：R 查询类）；仅登记，需要时拉到 Design 文件夹作离线补充 |
| anthropics brand-guidelines / theme-factory / algorithmic-art | ⛔ 不装（增强非补缺）；仅登记，按需再装 |
| openai imagegen | ⛔ 不装（与 gpt-image-2 同型重合）；仅登记 |
| frontend-design（anthropics） | 🔶 待评估（E·Mac 执行缺格候选） |
| motion（motiondivision/motion） | ⛔ 不装（JS 库非 skill，与 motion-dev-animations 同型）；仅登记 |
| dembrandt CLI | ✅ 已装（全局 npm v0.30.0，候选验证升级工具：真浏览器渲染 vs defuddle 文本抽取，非同型；pi 上 v0.28.0 实测 linear.app 验证通过） |
