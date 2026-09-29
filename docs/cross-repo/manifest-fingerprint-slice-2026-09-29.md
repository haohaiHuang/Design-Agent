# manifest 自指字段根治 · 双端工作切片（2026-09-29）

**参与方**：DSH 侧（`~/Desktop/DSH/Chat/Design-Agent`）· 上游侧（`~/my-pi-skills`，Pi）
**起因**：`manifest.json` 的 `designReferencesSource` 嵌的是 HEAD 短 rev（自指字段，内容提交后必然变旧，需再补一个 chore 提交），
且两侧 `registryGenerated` 语义不一致（上游=内容指纹，DSH=日期）→ **今天两个 manifest 无法跨仓对账**。
**状态**：**全部完成**（Phase 1–5 已执行并交叉验收，见 §7–§12）。

---

## 0 · 已核实事实（含证据）

| 事实 | 证据 |
| --- | --- |
| `registry.md` 指纹三处一致：`sha256:8b6d51e422e56cdc…` | `shasum -a 256` 于 上游 / DSH 仓库 / `~/.agents/skills` 三处 |
| 自指字段实测会"活"：上游 manifest 一度写 `@ a99ce37`（内容提交），刷新后又变成 `@ 26a2af3`（其自身的 chore 提交） | 直接读 `my-pi-skills/extensions/design-router/data/manifest.json` |
| 该字段已被上游测试"打补丁"：`integration.test.mjs` 比对前把 `designReferencesSource` 归一化成 `"-"`，注释写明"随环境变、没有任何代码读它" | `checks/integration.test.mjs:37-40` |
| 跑校验套会重写 manifest：**上游成立**（其 integration 用例会跑生成器）；**DSH 不成立**（实测跑完 `index.test.mjs` + `check-checks-sync.mjs`，manifest sha 不变） | 实测前后 `shasum` 对比 |
| 消费者只有两处：上游 `index.ts:845` 的状态行打印 `registryGenerated`；`integration.test.mjs:85` 断言 `manifest.registryGenerated === registry.generated` | grep 全仓 |
| 两侧 `registryGenerated` 语义不同：上游 `945475faa86c`（sha1 内容指纹）；DSH `2026-09-29`（日期，`new Date().toISOString().slice(0,10)`） | 两侧生成器第 448 / 639 行 |

---

## 1 · 目标与判据

1. **消灭自指**：manifest 里不再出现任何"随提交漂移"的字段。
2. **跨仓可对账**：存在一个**内容派生、跨仓必须相同**的字段，一条命令即可校验"三处技能副本一致"。
3. **纯重跑零 diff**：内容不变时重跑生成器，`registry.json` / `manifest.json` 一字不变（这条上游已做到，DSH 因日期字段未做到）。
4. **不引入第二套真相**：不新增需要人工维护的版本号。

---

## 2 · 字段规范（两侧必须一致）

```json
{
  "hallmarkRuleVersion": "1.1.0",
  "registryGenerated": "945475faa86c",
  "designReferencesHash": "sha256:b188827d92fc0094",
  "registryResourceCount": 103
}
```

| 字段 | 语义 | 跨仓要求 | 格式 |
| --- | --- | --- | --- |
| `hallmarkRuleVersion` | checks/ 的 gate 号语义跟随的 hallmark 规则版本 | 应一致 | 现有 |
| `registryGenerated` | **本仓生成物**内容指纹（resources + routes + buckets + routing + bucketNotes） | **不要求一致**（两侧 ROUTES 有意分叉，指纹必然不同）；用途是"纯重跑零 diff"与同 `registry.json.generated` 对账 | sha1 前 12 位（沿用上游既有格式） |
| `designReferencesHash` | **技能树**指纹（`skills/design-references/**` 全部文件） | **必须一致**；这是三处副本一致性的机械校验依据 | `sha256:` + sha256 前 16 位 |
| `registryResourceCount` | 资源条目数 | 应一致（当前 103） | 整数 |
| ~~`designReferencesSource`~~ | **删除**（自指字段） | — | — |
| `extensionVersion` | 上游扩展自身的版本（DSH 无此字段） | 允许存在差异，不参与对账 | — |

> `designReferencesHash` 覆盖整棵技能树（含 `SKILL.md` / `references/workflow.md`），不是只算 `registry.md`——
> 本轮回灌改的正是 `workflow.md` 与 `SKILL.md`，只算 registry.md 的指纹看不见那类改动。

### 2.1 树指纹算法（两侧同码，逐字节可复现）

```js
// scripts/skill-hash.mjs —— 供生成器与一致性脚本共用
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** 技能树指纹：排序后的「相对路径\0文件 sha256」逐行拼接，再 sha256，取前 16 位 */
export function skillTreeHash(skillDir) {
  const walk = (d, acc = []) => {
    for (const e of readdirSync(d).sort()) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p, acc);
      else acc.push(p);
    }
    return acc;
  };
  const lines = walk(skillDir)
    .map((p) => relative(skillDir, p).split(sep).join("/"))
    .sort()
    .map((rel) => `${rel}\0${createHash("sha256").update(readFileSync(join(skillDir, rel))).digest("hex")}`);
  return "sha256:" + createHash("sha256").update(lines.join("\n")).digest("hex").slice(0, 16);
}
```

**当前期望值**（三处技能的 5 个文件一致时）：`sha256:b188827d92fc0094`。

### 2.2 生成器改动点（两侧同样的三处）

1. 新增 `scripts/skill-hash.mjs`（上面的函数，逐字节相同）。
2. `registry.json` 的 `generated`：**不要日期**，改为内容指纹
   ```js
   const resourceFingerprint = createHash("sha1")
     .update(JSON.stringify({ resources, routes: ROUTES, buckets: BUCKETS, routing: ROUTING, bucketNotes: BUCKET_NOTES }))
     .digest("hex").slice(0, 12);
   // …output.generated = resourceFingerprint
   ```
3. `manifest.json`：删掉 `designReferencesSource` 与 `git rev-parse` 那段（`execSync` 若不再他用一并去掉），改为
   ```js
   const manifest = {
     hallmarkRuleVersion: "1.1.0",
     registryGenerated: resourceFingerprint,
     designReferencesHash: skillTreeHash(join(HERE, "../../../skills/design-references")),
     registryResourceCount: resources.length,
   };
   ```

### 2.3 上游附加清理（可选但建议）

`checks/integration.test.mjs` 的 `normalize(...)` 归一化是为"字段随环境变"打的补丁；字段变稳定后可删除该行与相关注释
（保留"跑生成器 → 两文件不变"的原意）。

---

## 3 · 归属与执行顺序

| 阶段 | 谁 | 内容 |
| --- | --- | --- |
| **Phase 1** | DSH | 落 §2.2 三处 + `check-checks-sync.mjs` 增加"技能树指纹对账"（DSH / 上游 / `~/.agents` 三处比对）→ 重生成 → 自测 → 提交（**不推**） |
| **Phase 2** | 上游 | 落 §2.2 三处 + §2.3 清理 → 重生成 → 自测 → 提交推送 |
| **Phase 3** | DSH | 复制上游 `registry.md`（本切片不改其内容，预期指纹不变 `8b6d51e4…`）→ 跑 §4 全套 → 推送 |

**文件所有权**：`registry.md` 不改动，本切片不涉及共享文件；两侧各改自己的生成器。

---

## 4 · 验收标准与命令

```bash
# V1 树指纹三处一致（DSH 侧脚本可一键跑；也可手工各自执行）
node -e "import('/Users/huanghaohai/Desktop/DSH/Chat/Design-Agent/plugins/design-router/scripts/skill-hash.mjs').then(async m=>{
  const fs=await import('node:fs');
  for (const d of ['/Users/huanghaohai/my-pi-skills/skills/design-references',
                   '/Users/huanghaohai/Desktop/DSH/Chat/Design-Agent/skills/design-references',
                   '/Users/huanghaohai/.agents/skills/design-references']) {
    console.log(fs.existsSync(d) ? m.skillTreeHash(d) : '（不存在）', d);
  }})"

# V2 manifest 语义
node -e "for (const p of ['/Users/huanghaohai/my-pi-skills/extensions/design-router/data/manifest.json','/Users/huanghaohai/Desktop/DSH/Chat/Design-Agent/plugins/design-router/data/manifest.json']) { const m=require(p); console.log(p.includes('my-pi')?'上游':'DSH', JSON.stringify(m)); }"

# V3 纯重跑零 diff（关键新性质：跑两遍生成器，git 必须干净）
cd /Users/huanghaohai/Desktop/DSH/Chat/Design-Agent && node plugins/design-router/scripts/build-registry.mjs >/dev/null && git diff --quiet -- plugins/design-router/data && echo "纯重跑零 diff ✅"

# V4 registry.json.generated === manifest.registryGenerated（两侧都必须成立）
node -e "for (const [l,d] of [['上游','/Users/huanghaohai/my-pi-skills/extensions/design-router/data'],['DSH','/Users/huanghaohai/Desktop/DSH/Chat/Design-Agent/plugins/design-router/data']]) { const r=require(d+'/registry.json'), m=require(d+'/manifest.json'); console.log(l, r.generated===m.registryGenerated ? '一致 ✅' : '不一致 ❌ '+r.generated+' vs '+m.registryGenerated); }"

# V5 测试
cd /Users/huanghaohai/Desktop/DSH/Chat/Design-Agent && node plugins/design-router/index.test.mjs        # 17/17
cd /Users/huanghaohai/my-pi-skills/extensions/design-router/checks && node run-tests.mjs                # 5/5 文件 86 断言
```

**通过条件**：V1 三行完全相同且等于 `sha256:b188827d92fc0094`；V2 两侧都无 `designReferencesSource`、都有 `designReferencesHash`；
V3 干净；V4 两侧一致；V5 全绿。

---

## 5 · 非目标

- ❌ 不改 `registry.md` 内容（本切片预期其指纹保持 `8b6d51e422e56cdc…`）。
- ❌ 不追求两侧 `registryGenerated` 相等（ROUTES 有意分叉，指纹**应当**不同）。
- ❌ 不引入人工维护的版本号（如 `skillVersion: 1.3.0`）。

---

## 6 · 上游回执模板（Phase 2 完成后贴回）

```
Phase 2 完成
- 新增 scripts/skill-hash.mjs（逐字节同 §2.1）
- registry.json.generated = sha1 内容指纹（非日期）
- manifest.json：删 designReferencesSource 与 git rev-parse 段；新增 designReferencesHash = sha256:<值>
- integration.test.mjs 的 normalize 补丁：[已删 / 保留，原因]
- V1 三处树指纹：<值>（期望 sha256:b188827d92fc0094）
- V2 manifest：<内容>
- V3 纯重跑零 diff：[通过/不通过]
- V4 generated 一致性：[通过/不通过]
- V5 上游测试套：5/5 文件 86 断言
```

---

## 7 · Phase 1 回执（DSH 侧，2026-09-29）

**改动**

1. 新增 `plugins/design-router/scripts/skill-hash.mjs`（§2.1 函数原文，逐字节同切片）
2. `build-registry.mjs`：
   - 去掉 `execSync` 与 `git rev-parse`（自指那段整体删除）
   - `registry.json.generated`：日期 → **sha1 内容指纹**（`resources+routes+buckets+routing+bucketNotes`，前 12 位）
   - `manifest.json`：删 `designReferencesSource`，新增 **`designReferencesHash`**（技能树指纹），保留
     `registryGenerated` / `registryResourceCount` / `hallmarkRuleVersion`
3. `check-checks-sync.mjs`：新增**技能树指纹对账**段——一次算三处（DSH 仓库 / pi 仓库（由参数路径推导）/ `~/.agents/skills`），
   不相同则整个脚本以非 0 退出。以后"三处副本一致"用一条命令即可验证，不必手工 `diff -rq`
4. 预设重装（`scripts/`、`data/` 都在预设目录内）

**校验输出**

```
V1 树指纹三处一致   DSH 仓库 / pi 仓库 / 已安装 ~/.agents = sha256:b188827d92fc0094（3 处一致 ✅）
V2 manifest（DSH）  {"hallmarkRuleVersion":"1.1.0","registryGenerated":"35c9b616a774",
                    "designReferencesHash":"sha256:b188827d92fc0094","registryResourceCount":103}
                    —— 已无 designReferencesSource ✅
V3 纯重跑零 diff    registry.json a8b27b69121cb9ea → a8b27b69121cb9ea ✅；manifest 9b109291fe71 → 9b109291fe71 ✅
                    （与 git 的差异仅是本次一次性改动：日期→指纹、字段替换，共 3 行）
V4 generated 一致   registry.generated = manifest.registryGenerated = 35c9b616a774 ✅
V5 测试             DSH 单测 17/17（安装副本 16 pass + 1 skipped）✅
附加：指纹函数能区分内容（design-references b188827d… vs hallmark d30b7daa…）✅
附加：check-checks-sync 现输出「技能树指纹」三行 + 「3 处技能副本内容一致」
```

**期望上游结果**：`designReferencesHash` 同样等于 `sha256:b188827d92fc0094`；
`registryGenerated` **不同是正常的**（两侧 ROUTES 有意分叉）；V3/V4/V5 同样通过。

---

## 8 · Phase 3 回执（DSH 侧，2026-09-29）

**对上游 Phase 2 的独立核验**（回执见 `回执-Phase2-上游-manifest指纹根治-2026-09-29.md`）

| 检查 | 结果 |
| --- | --- |
| 上游提交 | ✅ `6dfe534` 已推 `origin/main`，工作区干净 |
| `skill-hash.mjs` | ✅ 与 DSH 版**函数体逐字节相同**，差异仅头注释（上游按"检测端不重复算法"改写，符合各自用途） |
| 空树守卫 | 上游新增（`lines.length === 0` 即抛错）——**Phase 3 已同步到 DSH**，两侧函数体现在一致 |
| `manifest.json` | ✅ 无自指字段；`designReferencesHash` = 两侧同为 `sha256:b188827d92fc0094`；`registryResourceCount` = 103（两侧都写，字段集对齐） |
| `integration.test.mjs` | ✅ `normalize` 补丁已删；**实测跑完校验套工作区仍干净**（0 → 0 个脏文件） |
| `registryGenerated` | ✅ 上游 `945475faa86c` / DSH `35c9b616a774`——两侧不同属预期（ROUTES 有意分叉） |

**Phase 3 本侧动作**：同步空树守卫 → 预设重装 → 跑全套验收。**未复制 `registry.md`**：本切片不改其内容，
逐字节锚点实测仍为 `sha256:8b6d51e422e56cdc…`（与上游回执给的值一致），故无需同步。

**全套验收（Phase 3 后）**

```
V1 树指纹         DSH / pi / ~/.agents = sha256:b188827d92fc0094（3 处一致 ✅）
V2 manifest 语义  两侧均无 designReferencesSource；均有 designReferencesHash；count 均 103 ✅
V3 纯重跑零 diff  registry.json + manifest.json 连跑两次恒定（37caf1f97499 → 37caf1f97499）✅
V4 generated 一致 上游 945475faa86c ✅ / DSH 35c9b616a774 ✅（各自 registry == manifest）
V5 测试           DSH 单测 17/17；上游测试套 5/5 文件 86 断言 ✅
锚点              registry.md = sha256:8b6d51e422e56cdce415e377…（未变）
```

---

## 9 · 对上游 4 条遗留发现的裁决

| # | 发现 | 裁决 | 理由 |
| --- | --- | --- | --- |
| ① | **双指纹盲区**：`registryGenerated` 只哈希 5 个字段，`source` / `logoExtra` / `hallmarkExtra` / `cheatExtra` / `qualityLevels` 未被覆盖（改 `LOGO_EXTRA` 后 registry.json 变了但指纹不变） | **应当修** → 列入 §10 Phase 4 | 静态核对确认：输出 11 个字段，只有 5 个进哈希。内容指纹漏字段属自相矛盾，且以后新增字段会继续漏 |
| ② | **树指纹对垃圾文件敏感**：walk 不过滤 `.DS_Store` / 编辑器临时文件，三副本任一出现即误报不一致 | **应当修** → 列入 §10 Phase 4 | 误报会直接表现为"三处不一致"，正是本指纹要防的假警报；修法值不变（当前无此类文件），零风险 |
| ③ | DSH 版 `skill-hash.mjs` 头注释 11 行 vs 切片 §2.1 单行，"逐字节相同"字面不符 | **不算偏差**；契约措辞改为"**函数体**逐字节相同，头注释按各自用途写" | 两仓对该文件的使用方式确实不同（DSH 的 `check-checks-sync.mjs` 会 import 它；上游不 import，靠重跑生成器比字节），头注释本就该不同 |
| ④ | `integration.test.mjs` 生成器崩溃时 `after === before` → 打出"✅ 与生成器输出一致"，与后一行"❌ 生成器可跑通"自相矛盾（判定仍失败，只是输出误导） | **本轮不改**；列为 §10 可选项 | 判定正确、只是输出误导，且属上游文件；要与 ① 同轮做就顺手修（一行：先判退出码） |

---

## 10 · Phase 4 小补丁规范（待决：是否本轮做）

**目标**：补掉 ①（指纹漏字段）与 ②（垃圾文件误报），顺带 ④（一行修正）。两侧同轮，`registryGenerated` 的值会变一次（预期）。

**① 指纹覆盖全字段**（改为"哈希除 `generated` 自身以外的全部输出字段"，固定键序，避免再漏）

```js
const fingerprintPayload = {
  source: "skills/design-references/references/registry.md",
  resources,
  routes: ROUTES,
  logoExtra: LOGO_EXTRA,
  hallmarkExtra: HALLMARK_EXTRA,
  cheatExtra: CHEAT_EXTRA,
  buckets: BUCKETS,
  routing: ROUTING,
  bucketNotes: BUCKET_NOTES,
  qualityLevels: QUALITY_LEVELS,
};
const resourceFingerprint = createHash("sha1").update(JSON.stringify(fingerprintPayload)).digest("hex").slice(0, 12);
// output = { generated: resourceFingerprint, ...fingerprintPayload }
```
（键序必须两侧一致；`output` 直接由 `fingerprintPayload` 展开，保证"指纹覆盖内容 = 输出内容"）

**② 树指纹过滤垃圾文件**（值不变；两侧同码）

```js
const JUNK_FILE = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$|~$|\.sw[po]$|(^|\/)\.#/i;
const JUNK_DIR = new Set([".git", "node_modules"]);
// walk() 里：目录名命中 JUNK_DIR 跳过；文件名命中 JUNK_FILE 跳过
```

**④（可选）** `integration.test.mjs`：先判生成器退出码，非 0 直接报失败，不再进入字节比较。

**验收**：两侧 V1–V5 重跑；额外加一条 ① 的**内容敏感性测试**——临时改一个只进指纹、不进其它断言的字段
（如 `QUALITY_LEVELS` 的值），重跑生成器应看到 `registryGenerated` 变化（上游已有同类变异测试可复用）。

---

## 11 · Phase 4 回执（DSH 侧，2026-09-29）

按 §10 执行 ①（指纹覆盖全字段）与 ②（树指纹过滤垃圾文件）；④ 属上游文件，未动。

### 改动

1. **① 指纹覆盖全字段**（`build-registry.mjs`）
   引入 `fingerprintPayload`（`source, resources, routes, logoExtra, hallmarkExtra, cheatExtra, buckets, routing, bucketNotes, qualityLevels`），
   指纹 = `sha1(JSON.stringify(fingerprintPayload))` 前 12 位，`output = { generated, ...fingerprintPayload }`
   → **指纹覆盖内容 ≡ 输出内容**，键序与改前完全一致（`generated, source, resources, …, qualityLevels`），以后新增字段自动纳入。
2. **② 树指纹过滤垃圾文件**（`skill-hash.mjs`）
   跳过目录 `.git` / `node_modules`；跳过文件名 `.DS_Store` / `Thumbs.db` / `desktop.ini`、后缀 `~` / `.swp` / `.swo` / `.tmp`、前缀 `.#`。

### 验收

```
① 内容敏感性测试（新增）：改 LOGO_EXTRA（只进指纹、不进别的断言）
   改前 22ab4157ed14 → 改后 a5d50b145507 ✅ 指纹随变化 → 探针已清除、指纹回基线
   （这条测试正是上游 ① 的证伪法：改前它纹丝不动）
V1 树指纹        DSH / pi / ~/.agents = sha256:b188827d92fc0094（② 过滤后值不变）✅
V3 纯重跑零 diff  6e7471f27853 → 6e7471f27853 ✅
V4 一致性        registry.generated == manifest.registryGenerated == 22ab4157ed14 ✅
V5 测试          DSH 单测 17/17 ✅
字段/键序        与改前一致（仅 generated 的值变化），registry.json 与 git 的差异只有那一行
```

### 交给上游的 Phase 4 清单（Pi）

1. `build-registry.mjs`：按 §10 ① 改成 `fingerprintPayload` 展开式（**键序必须一致**：
   `source, resources, routes, logoExtra, hallmarkExtra, cheatExtra, buckets, routing, bucketNotes, qualityLevels`，
   `output = { generated, ...fingerprintPayload }`）→ 上游 `registryGenerated` 的值会变一次（预期）
2. `scripts/skill-hash.mjs`：按 §10 ② 加垃圾过滤（与 DSH 逐字节同码；值不变）
3. **④（可选）** `checks/integration.test.mjs`：先判生成器退出码再比字节，消除崩溃时的误导性 ✅
4. 跑 V1–V5 + **① 的内容敏感性测试**（改 `LOGO_EXTRA` 一项，指纹应变）→ 回执
5. 预期：`designReferencesHash` 仍 = `sha256:b188827d92fc0094`；`registryGenerated` 与 DSH **不同**（ROUTES 有意分叉）

---

## 12 · Phase 5 收尾（DSH 侧，2026-09-29）

**上游提交**：`d3ce860`（Phase 4，已推 `origin/main`，工作区干净）
**DSH 提交**：`6137e01`（Phase 4 ① ②）——本节完成后推送

### 对上游 Phase 4 的独立核验（在它提交前的工作区上验，提交后复核）

| 项 | 结果 |
| --- | --- |
| ① `fingerprintPayload` 段 | ✅ 与 DSH **去注释后逐字节相同**（467 / 467 字符） |
| ② `skill-hash.mjs` | ✅ `cmp` 零输出、两侧 sha 同为 `42c867c70642…`（它整文件取 DSH 版，顺带消掉了 Phase 2 那条头注释差异） |
| ④ `genOk` | ✅ `integration.test.mjs:43/90/91` 就位，崩溃分支不再打误导性 ✅ |
| ② 过滤正反双向（我独立重做） | ✅ 注入 `.DS_Store` / `a~` / `.#lock` / `node_modules/` → 指纹不变；加真实文件 → `sha256:2d7a0816e9d26c3b`（不误杀） |
| V3 幂等 | ✅ 两侧重跑均无新增 diff |
| V5 测试 | ✅ 上游 5/5 文件 86 断言 + `self-test.ts`（含新增「技能树指纹」一节）；DSH 17/17 |

**一处口径修正**：上游回执写"V1 … 7 位置"，但 `~/.pi/skills/design-references` 本机不存在；
Phase 5 实测**存在的 7 处**（pi 仓库 / DSH 仓库 / `~/.agents` / `~/.codex` / `~/.claude` / `~/.trae-cn` / `~/.trae`）全部同值。

### 双端联合验收（Phase 5）

```
V1 树指纹        存在的 7 处全部 = sha256:b188827d92fc0094 ✅
V2 manifest 语义  两侧均无自指字段；designReferencesHash 同值；count 均 103 ✅
V3 幂等          上游 bda2255e51 → bda2255e51 ✅ / DSH 6e7471f278 → 6e7471f278 ✅
V4 generated     上游 93517affeae9 ✅ / DSH 22ab4157ed14 ✅（两侧不同属预期：ROUTES 有意分叉）
共享代码         skill-hash.mjs 两侧 cmp 零输出 ✅
测试             DSH 17/17；上游 5/5 文件 86 断言 ✅
锚点             registry.md 两侧 sha256 仍 = 8b6d51e422e56cdc…（本切片未改其内容）
```

### 最终基线（供以后对账）

| 量 | 值 |
| --- | --- |
| 技能树指纹（跨仓必须一致） | `sha256:b188827d92fc0094` |
| `registry.md` 文件指纹 | `sha256:8b6d51e422e56cdce415e377beb5e1b524782e5681f6188353d52c65d08c73aa` |
| `registryGenerated` | 上游 `cfbd65fc5e50` / DSH `22ab4157ed14`（**不同属预期**） |
| 资源条目 | 两侧均 **103** |
| 对账命令 | DSH 侧 `node plugins/design-router/scripts/check-checks-sync.mjs <上游 checks 目录>` |

> **追记（2026-09-29，Phase 5 收尾）**：上游值由 `93517affeae9` → `cfbd65fc5e50`（原因是 `LOGO_EXTRA` 补齐 5 个 logo 源：`logggos`/`logo-archive`/`logoinspo`/`logosystem`/`logobook`），DSH 值未变。
> 上文 §11 验收记录里的旧值属**当时**证据，不再读作当前状态。详见 [`receipt-phase5-reconciliation-2026-09-29.md`](receipt-phase5-reconciliation-2026-09-29.md)。

### 登记未做（不阻塞）

1. `resources.length > 0` 下限过松（上游建议 ≥100）→ **不采纳**：硬编码资源数会腐烂，现有结构断言足够。
2. `._*` / `.swn` / `.swm` / `.Spotlight-V100` 等垃圾类型未纳入过滤 → **本轮不做**：当前树内实测 0 条，
   且 `skill-hash.mjs` 现已两侧逐字节冻结，改动需成对走一轮 → 留给"下次因别的原因动该文件"时顺手加。
3. DSH 的 `check-checks-sync.mjs` 只对账 3 处（DSH 仓库 / pi 仓库 / `~/.agents`），而本机有 7 处技能副本
   → **可选增强**：扩成"扫描所有存在的平台副本"。
