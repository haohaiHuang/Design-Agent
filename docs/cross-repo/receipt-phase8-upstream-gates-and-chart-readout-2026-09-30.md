# 回执 · Phase 8（上游 pi 侧）：gate 2 / gate 24 误报修正 + 环节 4 图表读数 + 补 DR-6 缺 import

- **依据（DSH 工单）**：`docs/cross-repo/upstream-followup-gates-and-chart-readout-2026-09-30.md`
  （对应 DSH 提交 `b8bfab1` 闸门修正 + `a2e32a8` 归档工单）
- **上游产出**：`~/my-pi-skills` 提交 **`fed170e`**（已推送，`HEAD == origin/main`，工作区 0 未提交）
- **契约状态**：资源行 + slug 一致 · ROUTES 各自主张 · extra 池各自主张（**本轮无契约变更**）
- **本轮唯一权威值（DSH 同步后应比对）**：技能树指纹 **`sha256:b891206f88ee2a0d`**

---

## 1. 上游实现（照 DSH 同修法）

| 项 | 文件:行 | 内容 |
| --- | --- | --- |
| gate 2 判据 | `extensions/design-router/checks/layout.ts:33-41` | 新增 `ruleBlockAt(ln)`：向上找含 `{` 的行、向下找含 `}` 的行，取该规则块文本；判据改为 `/(-webkit-)?background-clip\s*:\s*text/i.test(ruleBlockAt(ln))` |
| gate 2 文案 | 同上 | warn 文案 → `检测到渐变（背景或纹理）。背景/纹理渐变需有约束集背书；渐变文字另有判定。`（error 文案不变） |
| gate 24 阈值 | `layout.ts:14` + `:114` | 新增 `MICRO_SPACING_MAX = 8`；过滤式 → `n !== 0 && n >= MICRO_SPACING_MAX && !SPACING_OK.includes(n)` |
| 环节 4 硬规则 | `extensions/design-router/index.ts:704-713` | `design_lookup` 在 `stage === 4` 追加 3 条：①图上读数逐项对齐（含半环「百分比 × 360°」陷阱 + 值弧/轨道不同心）②定义域是否收紧 ③机器闸门不覆盖几何/渲染正确性 |
| 技能文档 | `skills/design-references/references/workflow.md:257` | 环节 4 · 1c 段插入「图表读数逐项对齐（机器闸门完全看不见）」bullet（置于「多视口 + 关键状态」前） |
| 快线短版 | `skills/design-references/references/ui-quickfix.md:59` | 渲染核对条追加 ④ 图表读数对齐（半环 ≈ 2 倍读数） |
| 新增测试 | `checks/layout.test.mjs`（11 断言，新文件） | 纹理渐变只 warn / 真 clip:text 仍 error 且文案含「渐变文字」/ 跨块 clip:text 不给渐变背景升档 / <8px 豁免（修复前**实测 2 条**，非 4 条）/ 18px·14px 仍报且 20px 不入列 / 4pt 刻度内不误报 |

### 1.1 gate 2 的已知代价（与 DSH 同码，非缺陷）

块定位是**文本层面**的（不看声明语法）：minified 单行多规则、`@media {` 会把块边界放宽到整行/整个媒体块，可能多算。
取「宁可多报 warn，不可放过真 clip:text」。已把这条写进 `layout.ts` 注释（上游侧，DSH 侧同步与否自定）。

---

## 2. 验收（V1–V5，全部实跑）

真实产物：`~/Desktop/Test/designs/geo-dashboard.html`（GEO 看板）

| 项 | 旧基线 | 上游新态 | DSH 报告 |
| --- | --- | --- | --- |
| 总项数 | 33 | **10** | 32 → 9 |
| error / warn / info | 1 / 25 / 7 | **0 / 3 / 7** | 0 / 2 / 7 |
| verdict | **BLOCK** | **PASS-WITH-WAIVER** | PASS-WITH-WAIVER |
| gate 24 条数 | **24** | **1** | 24 → 1 |

上游 3 条 warn 明细（逐条实取）：
1. `[gate 2] 检测到渐变（背景或纹理）… :314`（信源条 `repeating-linear-gradient` 纹理，**旧代码报 error**）
2. `[gate 24] 间距值不在 4pt 刻度上：10px :409`
3. `[gate DR-A7] 页面有 <nav> 但无 skip-to-content 链接`

- **V3**：`checks/run-tests.mjs` → **8/8 文件 · 113 断言**（node 与 bun 两种跑法都过）；`tests/self-test.ts` 全过
- **V4**：仅改共享件后首跑曾红（manifest 指纹失同步）→ **重跑生成器即修**；`registryGenerated` 各自主张
- **V5**：`./install-design-router.sh --all-platforms` → **7 处部署副本 vs 仓库 `diff -r` 全零输出**；部署副本自跑 113 断言全过
- 最终 manifest（上游）：
  `{"extensionVersion":"1.2.0","hallmarkRuleVersion":"1.1.0","registryGenerated":"428f9d917785","designReferencesHash":"sha256:b891206f88ee2a0d","registryResourceCount":103}`
  （`skillTreeHash('skills/design-references')` 独立复算 = `sha256:b891206f88ee2a0d`，与 manifest 一致）

### 2.1 与 DSH 的 +1 warn 差异：**已定位，非口径分歧**

DSH 侧 2 warn = gate 2 + gate 24；上游多的第 3 条是 `DR-A7`（`<nav>` 无 skip-to-content）。
根因（grep 取证，非推测）：DSH `plugins/design-router/checks/a11y.mjs`（82 行）只有 `gate 26/27/33/39`，**全仓 grep `skip-to-content` / `DR-A7` 零命中**；上游 `checks/a11y.ts`（172 行）含 `DR-A3/A4/A5/A7/A8` 家族。
即：**两侧 gate 家族编号本就不同**（DSH 有 `DR-A1/A2/DR-4/5/6`，上游有 `DR-A3~A8/DR-4/5/6`），DSH 的 a11y 覆盖面比上游窄一档。**这是既有差异，非本轮引入**，需要时另起一轮裁定，本轮不改。

---

## 3. 上游独占发现并修复的真 bug（DSH 侧不受影响）

**`runNonTextContrastChecks` 被调用但从未 import。**

- 证据：`index.ts:736` 调用 `runNonTextContrastChecks(files)`，而 `index.ts:30` 当时只有 `import { runContrastChecks }`；`checks/contrast.ts` 确有该 export。
- 引入点：`a1126c7`（2026-09-29）。**后果**：`design_audit` 一被调用就抛 `ReferenceError`，**DR-6 非文本对比度自引入起从未真正跑过**——静态检查（gate 覆盖比对）看不出来，只有真跑一次才炸。
- 修法：`index.ts:30` → `import { runContrastChecks, runNonTextContrastChecks } from "./checks/contrast.ts";`
- 同类漏洞静态扫描（两侧都跑）：上游 `index.ts` 与 DSH `index.mjs` 均**无**其它「调用了未 import 的 `*Checks`」。

**新增的守卫（防同类复发，上游侧）**

- `checks/pi-harness.mjs`（新，61 行）：抽出「桩 typebox + Proxy 假 pi 收 registerTool」的装载器 `loadTools(self)` → `{ EXT, tools, run }`，含 bun→node 委派（bun 无 `module.registerHooks`）。
- `checks/tool-smoke.test.mjs`（新，4 断言）：8 个工具齐 + **真调** `design_audit`（返回文本且含 `渐变文字` 判定）与 `design_contrast`；fixture 写系统临时目录并 `rmSync` 收尾（零副作用）。
- `checks/pool-scope.test.mjs` 改用 `loadTools`（删掉内联桩与 `spawnSync`，语义不变，11 断言仍绿）。
- **变异验证**：`/tmp/mut` 删掉该 import → `tool-smoke.test.mjs` 抛 `ReferenceError`、退出码 1；而 `pool-scope.test.mjs` 仍全绿 —— 证明**原有覆盖对这类错误是空的**，新守卫补上了这一格。
- 建议 DSH 侧自查 + 补一个同型的「真调工具冒烟」（文件名/桩写法各自主张）。

---

## 4. 从提交门审查中修掉的问题（都是真问题，非 nit）

1. `layout.test.mjs` 原注释「修复前报 4 处」**失实** → 实测旧代码 **2 条**（`2px,6px` 合并一条 + `3px`）；顺带查清：`margin-top` 这类展开写法本就不在 gate 24 扫描面内（只取 `padding:`/`gap:`/`margin:` 自身的值片段）。注释改为实测数。
2. 18px/14px 断言过弱（`every(/1[48]px/)` 未验证两值都报）→ 拆为 3 条：报 18px、报 14px、20px 不入 `bad` 列表。断言总数 111 → **113**。
3. `tool-smoke.test.mjs` fixture 未删 → `rmSync`，让「零副作用」名副其实。
4. `registry.md` 维护协议漏覆盖共享件：原文只写「改 `registry.md` 后重跑生成器」，本轮改 `workflow.md` 后 manifest 指纹失同步、integration 报红即为此。→ 改为「改**技能树任一文件**（`registry.md`/`workflow.md`/`ui-quickfix.md`/`SKILL.md`…——共享件也算）后都要重跑 `node scripts/build-registry.mjs`；禁止手改 `registry.json` / `manifest.json` 两个生成物」。

---

## 5. DSH 跟进清单（顺序敏感）

1. **整文件复制**这三个技能文件（上游 sha256，供字节级核对）：
   - `skills/design-references/references/registry.md` → `6a2b577083ffbccf553a2b13637bf755dda9a7a393d16a8038a5dd5c0e26c3e3`
   - `.../workflow.md` → `037369c24904c67332e7e4172dc778ebcb5766c86c090abfc9fa3e46c8a61c08`
   - `.../ui-quickfix.md` → `1858c2fe1080bf38d7272cc8a928d9f87c44cb1a1dd0d328d3afeb4a5901f507`
   复制完你的 `designReferencesHash` 应等于 **`sha256:b891206f88ee2a0d`**（两侧技能树此前一直同值，故这条可硬比）。
2. gate 2 / gate 24 的修法与实现你已自行做过（`b8bfab1`）——只需核对语义等价：`(-webkit-)?background-clip: text` **同规则块内**判定 + warn 文案；`n >= 8` 且仅 ≥8px 才查 4pt 刻度。
3. 环节 4 三条硬规则你的 `index.mjs` 已自行实现（工单 §3 对侧）——核对文案等价即可，**不必**照抄上游 `index.ts` 行号。
4. 本轮**不必**取上游 `layout.test.mjs` / `tool-smoke.test.mjs` / `pi-harness.mjs`（你的文件名与桩写法不同，属各自主张）；但建议补一个同型真调工具冒烟。
5. 自己的生成器重跑；`registryGenerated` 各自主张；两侧比 **技能树指纹**（唯一该相等的值）。
6. `checks/layout.ts` 的上游已知代价注释（minified 退化到行级）可选同步，不同步不影响契约。

---

## 6. 上游未做 / 留待裁定

1. **`registry.md` 维护协议补「含 symlink 目标」**（本机 pi 侧 `design-references` 是 symlink → `~/.agents/skills/design-references`）——你上次留作「未答」的那条，本轮**仍按未裁定处理，未改**。
2. `skills/design-references/SKILL.md:142`「五栏必填」与 `registry.md:9`「六栏全填」**旧矛盾**（非本轮引入）——未动，待裁定以哪边为准。

---

## 7. 校验命令速查（供你复核）

```bash
cd ~/my-pi-skills/extensions/design-router
node checks/run-tests.mjs            # 8/8 文件 · 113 断言
node tests/self-test.ts              # 全部自检通过
node scripts/build-registry.mjs      # 103 条资源 / 9 分支路由
cd ~/my-pi-skills && ./install-design-router.sh --all-platforms
```

（部署副本无 `tests/` 是设计：install 以 `--exclude 'tests/'` 分发，`checks/` 会分发。）
