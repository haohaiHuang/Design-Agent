# 视觉迭代 / 审计快速通道（环节 4 · 产物已存在时）

**何时用**：产物已存在，用户要视觉迭代或审计——"这页面很丑/很怪/不协调/突兀/不和谐/帮我看看/截图迭代"。**不从环节 0 重走完整流程。**

**判定**：审美投诉（"很傻/很怪/突兀/不协调/不和谐"）是**审美拒绝信号**，不是 debug 症状 → 走本通道；若证据指向渲染/状态/构建/回归（broken render、字体管线、时序），才转 debugging，不归这里。

---

## 方向锁：五维（改之前先定方向，不临场发挥）

从**现有产物**取答案，顺序：当前产品 token / sibling 组件 / git history → 同作者其他产品 → 对话。**模型默认调色板/默认字体只在无任何参考时允许。** 先 infer，只问"会改变产物"的（≤2 问），其余陈述推断让用户纠正。

1. **谁用、什么场景**：dashboard ≠ 落地页 ≠ onboarding
2. **美学方向**：精确命名（dense editorial / raw terminal / ink-on-paper / brutalist grid / warm analog）。"干净现代"不是方向。用户点名参考站（"像 Linear/Vercel"）→ 不接受方向本身，萃取 3 个具体属性：按钮圆角哲学 / 表面深度处理（阴影 vs 背景分层 vs 边框）/ 强调色家族
3. **设计签名**：字体 / 色系统 / 意外动效 / 非对称布局，挑一个做明显
4. **硬约束**：框架 / 体积 / 对比度下限 / 键盘可达
5. **签名微交互**：按压缩放 / 交错显现 / 图标动画，选一个并明确实现

**成熟产品加面板豁免**：新 panel/dialog/toast 且 app 已有同类组件 → **方向 = app 本身**，grep sibling 复用 container/motion/typography token；发明新风格必须有"为什么现有组件不适用"的理由。

产出前用三行声明方向（可验证基准，Aesthetic Review 靠它查漂移）：
- **Visual thesis**：mood/material/energy 一句话
- **Content plan**：每区块一行；app/dashboard 默认 utility 模式（orient→show status→enable action），不设 hero
- **Interaction thesis**：`none` + 一条理由，或 2-3 个具体动效

---

## Grep sibling：复用优先（从现有产品出发）

任务落在成熟产品 → **grep 现有 sibling 组件**，复用其容器/动效/排版 token。file tree 是菜单不是饭——用户给了 repo URL/源码时，读真实 token 文件（`theme.ts` / `colors.ts` / `tokens.css` / `_variables.scss` / 全局样式），**lift 精确值**（hex/间距/字阶/圆角），不靠记忆重建；只 attach 目标组件目录，不拖整个 monorepo。

---

## Native exception（已有原生 app）

已有连贯方向的 macOS/iOS/Android app：**不提议整体迁移到平台最新风格**（macOS 26 Liquid Glass / iOS 18 frosted / Material You / Fluent）作为默认方案——整体重设计 = "我没有具体设计意图，这是平台的"。默认在现有方向上增量 polish：间距/对齐/hover+focus/排版层级/文案收紧/动效时序。仅当用户明确要求迁移、或现有方向已坏到增量修不好时才提议迁移。动效触及该表面时平台曲线与 web 不同（原生动效规则另行判断）。

---

## Hard Rules（反 AI slop 底线，全 mode 生效）

- **禁**：粗侧边强调线、渐变文字、默认玻璃卡片、reflex 紫→蓝/青暗色板、通用圆角阴影卡片栅格、普通溢出用 modal 逃生、`transition: all`、layout 属性动画
- **动效两律**：键盘触发的禁动画（频率决定是否动，高频读作延迟）；每个可按的都按压时动（hover 仅 pointer，不动的控件点击无确认）
- **禁 em dash**（U+2014）——输出语言规则
- 交互元素全状态：default/hover/:focus-visible/:active/disabled/loading/error/success

---

## Aesthetic Review（交付前自查清单）

- 品牌/产品在首屏一眼可辨？
- 有单一强视觉锚（真实图像，不是装饰性渐变）？
- 只扫标题能理解页面？
- 每区块一个职责？
- 卡片是真需要，还是默认样式？
- 动效改善层级/氛围，还是纯装饰？
- 去掉所有装饰阴影还高级吗？
- AI Slop Test：陌生人瞥一眼首屏会否觉得"AI 做的"？扫：reflex 字体 / 默认渐变 / 居中 hero + 双侧 CTA / 三张相同卡片 / 通用顶栏——不是方向明确要求的都修掉
- 全宽 + 375px 各渲染一次；移动端破了先修再交付。宿主不能渲染时，把要检查的确切视图交给用户

结束：命名美学方向（2-3 句 + 理由）+ 非显然选择（字体/色彩/布局逻辑）+ 占位内容替换指引。

---

*源自 Waza /ui（~/.agents/skills/ui/SKILL.md）方法论归位；本文件只在"产物已存在要视觉迭代/审计"时按需 read。*
