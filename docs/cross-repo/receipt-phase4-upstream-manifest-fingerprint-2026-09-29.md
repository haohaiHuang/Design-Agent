# 回执 · Phase 4（上游侧：Pi）— manifest 指纹根治

**日期**：2026-09-29
**对应切片**：`manifest-指纹根治-双端工作切片-2026-09-29.md` §10（①②④）+ §11 上游清单
**上游仓库**：`~/my-pi-skills`（`extensions/design-router`），起点 HEAD `6dfe534`
**提交**：**`d3ce860`**（`fix(design-router): 内容指纹覆盖全部输出字段 + 技能树指纹过滤垃圾文件`，6 文件 +67/−23），**已推送 `origin/main`**，HEAD == `origin/main` == `d3ce860`；提交后复跑生成器零 diff、`git status` 干净。

---

## 1 · 改动（3 个源文件 + 2 个生成物）

### ① 指纹覆盖全字段 — `scripts/build-registry.mjs`

引入 `fingerprintPayload`，键序 = `source, resources, routes, logoExtra, hallmarkExtra, cheatExtra, buckets, routing, bucketNotes, qualityLevels`；
`generated = sha1(JSON.stringify(fingerprintPayload)).slice(0,12)`，`output = { generated: resourceFingerprint, ...fingerprintPayload }`
→ **指纹覆盖内容 ≡ 输出内容**；`registry.json` 键序与改前**完全一致**（仅 `generated` 的值变一次，规格预期）。

Phase 4 前只哈希 5 个字段，漏 `source / logoExtra / hallmarkExtra / cheatExtra / qualityLevels`（双指纹盲区）。

### ② 树指纹过滤垃圾文件 — `scripts/skill-hash.mjs`

**采用 DSH 的实际实现（不是 §10 ② 的样例码）**：`JUNK_DIR = {".git","node_modules"}` + `JUNK_NAME`（`.DS_Store`/`Thumbs.db`/`desktop.ini`）+ `JUNK_SUFFIX`（`~`/`.swp`/`.swo`/`.tmp`）+ `JUNK_PREFIX`（`.#`），walk 里跳过。
理由：§11 清单第 2 条要求"与 DSH 逐字节同码"，以 DSH 落码为准。
**顺带消掉了 Phase 2 遗留的唯一差异**：此前两侧仅头注释不同（上游 1 行 vs DSH 11 行 JSDoc），本轮整文件复制 → `cmp` 零输出，两副本**逐字节相同**（2323 字节，sha256 `42c867c70642…bc8b37`）。

### ④ 生成器崩溃不再打误导性 ✅ — `checks/integration.test.mjs`

新增 `const genOk = run.status === 0`，漂移断言改为 `check(genOk && !drifted, …)`，失败文案按"生成器崩了 / 真漂移 / 一致"三分支。

### 生成物

`data/registry.json` + `data/manifest.json`：`registryGenerated` `945475faa86c` → **`93517affeae9`**（一次性、预期）。
`skills/design-references/**` **零改动**（`registry.md` sha256 仍 `8b6d51e4…`）。

---

## 2 · 验收

| 项 | 结果 |
|---|---|
| **V1 树指纹** | 7 位置（repo / ~/.pi / ~/.agents / ~/.codex / ~/.claude / ~/.trae-cn / ~/.trae）= **`sha256:b188827d92fc0094`** ✅（② 过滤后值不变） |
| **V2 manifest** | 上游 `{"extensionVersion":"1.2.0","hallmarkRuleVersion":"1.1.0","registryGenerated":"93517affeae9","designReferencesHash":"sha256:b188827d92fc0094","registryResourceCount":103}` ✅ |
| **V3 纯重跑零 diff** | 连跑两遍 `data/*.json` sha256 完全相同 ✅ |
| **V4 一致性** | `registry.generated == manifest.registryGenerated == 93517affeae9` ✅ |
| **V5 测试** | `checks/run-tests.mjs` **5/5 文件 / 86 断言** ✅；`tests/self-test.ts` **全部自检通过**（11 项）✅ |
| **① 内容敏感性（新增）** | 改 `LOGO_EXTRA` 一项：`93517affeae9` → **`3ecd1d4f741e`** ✅ **随内容变化**；还原后回基线、两文件逐字节与基线相同。**反证**：同一探针打回 HEAD 旧代码 → 仍 `945475faa86c` 纹丝不动（这就是 Phase 4 前漏字段的实证） |
| **② 正反双向** | 注入 `.DS_Store`/`Thumbs.db`/`desktop.ini`/`x~`/`.swp`/`.swo`/`.#lock`/`.git/`/`node_modules/` → 指纹**不变**；加 `notes.txt`（真实内容）→ 变 `sha256:de92c10ccda47f56` ✅ 不误杀 |
| **④ 崩溃路径** | /tmp 副本把生成器换成 `process.exit(1)`：输出恰两个 ❌、`grep -c "与生成器输出一致"` = **0** ✅；正常路径两个 ✅ |
| **零副作用** | 跑校验套/自测前后 `data/*.json` sha256 不变；真实 `os.tmpdir()`（`/var/folders/g2/…/T`）含失败路径无 `skill-hash-*` 残留 ✅ |
| **部署** | `./install-design-router.sh --all-platforms`：6 平台 skill 副本 `registry.md` 同 `8b6d51e4…`；`build-registry.mjs` / `skill-hash.mjs` / `integration.test.mjs` / `data/*.json` 在仓库与部署副本**逐字节相同**；部署副本（无 `.git`）跑生成器 manifest 与仓库一致 ✅ |
| **与 DSH 的关系** | `registryGenerated` 上游 `93517affeae9` ≠ DSH `22ab4157ed14`（ROUTES 有意分叉，规格预期）；`designReferencesHash` **两侧同值** ✅ |

---

## 3 · 审查（提交门规三轴）

- **ponytail**：净 +67/−23，6 文件；无新增依赖（仅 `node:` 标准库）；② 采用 DSH 落码而非 §10 样例码 → 少写 1 个正则 + 换来逐字节同码。
- **code-review 双轴（规格 / Standards，两个并行只读子 agent）**：
  - 规格轴：§10 ①②④ + §11 清单 1–5 **逐条一致，零缺陷、零超范围**（含与 DSH 代码 `diff` 零输出）。
  - Standards 轴：**零 Critical**；4 条 Warning。其中 3 条本轮修掉（见 §4），1 条（`resources.length > 0` 下限过松，建议 ≥100）**未采纳**——硬编码资源数会腐烂，且现有断言已覆盖结构完整性，留给规格侧决定。
- **增量复核**（因审查后补了断言，再跑一轮聚焦只读审查）：零 Critical；2 条文案级 Warning（测试输出覆盖清单漏列新项、断言消息夸大了对 `undefined` 场景的覆盖）→ 均已修。

## 4 · 审查后追加的断言（落在 `tests/self-test.ts`，非本切线要求但属"新分支必带一条可跑检验"）

审查发现"新加的东西没有测试"与两个静默缺口，补三条并**用变异测试证明非恒真**：

1. **指纹回环重算**：`generated === sha1(JSON.stringify(其余输出字段)).slice(0,12)`（用落盘 `registry.json` 重算）。
   变异 A（删顶层键 `qualityLevels`）→ 失败 ✅；变异 B（篡改 `generated` 一字符）→ 失败 ✅；变异 D（`resources`↔`source` 换序）→ 失败 ✅。
   这条同时堵住审查指出的"payload 若含 `generated` 键会静默覆盖指纹且全链路绿"。
2. **输出字段集与键序断言**（`Object.keys(rest)` deepEqual 固定 10 键）→ 堵住"某常量意外为 `undefined` 导致字段从 `registry.json` 静默消失"（哈希两侧同步丢键，回环看不出来）。附 `ponytail:` 注释标注上限：将来若加整数样顶层键，`JSON.parse` 会重排 → 届时改比键集合。
3. **垃圾过滤断言**：混入 `.DS_Store` / `b.md~` / `node_modules/` 后指纹不变。变异 C（去掉 `\.DS_Store` 过滤）→ 失败 ✅。

---

## 5 · 交给 DSH 的下一手

1. **§10 ① 键序一致性已达成**：上游 `build-registry.mjs` 的 `fingerprintPayload` 段与 DSH 去注释后 `diff` 零输出；两侧键序、展开方式相同。
2. **§10 ② 已达成逐字节同码**：`skill-hash.mjs` `cmp` 零输出（上游本轮整文件取自 DSH）。今后该文件两侧都别再单侧改。
3. **④ 只在 DSH 侧有对应物**（`index.test.mjs` 若也有"跑生成器比字节"的检查，可同法加 `genOk` 前置；上游这处属 `checks/integration.test.mjs`，DSH 无此文件）。§10 ④ 原标注为"可选"，DSH 未动，**可不补**。
4. **值基线（供 Phase 5 对账）**：`registryGenerated` 上游 **`93517affeae9`** / DSH **`22ab4157ed14`**（两者不同属预期）；`designReferencesHash` 两侧 **`sha256:b188827d92fc0094`**；`registry.md` sha256 两侧 **`8b6d51e422e56cdce415e377beb5e1b524782e5681f6188353d52c65d08c73aa`**。
5. **本次未做且仍留给规格侧的两条**（Phase 2 回执 §4 已列，本轮仍单侧不改）：
   - 双指纹盲区已由 ① 修掉 ✅（可从遗留清单划掉）。
   - `resources.length > 0` 下限过松（建议 ≥100 或用更抗腐烂的判据）。
   - `._*`（AppleDouble）/ `.swn`/`.swm` / `.Spotlight-V100` 等垃圾类型未覆盖（当前树内实测为 0 条，属"跨卷拷贝高发"的预防项）。
6. **Phase 5 收尾前提**：✅ 已满足——上游已提交推送为 **`d3ce860`**，仓库哈希与本文件一致。

---

## 6 · 提交记录（已确认执行）

切片阶段表只有 Phase 3 一行提到"推送"，**Phase 4 未授予提交/推送** → 按提交门规先跑三轴（结果见 §3/§4）并报告，停在待确认；用户确认后执行提交推送。

```
fix(design-router): 内容指纹覆盖全部输出字段 + 技能树指纹过滤垃圾文件

- fingerprintPayload 展开式：指纹覆盖内容 ≡ 输出内容（补回 source/logoExtra/
  hallmarkExtra/cheatExtra/qualityLevels 5 个漏字段），registryGenerated 一次性
  变为 93517affeae9
- skill-hash.mjs 与 DSH 逐字节同码（垃圾文件过滤，值不变）
- checks/integration.test.mjs：生成器崩溃时不再打误导性 ✅
- tests/self-test.ts：新增指纹回环重算/输出字段键序/垃圾过滤断言（已变异验证）
```

**落实结果**：`d3ce860`，已推 `origin/main`；提交内容 = 审查产物（提交后 `git status --porcelain` 为空，生成器复跑零 diff）。

---

**追记（2026-09-29，Phase 5 收尾后）**：本文所有上游 `registryGenerated = 93517affeae9` 均为**当时**值，
已被 **`cfbd65fc5e50`** 取代（Phase 5 裁定补齐 `LOGO_EXTRA` 的 5 个 logo 源；DSH 侧 `22ab4157ed14` 未变）。
本文字段语义、漂移检查、四链验证结论不受影响。
