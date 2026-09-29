# 双端工作切片 · EXTRA 池键序与校验漏挂（Phase 6）

**日期**：2026-09-29
**来源**：`回执-Phase5-收尾-双端对账-2026-09-29.md` §7（Phase 5 收尾时审查提出的 4 项）
**修订**：**本文已按用户裁定修订**（原文含 Pi 自造的"两侧同轮 / 三 extra 池逐项一致"契约，已被用户正式判死并撤回 —— 见 §3 末）。D1 的**建议改法**亦被用户修正（根因不是键，是 `design_lookup` 无条件合并任务相关池）。
**末态基线**：上游 `81172ad`（`origin/main`，Phase 6 = `f57d056` / Phase 7 = `81172ad`）· DSH `76f3b08`
**权威值**：技能树指纹 `sha256:800b810967d6b9ad`（Phase 7 后；**DSH 同步共享件两文件前仍是 `b188827d92fc0094`**）· `registry.md` `8b6d51e422e56cdce415e377beb5e1b524782e5681f6188353d52c65d08c73aa` · `registryGenerated` 上游 `428f9d917785`（Phase 6 后 `0204dbab6441`，Phase 7 追记）/ DSH `22ab4157ed14`（不同属预期）
**推进模型**：**A 路径** —— 上游先做先受益；DSH 按**同一修法自行跟进**，不同轮、不要求同轮、不锁契约、互不阻塞。

---

## 1 · 裁定项（用户已裁定）

### D1 · 任务相关池泄漏进任务无关入口 —— **改**（根因修正）

- **事实**：
  1. `LOGO_EXTRA` 的 5 个 logo 源（`logggos` / `logo-archive` / `logoinspo` / `logosystem` / `logobook`）是 **R 调研源**（`registry.md:68` 定义 R = 环节 1；`:112-116` 五行 role=R），却挂在 `2:`（环节 2）键下；
  2. `design_lookup(branch, stage)` **签名里没有任务参数**（`index.ts` 工具 schema / DSH `index.mjs` 同），却按 stage 无条件拼入 `logoExtra[stage]`（上游 `index.ts:663`、DSH `index.mjs:294`）→ **任务相关池泄漏进全部 9 个分支**（实测：A1·1…C3·1 共 45 格全中）。
- **用户裁定（根因修正，优先于本切片原文）**：根因**不是键位**。只把 5 项从键 2 挪到键 1 解决不了污染，只是把污染从「全分支环节 2」搬成「全分支环节 1」。
  - `design_lookup` **不再合并 `logoExtra`**（保留 `hallmarkExtra` / `cheatExtra` —— 通用设计质量清单全分支合理）；
  - `logoExtra` **只由 `design_route` 的 logo 专项段消费**（`design_route` 按 `routing.extra === "logo"` 判任务，是有任务上下文的那一侧）；
  - 语义保洁：5 个 R 源挪到键 `1`（调研源）、`logo-design-patterns` 留键 `2`（转译原则）、`logo-quality-floor` 留键 `4`（验收底线）。

  ```js
  const LOGO_EXTRA = {
    1: ["logggos", "logo-archive", "logoinspo", "logosystem", "logobook"],
    2: ["logo-design-patterns"],
    4: ["logo-quality-floor"],
  };
  ```
- **实现时追加的修正（超出原"读 `[1] ∪ [2]`"建议，理由见 §7-1）**：专项段不取子集，改为遍历 `logoExtra` **全部键**并按环节标注 —— 取子集会让键 4 的 `logo-quality-floor` 变成"登记后无人调用"。

### D2 · `kill-ai-slop` 是否挂 `HALLMARK_EXTRA[4]` —— **挂**（用户同意）

- `kill-ai-slop`（role **V** · 次 · "产出后校验…需人工 Triage"）未挂任何 route/extra；同段同级同场景的 `hallmark-slop-test` 挂在 `HALLMARK_EXTRA[4]` → 形状对称却不对称 = 漏挂。追加。

### D3 · `logo-background-styles` 是否挂 logo 池 —— **排除**（用户裁定）

- 该行（`registry.md:149`，转译 · 次）场景列含 "logo showcase 背景"，但它是**海报展示背景模板**；塞进 logo 池 = 把海报模板当 logo 约束。
- **落点：只写在 `scripts/build-registry.mjs` 的 `LOGO_EXTRA` 注释里**（写出排除理由），**不写 `registry.md`** —— 写共享件会改 `registry.md` 指纹 + 技能树指纹 → 触发 6 平台重装 + DSH 同步，代价远超收益。

### D4 · 新增不变量：**V（校验标准）类资源必须"挂载"** —— 上游可先做，无需跨仓

- **替代**：原 §7-4 提议的"次层级 orphan 检测" **撤回**（理由见 §2）。
- **判据**（可机器判、抗腐烂）：`role === "V"` 的资源必须至少出现在任一 route 或任一 extra 池里。
- **当前实测**：V 类共 8 条 —— `kami-sancha` `huashu-5dim` `zine-consistency` `design-qa-checklist` `logo-quality-floor` `hallmark-slop-test` 已挂；`design-research-methods` 挂在 `A1·1`（环节 1，符合其语义）；**唯一违规 `kill-ai-slop`**（D2 落地后归零）。
- **落点**：`tests/self-test.ts` 的"主层级零路由 0"断言旁。**判据收窄的边界要写清**：它只证明"登了记"，不证明"有入口"；后者由 `checks/pool-scope.test.mjs` 的端到端断言管（见 §7-1）。
- DSH 侧在 `index.test.mjs` 加镜像断言（自行跟进）。

---

## 2 · 更正（原 §7 的被推翻项，留档）

原 §7-4 写"次层级 orphan 无检测，是 5 个 logo 源长期漏挂的根因"。**实测推翻**：

| 口径 | 数量 | 性质 |
|---|---|---|
| 上游次层级 orphan | **23** | — |
| ↳ 其中 DSH 已路由、上游未挂 | **13** | **短名单分叉（有意）**：`recent-design` `awwwards` `siteinspire` `landbook` `one-page-love` `lapa-ninja` `muzli` `inspora` `cta-gallery` `footer-gallery` `navbar-gallery` `supahero` `threeui` |
| ↳ 两侧都未挂（C/E 工具·模板·规则） | **10** | `design-md-spec` `ghostty` `dembrandt-extract` `huashu-philosophy` `baoyu-design` `imagegen` `hyperframes` `diagram-design` `openmotion` `kill-ai-slop`（**非 lookup 目标，按设计不挂**） |
| 兜底层级 orphan | **11** | 兜底 = 不可达时的退路，**按设计不挂** |

→ "次层级 orphan 必须为 0"会 23/23 全假报。**真正的缺口是 `LOGO_EXTRA` 硬编码本身**，Phase 5 已修（`ea43201`）；D4 用 V 类判据替代。

---

## 3 · 改动清单

| # | 文件 | 改动 | 侧 |
|---|---|---|---|
| 1 | `scripts/build-registry.mjs`（上游 L362-372 / DSH L539-545） | `LOGO_EXTRA` 改键（D1）+ `HALLMARK_EXTRA[4]` 追加 `kill-ai-slop`（D2）+ D3 排除注释 | 上游本轮 / DSH 自行跟进 |
| 2 | `index.ts:480` / DSH `index.mjs:392` | 专项段遍历 `logoExtra` **全部键**（按环节标注）；`design_lookup`（上游 `:663` / DSH `:294`）**删除** `logoExtra` 合并 | 同上 |
| 3 | `tests/self-test.ts` | D4 V 类挂载断言 + `deadRefs` 覆盖三个 extra 池 | 上游 / DSH 按 `index.test.mjs` 对应加 |
| 4 | `checks/pool-scope.test.mjs` | **新增**：V2/V3 端到端断言（跑真 `index.ts`） | 上游 / DSH 自行决定 |
| 5 | `data/registry.json` + `data/manifest.json` | 重生成（两侧 `registryGenerated` 各自变） | 各自 |
| 6 | `registry.md` | **本轮不动**（D3 落点在代码注释） | — |

**契约收敛（用户裁定）**：跨仓契约只有两条 —— ① **资源行 + slug 两侧一致**；② **ROUTES 各自主张**。
**「三个 extra 池必须两侧逐项相同」是 Pi 在本文原稿自造的临时契约，已被用户正式判死并撤回**；契约表新增：**「extra 池 = 各自主张（与 ROUTES 同类）」**（DSH `docs/cross-repo/README.md` 已落）。
原 §4 V1（"三池逐项相同"）随之作废，不再作为验收项。

---

## 4 · 验证矩阵

| # | 断言 | 手段 |
|---|---|---|
| V2 | `logoExtra` 键 = `["1","2","4"]`，每键成员**具名钉死**；`design_route('logo')` 列出池里**全部 7 项** | `checks/pool-scope.test.mjs`（跑真 `index.ts`） |
| V3 | `design_lookup(*, **任意环节**)` 36 格**均不含**这 5 项（污染消除；口径由用户收窄到全环节） | 同上（9 分支 × 4 环节循环） |
| V4 | 原不变量不回归：主层级零路由 0 · 无缺 slug（含 extra 池）· 指纹回环/键序 · 反向项（`hallmarkExtra`/`cheatExtra` **仍**合并） | `tests/self-test.ts` + `checks/run-tests.mjs` |
| V5 | D4 新断言非恒真：摘掉 `kill-ai-slop` → 自测 + pool-scope 双失败；`logoExtra` 键/成员/专项段三处各做变异 | /tmp 整套仓库副本 |
| V6 | 纯重跑零 diff；部署副本 `cmp` 零输出；共享件指纹不变 | 生成器复跑 + `install-design-router.sh --all-platforms` |

---

## 5 · 阶段表

| Phase | 内容 | 授权 |
|---|---|---|
| **1** | 用户裁定 D1–D4 + 契约判死 | — |
| **2** | **上游单侧**实现 + V2–V6 + 生成物重生成 + 三轴门规 | 报告后待确认 |
| **3** | DSH 侧按同一修法自行跟进（不同轮、不锁契约、不阻塞） | DSH 自主 |
| **4** | 上游提交/推送 | **需用户另行确认** |

---

## 6 · 回执要求

- 上游侧：`回执-Phase6-上游-EXTRA池键序与校验漏挂-YYYY-MM-DD.md`，含裁定结果 / 改动 diff 摘要 / V2–V6 证据 / 审查发现与处置 / 旧指纹收口（活基线一律改名新值，历史记录只加追记）。
- DSH 侧：跟进后自行更新 `docs/cross-repo/README.md` 与本切片"最终基线"表的 `registryGenerated`（两侧各自新值）。
- 归档：本切片 + 回执进 `docs/cross-repo/`（两侧文件名 ASCII 化）；归档件由产出方写工作区、DSH 落笔归档。

---

## 7 · 实现中发现并修掉的两个新问题（留档）

**7-1 · `logoExtra[4]` 死键（实现引入的回归，审查揪出）**：按原建议"专项段读 `[1] ∪ [2]`"改后，键 4 的 `logo-quality-floor`（V 类）**失去全部消费者** —— 它此前只经 `design_lookup` 的 stage-4 合并可达，D1 摘掉合并后即无入口；而 self-test 的"入池 = 挂载"判据把它算作已挂载 → 绿灯掩盖"登记后无人调用"，正是 D4 想防的那一类。
**处置**：专项段改为遍历**全部键**（按环节升序标注 `环节 N`），并新增可达性断言（专项段必须列出池里每一项）。**判据分工**：self-test 管"池值存在"，pool-scope 管"键真被消费"。

**7-2 · 新检查在 bun 下静默失效 / 在旧 node 上失控**：`checks/pool-scope.test.mjs` 需要 `module.registerHooks`（桩掉 pi 运行时的 `typebox`）；bun 无此 API 且不能剥 `.ts`，而仓库 README 广告的跑法是 `bun checks/run-tests.mjs` → 原实现（bun 下"跳过"）等于守卫静默失效。改用"委派 node 重跑"后，**首版在旧 node（无 `registerHooks`）上会无限自重生成进程链**（实测模拟 12 秒内 529 个进程）。
**处置**：只有 `process.versions.bun` 才委派 node；非 bun 且缺 API → 打印所需版本后立即 `exit 1`。实测：旧 node 模拟 0.02 秒响亮失败；bun / node 两跑法均 6 文件全绿。
