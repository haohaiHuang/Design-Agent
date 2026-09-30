# 上游跟进清单 · Phase 10：DR-A4 元素级解析 + 新资源行（emilkowalski/skills）

**日期**：2026-09-30
**前置**：上游 Phase 9 = `e4ae451`；DSH 侧 Phase 10 的 DR-A4 部分已在 `checks/a11y.mjs` 落地（本轮提交）
**契约**：不变（资源行 + slug 一致 · ROUTES 各自主张 · extra 池各自主张）

---

## 1 · DR-A4 改元素级解析（修我们已经登记过的已知限制）

**问题**（Phase 9 工单 §3 登记过）：DR-A4 原实现按**行**扫——`grepLines(c, /<(div|span|li|td)\b[^>]*(onclick|onClick|@click)\s*=/i)` 命中后，若**同一行**里还有 `role=`/`tabindex` 就 `continue`。于是 **minified 的单行 HTML 会整片漏报**：

```
<!DOCTYPE html>…<body><div onclick="go()">x</div><span tabindex="3">y</span></body></html>
   DSH（改后，元素级）: 命中 DR-A4 ✅
   上游（现状，行级）  : 漏报 ❌      ← 本轮要跟上
```

**DSH 改法**（`plugins/design-router/checks/a11y.mjs`，可照抄语义）：按**开标签**取属性文本后判定，元素内没有 `role=`/`tabindex` 才算命中。开标签扫描要跟踪引号与 `{}` 深度，否则 JSX 的 `onClick={() => go()}` 里那个 `>` 会把属性文本截断：

```ts
function openTags(content: string, tagNames: string) {
  const out: { attrs: string; line: number }[] = [];
  const re = new RegExp(`<(${tagNames})\\b`, "gi");
  for (const m of content.matchAll(re)) {
    let i = m.index! + m[0].length;
    let depth = 0;
    let quote: string | null = null;
    for (; i < content.length; i++) {
      const ch = content[i];
      if (quote) { if (ch === quote) quote = null; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "{") depth++;
      else if (ch === "}") depth = Math.max(0, depth - 1);
      else if (ch === ">" && depth === 0) break;
    }
    out.push({ attrs: content.slice(m.index! + m[0].length, i), line: content.slice(0, m.index!).split("\n").length });
  }
  return out;
}

// DR-A4
for (const tag of openTags(c, "div|span|li|td")) {
  if (!/\b(onclick|onClick|@click)\s*=/.test(tag.attrs)) continue;
  if (/\brole\s*=|tabindex|tabIndex/.test(tag.attrs)) continue;
  findings.push({ gate: "DR-A4", rule: "non-native-interactive", severity: "error",
    message: "非原生元素绑定了点击事件但无 role/tabindex —— 键盘与屏幕阅读器完全不可达，且不支持 Cmd/Ctrl/中键。用 <button>（动作）或 <a href>（导航）。",
    location: loc(f.path, tag.line) });
}
```

**建议测试**（上游侧三条）：
1. minified 单行 HTML：`<div onclick>` 与 `<span tabindex="3">` 同行 → DR-A4 与 DR-A8 **都要**命中（旧实现 DR-A4 漏）
2. JSX：`<div onClick={() => go()} role="button">` → **不报** DR-A4（属性里的 `>` 不得截断扫描）
3. `<div role="button" tabindex="0">` → 仍只报 CS-2，不报 DR-A4（分工不变）

改完两侧应一致；这是**行为对齐**，不涉及契约。

---

## 2 · 新资源行：`emilkowalski/skills`（裁定「补」）

### 2.1 裁定

| 候选 | 裁定 | 理由 |
| --- | --- | --- |
| `emilkowalski/skills` | **补独立行**（C 约束模板区） | ① 它是 **EM-\* 机器 gate 的真源**——闸门报 EM-3/EM-5 时，registry 里必须能查到依据；现在只作为 Fluid Functionalism 行的来源栏出现，查不到。② 覆盖面不止动效哲学：`review-animations/STANDARDS.md`（标准）+ `animate`（实现指导）+ `animation-vocabulary`（术语）+ `emil-design-eng`（界面工程）+ `performance-cheatsheet`（性能）。③ 形态定「转译」，与既有「规则」行的形态不同，不触「同型不装」 |
| `interfaces.dev` | **不补** | 已挂在 `interfaces cheat-sheet 约束集` 行的来源栏里，角色/形态/场景都同型 → 按「装前规则：同型不装」，重复登记只增噪音 |

### 2.2 请插入 `skills/design-references/references/registry.md` 的 `## C 约束模板` 区（建议紧邻 Fluid Functionalism 行，即现 `:154` 之后）

```
| emilkowalski/skills（动效工程技能集：`review-animations` 的 `STANDARDS.md` = 频率表/缓动决策序/时长表/物理感，即 **EM-* 机器 gate 的真源**；`animate` 实现指导 / `animation-vocabulary` 术语 / `emil-design-eng` 界面工程品味 / `performance-cheatsheet` 性能） | 转译 | 次 | 网页动效（C2 环节 2 约束：动效标准/实现纪律/术语；机器子集见 EM-*） | → GitHub 直读（`skills/review-animations/STANDARDS.md` 等） → 人工转译进约束集 | 源 `https://github.com/emilkowalski/skills` |
```

> 退化链里**不要**写裸 `STANDARDS.md`——Phase 7 已裁定该仓根目录无此文件，必须带 `skills/review-animations/` 前缀。

### 2.3 路由（各自主张，建议两侧都挂 C2·2）

上游在自己的 `build-registry.mjs` ROUTES 里把新 slug 挂到 **`C2` 的环节 2**（约束阶段）。DSH 侧我在同步 registry.md 后照做（我的 ROUTES 是我自己的短名单，不要求与你逐项相同）。

**为什么只挂环节 2**：它是「标准/纪律」类约束源，不贡献视觉候选方向（那属环节 1 的桶/风格库），与 Fluid Functionalism 行的定位一致。

### 2.4 落地后的连锁（两侧都要做）

1. 生成器重跑：资源数 **103 → 104**；`registryGenerated` 两侧各变一次（各自主张）
2. 技能树指纹再变一次（registry.md 改了）→ `./install-design-router.sh --all-platforms` 重装各副本；把**新树指纹 + registry.md 新 sha256 + 新资源数**写进回执
3. DSH 侧收到后：整文件同步 registry.md → 把自己的 ROUTES 接上 → 重跑生成器 → 对账（9 处副本 + 资源行一致 + 规则族）

---

## 3 · 验收清单

| # | 断言 | 手段 |
| --- | --- | --- |
| V1 | DR-A4 三条建议测试全过；minified 单行 HTML 两侧都命中 | 上游测试 + 与我给的夹具对跑 |
| V2 | `run-tests.mjs` + `tests/self-test.ts` 全绿（断言数会因新测试增加） | 实跑 |
| V3 | registry.md 新行落在 C 区、六项全填、退化链带 `skills/review-animations/` 前缀 | 读文件 |
| V4 | 资源数变 104；`design_lookup(C2, 2)` 列出新行；`design_route` 不受影响（未挂桶） | 实跑工具 |
| V5 | 收口：重跑生成器 + `--all-platforms`；回执给出**新树指纹 + registry.md sha256 + 资源数** | 常规收口 |

---

## 4 · 回执要求

`回执-Phase10-上游-DR-A4元素级与新资源行-YYYY-MM-DD.md`，含 V1–V5 证据 + 新指纹三件套。DSH 侧收到后：同步共享件 → 接 ROUTES → 重跑生成器 → 对账 → 归档。
