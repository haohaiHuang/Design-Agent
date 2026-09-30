# 上游跟进清单 · 闸门误报/噪音修正 + 环节 4 图表读数核对

**日期**：2026-09-30
**来源**：真实产物复盘——用户用「设计 Agent」预设跑「做一个 GEO 分析的仪表盘原型」，产物在 `~/Desktop/Test/designs/`。
**DSH 侧已完成并推送**：`Design-Agent` → `b8bfab1`（`plugins/design-router/`）
**契约**：不变（资源行 + slug 一致 · ROUTES 各自主张 · extra 池各自主张）

---

## 0 · 那一次跑暴露了什么

同一份产物上，机器闸门的表现：

| 现象 | 数据 |
|---|---|
| 假 error（gate 2「渐变文字」） | 1 条：命中的是信源条的付费斜纹 `repeating-linear-gradient`，全文件无 `background-clip: text` |
| 同类噪音（gate 24「4pt 刻度」） | 24 条，全是 2/3/5/6/10px 的元件内微调，把唯一的 error 淹了 |
| **闸门完全看不见的真错** | 引擎份额环的弧长：轨道是 180° 半环，值弧却按「百分比 × 360°」取端点 → ChatGPT 44% 画成 151.5°（应 79.2°），且值弧圆心 (69,60) ≠ 轨道圆心 (70,70)，灰色"其余"段与青色段接不上，有可见折点 |

结论：**闸门只看 CSS/文本规则，几何与数值编码不在检查面内——闸门全绿不等于图对。**

---

## 1 · 上游要做的两件事

### 1.1 `extensions/design-router/checks/layout.ts`（同型修正，两处）

**gate 2**：现在第 25 行把「`background-image: <渐变>`」也判成渐变文字（error）。判据要收窄为**同一条规则块内**出现 `background-clip: text`：

```ts
// 现（错）：line 25
const isText = /background-clip\s*:\s*text/i.test(line) || /background-image[^;]*(linear|radial|conic)-gradient/i.test(line);

// 新：取该行所在规则块，块内有 clip:text 才是渐变文字
const cssLines = c.split("\n");
const ruleBlockAt = (ln: number) => {
  let s = ln - 1;
  let e = ln - 1;
  while (s > 0 && !cssLines[s].includes("{")) s--;
  while (e < cssLines.length - 1 && !cssLines[e].includes("}")) e++;
  return cssLines.slice(s, e + 1).join("\n");
};
const isText = /(-webkit-)?background-clip\s*:\s*text/i.test(ruleBlockAt(ln));
```

同处 warn 文案改清楚（现文案里含"无流派允许渐变文字"，会被读成"这条被判成了渐变文字"）：

```
"检测到渐变（背景或纹理）。背景/纹理渐变需有约束集背书；渐变文字另有判定。"
```

**gate 24**：现在第 98 行 `return n !== 0 && !SPACING_OK.includes(n);`。4pt 刻度只管**布局级**间距，< 8px 属元件内微调（徽标内边距 / 光学对齐 / hairline 配套），豁免：

```ts
const MICRO_SPACING_MAX = 8;   // 加在 SPACING_OK 旁
// 第 98 行改为
return n !== 0 && n >= MICRO_SPACING_MAX && !SPACING_OK.includes(n);
```

DSH 侧对应实现（可直接照抄逻辑）：`Design-Agent@b8bfab1` 的 `plugins/design-router/checks/layout.mjs`。

**测试**：上游 `checks/run-tests.mjs` 收录 `*.test.mjs`，建议加一个 `layout.test.mjs`（或并入现有文件）覆盖三条正反断言：

1. 斜纹纹理渐变（`background-image: repeating-linear-gradient(...)`，无 clip:text）→ gate 2 命中但**不是 error**（🔴 不出现）
2. `-webkit-background-clip: text` + 渐变 → 仍必须 error 且文案含"渐变文字"
3. `padding:2px 6px; gap:3px; margin-top:5px`（微调）→ **无** gate 24；`padding:20px 18px; gap:14px` → 仍报（命中值含 18px/14px）

> DSH 的 `scripts/check-checks-sync.mjs` 只比 **gate 覆盖**，不比行为；所以这两处的行为一致性只能靠两侧各自的测试锁住。

### 1.2 `skills/design-references/references/workflow.md` §环节 4 → 1c 渲染核对（**共享件**）

在 1c 的子条目里加一条（DSH 侧已在插件里落地等价内容，但技能是共享件、只有上游能改）：

```
   - **图表读数逐项对齐（机器闸门完全看不见）**：闸门只读 CSS/文本，**几何与数值编码不在检查面内**——
     闸门全绿不等于图对。每个图的每一段（弧长 / 扇区 / 柱高 / 点位 / 占比条）都要量一遍是否等于标签里的数字。
     典型陷阱：半环/仪表盘按「百分比 × 360°」取端点 → 读数约为标签值的 2 倍，且值弧与轨道不同心
     （接缝处可见折点）。顺带核**定义域是否收紧**：曲线挤在画布下 1/3、轴范围远大于数据波动 = 纵向空间
     被浪费，收紧 y 域或降图高。
```

可选：`references/ui-quickfix.md` 的「Aesthetic Review → 渲染核对」三条后面补同一句的短版（那条清单已经是"截图看着正常 ≠ 渲染是对的"的同类纪律）。

**契约后果（必须一起说清）**：`workflow.md` 是共享件 → 改完两侧技能树指纹都变（当前 `sha256:800b810967d6b9ad`）→ 需
`install-design-router.sh --all-platforms` 重装 6 平台副本，并通知 DSH **整文件复制**同步（DSH 已按流程等上游先改，改完我做同步 + 指纹对账）。

---

## 2 · 验收清单

| # | 断言 | 手段 |
|---|---|---|
| V1 | gate 2：纹理渐变只有 warn、clip:text 才 error | 新增测试 + 用 `~/Desktop/Test/designs/geo-dashboard.html` 复跑（error 应从 1 → 0） |
| V2 | gate 24：<8px 豁免、布局级仍报 | 新增测试 + 同一产物复跑（gate 24 应从 24 条 → 1 条，剩的那条是 10px） |
| V3 | 既有 gate 不被误伤 | `run-tests.mjs` 全绿（当前 6 文件 98 断言）+ `tests/self-test.ts` 全过 |
| V4 | 生成器纯重跑零 diff；部署副本 `cmp` 零输出 | 常规收口 |
| V5 | 若改了共享件：9 处技能副本指纹一致 | `check-checks-sync.mjs`（DSH 侧） |

## 3 · DSH 侧参照实现（已推送）

- `plugins/design-router/checks/layout.mjs`：gate 2 判据收窄 + gate 24 微调豁免（含注释写明来源与原因）
- `plugins/design-router/index.mjs`：`design_lookup(*, 4)` 新增「环节 4 校验硬规则（机器闸门之外）」三条（读数对齐 / 定义域收紧 / 闸门不覆盖几何）
- `plugins/design-router/index.test.mjs`：22/22（新增 3 个测试）
- 实测：同一产物 `32 项（error 1 / warn 24 / info 7）` → `9 项（error 0 / warn 2 / info 7）`
