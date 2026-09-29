# 回执 · Phase 5 收尾（双端对账）— manifest 指纹根治

**日期**：2026-09-29
**对应切片**：`manifest-指纹根治-双端工作切片-2026-09-29.md`（DSH 已归档为 `docs/cross-repo/manifest-fingerprint-slice-2026-09-29.md`）
**上游末态**：`~/my-pi-skills` @ **`ea43201`**（`origin/main`，0 未提交）
**DSH 末态**：`~/Desktop/DSH/Chat/Design-Agent` @ **`1c3e28f`**（0 未提交）
**结论**：**契约锚点全部一致；分叉已逐项分类；3 项非契约差异已裁定（① 补 `logoExtra` → 已修，②③ 定性为"各自主张"）**

> **裁定结果（2026-09-29）**：用户采纳建议 → ① 上游补齐 `LOGO_EXTRA` 5 个 logo 源（`registryGenerated` `93517affeae9` → **`cfbd65fc5e50`**，`logoExtra` 现与 DSH 逐项相同）；② 每资源 `bucket` 字段差异 → 定性"各自主张"，不动；③ `bucketNotes` 文案 → 定性"各自主张"，不动。

---

## 1 · 契约锚点（必须一致的项）— 全绿

| 锚点 | 值 | 两侧 |
|---|---|---|
| `registry.md` 内容 | `8b6d51e422e56cdce415e377beb5e1b524782e5681f6188353d52c65d08c73aa` | ✅ 同 |
| 技能树指纹（`designReferencesHash`） | `sha256:b188827d92fc0094` | ✅ 同（**9 处副本全同**） |
| `registryResourceCount` | 103 | ✅ 同 |
| 资源集（slug 集合 + 顺序 + 各字段值） | 103/103 | ✅ 同（仅 `bucket` 字段见 §3.2） |
| 顶层 `source` / `buckets` / `routing` / `hallmarkExtra` / `cheatExtra` / `qualityLevels` | — | ✅ 同 |
| 路由 36 格 | — | **29 格逐元素相同**，7 格见 §2 |
| `generated`（`registryGenerated`） | 上游 `cfbd65fc5e50` / DSH `22ab4157ed14` | ⚠️ **有意不同**（ROUTES 分叉导致，规格 §11 预期；上游值于本轮 §3.1 修复后更新） |
| `logoExtra`（§3.1 修复后） | 两侧逐项相同：`{"2":[logo-design-patterns,logggos,logo-archive,logoinspo,logosystem,logobook],"4":[logo-quality-floor]}` | ✅ 同 |

**对账命令（一条）**：
```
node ~/Desktop/DSH/Chat/Design-Agent/plugins/design-router/scripts/check-checks-sync.mjs
→ ✅ 全部 checks 与 pi 版 gate 覆盖一致
→ 9 处技能副本内容一致（DSH 仓库 / pi 仓库 / pi / 共享层 / workbuddy / codex / claude / trae-ide / trae-work）
```

**两侧测试**：上游 `checks/run-tests.mjs` **5/5 文件 · 86 断言** ✅；上游 `tests/self-test.ts` 全过 ✅；DSH `index.test.mjs` **17 pass / 0 fail** ✅。

---

## 2 · 路由 7 格差异（`ROUTES` = 各自主张，已定性）

**成员不同（3 格，全部是 DSH 多、上游无"仅上游"项）**

| 格 | 上游 | DSH | 仅 DSH |
|---|---|---|---|
| `A1·1` | 7 | 15 | `awwwards` `inspora` `landbook` `lapa-ninja` `muzli` `one-page-love` `recent-design` `siteinspire` |
| `C1·1` | 22 | 27 | `cta-gallery` `design-spells` `footer-gallery` `navbar-gallery` `supahero` |
| `C2·1` | 4 | 5 | `threeui` |

**同集合异序（4 格：`A2·1` `B1·1` `B1·2` `B1·4`）**——元素集合完全相同，仅展示顺序不同。
理由：两侧 `ROUTES` 是各自硬编码字面量，顺序 = 候选展示顺序。**定性为"各自主张"**（无功能破坏）；若要统一，须两侧同轮改字面量，收益低。

---

## 3 · 非路由字段差异（`ROUTES` 之外，契约未定义 → 需裁定）

### 3.1 `logoExtra` —— ✅ **已于本轮修复（用户裁定：补）**

| | 上游 | DSH |
|---|---|---|
| `logoExtra` | `{"2":["logo-design-patterns"],"4":["logo-quality-floor"]}` | `{"2":["logo-design-patterns","logggos","logo-archive","logoinspo","logosystem","logobook"],"4":["logo-quality-floor"]}` |

**证据链**：
- 这 5 个 slug 的**资源行两侧都在**（103/103 一致），`registry.md` L112–116 明确将它们登记为 logo 场景资源（`Logggos / LogoArchive / Logoinspo / Logosystem / Logobook`，均 `次`）。
- `routing` 里 `logo|app icon|图标|...` 触发词组带 `extra: "logo"` → 消费点 `index.ts:480`（`registry.logoExtra["2"]`）与 `index.ts:663`（`registry.logoExtra[stage]`）**直接并入候选池**。
- 后果：**上游做 logo 任务时该池只有 1 个候选（对比 DSH 6 个）**；这 5 个 slug 也不出现在上游任何路由格里（已核）。
- `registry.md` 未定义该池成员（需求路由表只有主/次桶两列）→ 严格说属"契约未定义"，但按池的语义（"logo 任务必看的额外源"）+ 共享台账已登记这 5 行，**上游更像漏挂**。

**已执行**：上游 `LOGO_EXTRA` 扩为 6 项（与 DSH 逐项相同，键序/值序一致）→ 重生成 → `registryGenerated` `93517affeae9` → **`cfbd65fc5e50`**（DSH 侧未受影响，仍 `22ab4157ed14`）。

**修复后的验证**：`git diff` 仅 `generated` + `logoExtra` 两行（+ 生成物 manifest）；变异验证（在 /tmp 副本把这 5 项删回）→ `registryGenerated` **精确回到 `93517affeae9`** 且产物与 HEAD 字节相同（证明确入指纹、非旁路）；checks 5/5·86 断言 + 自测 11 项全过；V3 纯重跑零 diff；9 处技能树指纹仍 `sha256:b188827d92fc0094`；`routes`/`routing`/`buckets`/`qualityLevels` 零变化。

**诊断修正（对抗性复核）**：`logoExtra` **不进** `routes`，只在运行时被追加 —— `index.ts:480` 仅对 logo 任务（`routing.extra === "logo"`）的环节 2 段生效；`index.ts:663` 在 `design_lookup` 里对**全部 9 个分支**的环节 2/4 无条件拼入。故本次修复的实际收益**大于**原诊断（不只 logo 任务）。

### 3.2 每个资源对象的 `bucket` 字段 —— 规则设计不同，建议定性

- 上游：**按资源名关键词精确打桶**（`BUCKET_BY_KEYWORD`），命中才写 `bucket` → 22 个资源有该键。
- DSH：规则 + 兜底 → **103 个资源全有该键**（其中 16 个被赋 `minimal`，如 `awwwards` `mobbin` `muzli` `landbook` …；上游对这 16 个为空）。
- 消费点：`index.ts:455`（`r.bucket === b` 取桶代表，`design_lookup` 用）与 `:687`（展示标签）；两处均为真值判断 → **无崩溃风险**。
- 影响：DSH 的 16 个额外打桶会让这些聚合站/画廊被列为"minimal 桶代表"；上游则不会。**属审美/口径之争，建议定性为"各自主张"**；若要求统一，代价是两侧同轮改打桶规则并再变一次指纹值。

### 3.3 `bucketNotes`（5 个桶的查询指引文案）—— 建议定性

两侧文案不同（同一批桶，措辞与引用源不同，例：上游 `darktech` 提到 "Linear 高端极简暗色（shadcn DESIGN.md）；Ghostty"，DSH 提到 "hallmark 主题 cobalt/terminal"）。消费点 `index.ts:465` 仅作提示文本拼接 → **零功能影响**，建议**定性为"各自主张"**。

---

## 4 · 已知未做（明确记录，不静默）

| 项 | 状态 | 理由 |
|---|---|---|
| `resources.length > 0` 下限过松（建议 ≥100 或更抗腐烂判据） | 未做 | 硬编码资源数会腐烂；结构完整性已由"字段齐全 / 无缺 slug / 主层级零路由 / routing 9 组"覆盖 |
| 树指纹垃圾类未覆盖 `._*`（AppleDouble）/ `.swn` `.swm` / `.Spotlight-V100` `.fseventsd` `.Trashes` | 未做 | 当前 9 处树内实测 0 条；属"跨卷拷贝/外接盘"预防项（`._*` 是高发场景） |
| 两侧 `build-registry.mjs` 的额外池常量未纳入"必须一致"清单 | 部分收口 | `LOGO_EXTRA` 已对齐（本轮，见 §3.1）；`HALLMARK_EXTRA`/`CHEAT_EXTRA` 的同类漏挂排查见 §7 |

---

## 5 · 收尾现状

- 上游：`d3ce860` 已推 `origin/main`；工作区干净；生成器复跑零 diff；7 安装位（+ `~/.workbuddy`）树指纹同值。
- DSH：`1c3e28f` 已提交；工作区干净；9 处副本指纹同值；本轮已把两轮切片 + 两份上游回执归档进 `docs/cross-repo/`（含 `README.md` 索引：什么必须一致 / 什么有意分叉 / 一条命令对账 / 两仓改动流程）。
- 本回执（Phase 5）在 DSH 归档中**尚无对应件** → 待 DSH 补档。

## 6 · 裁定与执行结果

| # | 事项 | 裁定 | 执行 |
|---|---|---|---|
| 1 | `logoExtra` 上游补 5 个 logo 源 | **补** | ✅ 已改 + 重生成 + 验证（见 §3.1）；**已提交并推送 `ea43201`** |
| 2 | 每资源 `bucket` 字段差异（22 vs 103 键、16 项额外打桶） | 定性"各自主张" | 不动 |
| 3 | `bucketNotes` 文案差异 | 定性"各自主张" | 不动 |

**旧指纹收口**（`93517affeae9` → `cfbd65fc5e50`）：DSH 归档 3 处活基线 + 历史记录追记已同步 ——
`docs/cross-repo/README.md:43`、`docs/cross-repo/manifest-fingerprint-slice-2026-09-29.md:366`（+ 追记）、
`docs/cross-repo/receipt-phase4-upstream-manifest-fingerprint-2026-09-29.md`（文末追记，原值不改）。
上游仓库内 0 处引用旧值（已 grep）。

---

## 7 · 本轮审查新发现（**不属本轮范围，未动**，待你排期）

按严重度排序，每条均有证据；**单侧改会破坏跨仓契约的项须两仓同轮**。

| # | 发现 | 证据 | 性质 |
|---|---|---|---|
| 1 | **stage 键语义错位**：`LOGO_EXTRA` 新增的 5 项是 **R 调研源（环节 1）**，却挂在 `2:`（环节 2）键下 → `design_lookup(…,1)` 取不到它们，环节 1 只能靠 `design_route` 兜 | `registry.md:68`（R = 环节 1）vs `build-registry.mjs:362-366`；`index.ts:480`（硬读 `["2"]`）/`:663`（按 stage 合并） | **两仓共有**；修需两仓同轮（否则破坏"logoExtra 必须一致"） |
| 2 | **同类漏挂：`kill-ai-slop`** 与 `hallmark-slop-test` 同角色（V）·同层级（次）·同场景（产出后校验），但未挂任何 route/extra | `registry.md:189` vs `:188`；orphan 核对命中 | 需裁定：补挂 `HALLMARK_EXTRA[4]`，或在注释/维护协议写明"机器-only 资源不挂 EXTRA" |
| 3 | **同类漏挂（同一判据）：`logo-background-styles`** 场景列含 "logo showcase 背景"，但只挂 `B1·2`，未进 `LOGO_EXTRA` | `registry.md:149` vs `build-registry.mjs:303` | 补进 `2:` 或注明排除理由 |
| 4 | **`emilkowalski/skills`（动效原则）被当环节 2 资源使用但 `registry.md` 无登记行** → 无 slug 可挂 | `workflow.md:180`、`inject-map.md:62`、`README.md:211` 有引用；registry.md 无对应行 | 裁定：补登记 or 维持源直引（另需与 `Fluid Functionalism` 行做装前同型判断） |
| 5 | **检测缺口**：自测只断言"**主**层级零路由 0"，次/兜底层级 orphan 无检测 | `tests/self-test.ts:74` | ⚠️ **本条已更正 → 见下方更正说明** |
| 6 | `index.ts:480` 的 `registry.logoExtra?.["2"]` `?.` 冗余（`:75` 类型非可选、`:87` 已兜 `{}`），与 `:663` 写法不一致 | `index.ts:75/87/480/663` | 预存在、非本轮引入；顺手可清 |

**注**：#1/#2/#3 若要修，都会再动一次 `registryGenerated`，建议**合并成一轮**再走双端。

### 更正（2026-09-29，开轮前用证据推翻 §7-5 的原判据）

§7-5 写"次层级 orphan 无检测 → 加次层级 orphan 白名单断言"。实测推翻：上游**次层级 orphan 共 23 条** —— 其中 **13 条是 DSH 已路由、上游按短名单有意未挂**（`awwwards`/`muzli`/`cta-gallery`/`threeui` 等，即 §2 的 7 格分叉），**10 条两侧都未挂**（C/E 工具·模板·规则，非 lookup 目标，按设计不挂）；另有**兜底层级 orphan 11 条**（兜底 = 不可达时的退路，按设计不挂）。→ 该断言会 23/23 全假报，**撤回**。

改为可机器判、抗腐烂的窄判据：**`role === "V"`（校验标准）的资源必须至少出现在一个 route 或 extra 池里**。实测 V 类 8 条中仅 **`kill-ai-slop`** 违规（`design-research-methods` 挂在 `A1·1`，符合其环节语义）→ 与 §7-2 同轮落地后归零。

**本轮合并轮的切片**：`EXTRA池键序与校验漏挂-双端工作切片-2026-09-29.md`（含 D1 stage 键语义 / D2 D3 漏挂 / D4 新不变量 + 验证矩阵 V1–V6）。

