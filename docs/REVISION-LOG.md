# REVISION-LOG — 设计代理修订记录

本文件记录每次对设计代理（design-references 工作流）的修订点，供下次用 DSH 修订时直接定位、不需要从零读全部 skill 文件。

**修订方式**：每节说明「改了哪个文件、哪个位置、改成什么、为什么」。改完本仓库后同时同步 pi 版对应文件（见每节「pi 版同步」），或反之。

---

## 2026-09-01 · 动效维度补全（来源：emilkowalski/skills）

**背景**：emilkowalski/skills（github.com/emilkowalski/skills，34k stars）是动效决策框架 + 精确值表（频率分级/缓动决策序/时长表/物理感/反模式清单），100% 原则、0% 参考。设计工作流此前只有 interfaces.dev 的 5 行动效条目（缺决策层与反模式层）。本次不装技能（Skill=工作流/原则封装，与本工作流编排层重复），改为**提炼原则进环节 2 约束 + 环节 4 校验**。

### 改动 1：craft 约束 Animation 条目扩写（5 行 → 5 子块）

- **文件**：`skills/design-references/references/workflow.md`（本仓库）
- **pi 版同步**：`~/.pi/agent/extensions/design-router/inject-map.md` 的「细节级 craft 约束」段（注意：pi 版 craft 约束正文在 inject-map.md，不在 workflow.md）
- **位置**：细节级 craft 约束「Animation」条目
- **改成什么**：原 1 行（按压 scale/cross-fade/切主题禁过渡/will-change/不动画高频）扩为 5 子块：
  - **决策**：频率分级（100+/天禁动画 / tens/天近不可感知 / occasional 标准 / rare 才 delight）+ 目的六词（Feedback/Spatial consistency/State indication/Preventing jarring change/Explanation/仅 rare Delight）
  - **数值**：缓动决策序（进入退出→ease-out、屏内移动→ease-in-out、hover→ease、常速→linear、**UI 禁 ease-in**）+ 强曲线 `--ease-out: cubic-bezier(0.23,1,0.32,1)` + 时长表（按压 100-160ms / tooltip 125-200 / dropdown 150-250 / modal 200-500 / **UI <300ms**）
  - **物理感**：禁 scale(0)（→scale(0.9-0.97)+opacity:0）/ 弹层 origin 在触发器（modal 豁免）/ 按压 scale(0.95-0.98)+160ms ease-out / bounce 0.1-0.3
  - **实现**：只动 transform/opacity（clip-path 第 4 豁免）/ 高频触发用 transition 非 keyframes（可中断）/ 退出与进入对称 / 禁 transition:all / Motion 用完整 transform 字符串
  - **a11y**：reduced-motion 给「更少更缓」非归零 / hover 包 `(hover:hover) and (pointer:fine)` / velocity 判定滑动
- **为什么**：原条目只有「组件级微交互」层，缺「决策框架 + 精确值」层——正是 AI 最常错的地方（ease-in 入场、scale(0)、transition:all、时长 400ms）
- **注意**：interfaces.dev 旧条目按压 200ms 与 emil 160ms 冲突，已统一为 160ms（删 200ms）

### 改动 2：环节 4 新增动效 EM-* 校验（机器子集 + 视觉自查）

- **文件**：`skills/design-references/references/workflow.md`（本仓库，环节 4「四段校验分层」）
- **pi 版同步**：`~/.pi/agent/skills/design-references/references/workflow.md` 同位置 + `~/.pi/agent/extensions/design-router/inject-map.md` 环节 4 表格「①机器层 design_audit（含动效 EM-* 子集）+ 动效视觉自查」
- **位置**：环节 4 四段校验分层 ①机器层 和 ③视觉层
- **改成什么**：机器层加 10 条 grep 可查 gate（EM-1 `transition: all` / EM-2 `scale(0)` 入场 / EM-3 UI `ease-in` / EM-4 内置 ease-out 用于刻意动画 / EM-5 UI >300ms / EM-6 keyframes 用于快速触发元素 / EM-7 动布局属性 / EM-8 缺 reduced-motion / EM-9 hover 无 pointer 门控 / EM-10 锚定弹层 origin:center）；视觉层加 6 条自查（EM-11 频率档匹配 / EM-12 目的命名 / EM-13 crossfade 干净 / EM-14 stagger 节奏 / EM-15 退出对称 / EM-16 慢放验证）
- **为什么**：EM-1/2/3/5/7 现在 grep 就能查，可进 design_audit 机器子集（与 CS-* 并列）；视觉类靠模型自查，与 slop-test 平行不冲突

### 改动 3：环节 2 资源调用补动效约束来源

- **文件**：`skills/design-references/references/workflow.md`（本仓库，环节 2「资源调用」行尾）
- **pi 版同步**：`~/.pi/agent/skills/design-references/references/workflow.md` 同位置
- **改成什么**：在「去 AI 味前置约束」后追加「动效约束（产物含交互/动效时必转译，来源 emilkowalski/skills 动效原则，机器子集 EM-* 已进环节 4 audit）」
- **为什么**：环节 2 约束转译要有明确来源标注（铁律：每条约束标注来源），动效约束作为独立来源挂载

### 本次未做（有意跳过）

- 不装 emilkowalski/skills 的任何 skill（animate/review-animations 等）——Skill=工作流/原则封装，与五环节编排层重复，原则已提炼进约束集 + gates
- 未移植 emil 的 RECIPES.md（按钮/dropdown/toast 实现配方）——那是实现细节，原则层已覆盖；需要具体配方时按需读原仓库

### 后续修订（2026-09-01 追加）：EM-* 机器 gates 已代码级实现

- **文件**：`plugins/design-router/checks/layout.mjs`（本仓库）+ `plugins/design-router/index.mjs`（audit 描述）
- **pi 版同步**：无需（pi 版 extension 未做此步，按需再同步）
- **改成什么**：layout.mjs 新增 EM-2（入场 scale(0)）/ EM-3（UI 用 ease-in）/ EM-5（时长 >300ms）三个独立 gate；EM-1（transition: all）由已有 gate 10 覆盖、EM-7（布局属性动画）由 gate 14 覆盖、EM-8（缺 prefers-reduced-motion）由 a11y.mjs gate 27 覆盖——同语义不重复输出。workflow.md 环节 4 机器层补「机器实现映射」段；design_audit description 更新；测试套件新增 EM-2/3/5 触发用例（8→9 个）
- **为什么**：REVISION-LOG 原「未动 checks/」待办已清——EM-1/2/3/5/7 为纯 grep 型，进 design_audit 与 CS-* 并列，环节 4 机器校验闭环

### 修订验证

- 改动 1/2/3 已在 pi 版 + 本仓库双端落盘（本轮对话完成）
- pi 版 inject-map.md 环节 4 表同步更新（EM-* 子集 + 动效视觉自查）
- EM 机器 gates：本仓库 `ff98f66` 已实现并验证（9/9 测试通过）；pi 版 extension 未同步（本次为 DSH 侧代码级补全）
