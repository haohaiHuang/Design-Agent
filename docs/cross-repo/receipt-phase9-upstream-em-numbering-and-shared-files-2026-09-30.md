# 回执 · Phase 9（上游侧）— EM 编号统一与共享件收口

- 日期：2026-09-30
- 上游仓库：`~/my-pi-skills`，提交 **`e4ae451`**（HEAD == `origin/main`，工作区 0 未提交）
- 上游前序：`fed170e`（Phase 8）
- 依据工单：`~/Desktop/DSH/Chat/上游跟进-Phase9-EM编号统一与共享件收口-2026-09-30.md`（DSH 侧镜像 `docs/cross-repo/upstream-followup-phase9-em-numbering-and-shared-files-2026-09-30.md`）
- DSH 侧对应提交：`0afec30`（Phase 9 实现）、`a68e745`（工单归档）

---

## 0. 开门第一件事：编号裁定改了（工单一处失效，请勿照抄）

**工单 §1.2① 原写「EM 清单现到 EM-10，补第 11 条（will-change = EM-11）」——该前提失实。**

证据（改前，即 `fed170e` 状态）：

- 共享 `skills/design-references/references/workflow.md:324` 的**视觉层**自查清单**已占用 EM-11~EM-16**：
  `EM-11 频率档匹配 / EM-12 目的能否命名 / EM-13 crossfade 是否干净 / EM-14 stagger 30–80ms / EM-15 退出路径与进入对称 / EM-16 慢放验证`。
- 即共享文档的 EM 号空间是**两段**：机器层 `EM-1~EM-10`、视觉层 `EM-11~EM-16`。工单只看到机器层那一段。
- 若照工单实现，同一份共享文档会出现**两个 EM-11**（机器层 will-change / 视觉层 频率档匹配），而工单 §3 自己写明「共享文档里的编号是跨仓契约的一部分」。

**用户裁定（A 路径）：will-change = `EM-17`**（追加，不改既有号）。理由：编号只增不改；代价集中在 DSH 一侧一次改名。

### ⚠️ DSH 必须跟改的三处（已发布 `0afec30` 里的 EM-11）

| 文件 | 现状 | 应改为 |
| --- | --- | --- |
| `plugins/design-router/checks/layout.mjs:5` | 注释「动效 EM-2 / EM-3 / EM-5 / EM-11（EM-11 于 2026-09-30 补齐，编号依共享 workflow.md）」 | `… / EM-17` |
| `plugins/design-router/checks/layout.mjs:262/276/279` | `// EM-11: will-change …` 注释、`gate: "EM-11"`、`message: \`动效 EM-11: …\`` | 全部 `EM-11` → `EM-17` |
| `plugins/design-router/index.test.mjs:517-530` | `回归 EM-11：will-change…` + `assert.match(bad, /\[gate EM-11\]/)` / `assert.doesNotMatch(ok, /\[gate EM-11\]/)` | 全部 `EM-11` → `EM-17` |

**并且**：工单 §4 的 `KNOWN_RULE_GAPS` 删除清单写的是 `EM-1/EM-4/EM-5/EM-11` → 应为 **`EM-1/EM-4/EM-5/EM-17`**。（`EM-1`/`EM-4` 仍留在清单里是对的：它们现在由 gate 10 / gate 14 覆盖，属"缺口登记"而非"我方已发独立 gate"。）

另：**跨实现行为全等不受影响**——两侧都只是换标签，命中集合与 severity 不变（见 §2 V1）。

---

## 1. 上游实现（对照工单 §1.1–§1.4）

| 工单项 | 落实 | 位置 |
| --- | --- | --- |
| §1.1 改号 | ✅ `EM-1`→**`EM-3`**（ease-in，两处 report：transition 规则 + keyframe）· `EM-4`→**`EM-5`**（时长）· `EM-3`→**`EM-17`**（will-change）· `EM-2` 不变 | `extensions/design-router/checks/motion.ts:213/226/268/281` + 头部 `:5-9` + 段注释 |
| §1.1 测试同步 | ✅ 断言 + 模板串（含 1 处易漏的 `实际 ${gates(f,"EM-1").length}`，已抓出） | `checks/motion.test.mjs:7/47-53` |
| §1.2① EM 清单补条 | ✅ 追加 `EM-17 will-change 用在非合成属性（只应用 transform/opacity/filter）`，**用 EM-17 非 EM-11** | `references/workflow.md:322` |
| §1.2② 映射句 | ✅ `EM-2/EM-3/EM-5/**EM-17** 为 design_audit 独立 gate`；同段 `EM-3` 释义补「入场」（实现是方向感知：enter→error / ambiguous→warn / exit 合法） | `references/workflow.md:322` |
| §1.2 追加防复发 | ✅ 新增「**编号段位**」句：`EM-1~EM-10 + EM-17` 为机器层、`EM-11~EM-16` 为视觉层自查号；**新增机器 gate 从 EM-18 起往后追加，不改既有号** | `references/workflow.md:322` |
| §1.3 symlink 说明 | ✅ 合并进既有「改技能树任一文件后重跑生成器」段尾（非表后另起）：`./install-design-router.sh --all-platforms` + pi 侧 symlink 指向真身 `~/.agents/skills/design-references`、数副本只算一份；生成器命令同时改**仓库根全路径**（与 README 维护段一致） | `references/registry.md:64` |
| §1.4 五栏→六栏 | ✅ 改「**六项必填**」而非「六栏」（见 §5-⑥ 说明：角色由 R/C/E/V 分区承载，表头首列是「资源」，无同名栏） | `SKILL.md:142` |

### 工单之外的补齐（上游自行发现，工单漏列）

- `extensions/design-router/inject-map.md`：`:47`（15 个 error gate 清单内 EM-1→EM-3）· `:49`（EM-1/EM-2 例外句）· `:86`（EM-1→EM-3）· `:88`（EM-3→EM-17）· `:89`（EM-4→EM-5，并按实现补齐豁免面 `modal/drawer/overlay/accordion 例外；退出方向不报`）。
- `extensions/design-router/README.md`：`:39` design_audit 工具说明、`:79` 测试清单（`motion(EM-2/3/5/17)`）；**新增旧号→新号迁移说明**（旧号作废，存档 punch list / waiver 按 `EM-1→EM-3`、`EM-3→EM-17`、`EM-4→EM-5` 换算）。
- `checks/motion.ts` 头部注释把裸文件名 `workflow.md` 改为精确真源路径 `skills/design-references/references/workflow.md`（本仓约定：禁裸文件名）。

---

## 2. 验收（V1–V5）

**V1 行为不变（关键）**：取改前树（`/tmp/v1-old` = `fed170e` 全量副本，走 `rsync -a --exclude .git`）与改后树，各自跑**同一批动效夹具**（通过导入被测树的 `checks/motion.ts` 真代码，夹具从该树 `motion.test.mjs` 中提取 `bad`/`good` 模板串，不复刻），dump 命中集合 `文件 | gate | rule | severity | line`：

```
改前（8 条）：bad.css | EM-1 | ease-in-on-enter | error | line 2 / line 9
             bad.css | EM-1 | ease-in-on-enter | warn  | line 4 / line 7
             bad.css | EM-2 | scale-zero-on-enter | error | line 12 / line 14
             bad.css | EM-3 | will-change-misuse | warn | line 16
             bad.css | EM-4 | overlong-transition | warn | line 18
             good.css：0 条
```
改后按 `EM-3→EM-1 / EM-17→EM-3 / EM-5→EM-4` 归一号 → **与改前逐行 diff 为空**（`diff /tmp/b.txt /tmp/a2.txt` 零输出）。

**V2 无残留**：`checks/` 内 `"EM-1"`/`"EM-4"` 命中 **0**；全仓旧号（`EM-1`/`EM-4` 挂在 ease-in/时长上）**0**；`EM-11` 全仓仅 2 处且均为「EM-11~EM-16 视觉层」正当引用；无任何文档仍写 `will-change = EM-3`。

**V3 测试**：`node checks/run-tests.mjs` = **8/8 文件 · 113 断言**；`~/.bun/bin/bun checks/run-tests.mjs` 同结果；`node tests/self-test.ts` 全过。断言数与 Phase 8 相同（纯改号，未增删断言）。

**V4 真产物**：`~/Desktop/Test/designs/geo-dashboard.html` → **0 error / 3 warn / 7 info · PASS-WITH-WAIVER**，3 条 warn = `gate 2`(`:314` 纹理) + `gate 24`(`:409` 10px) + `DR-A7`(无 skip-to-content) —— 与 Phase 8 末态**逐条相同**。

**V5 收口**：7 处 skill 副本（`~/.pi/agent/skills/design-references`(symlink) · `~/.agents/skills/design-references`(真身) · workbuddy · codex · claude · trae-ide · trae-work）+ pi extension 副本，`diff -r` **全部零输出**；部署副本自跑 113 断言全过。

### 指纹

| 字段 | 值 |
| --- | --- |
| `designReferencesHash` | **`sha256:fe9d20b20e956ee6`**（Phase 8：`sha256:b891206f88ee2a0d` —— 本次共享件被改，必然变化） |
| `registryGenerated` | `428f9d917785`（**未变**：资源行/路由未动，只改散文行；`registry.md` 解析器只收 `^\|` 表格行） |
| `registryResourceCount` | `103`（未变） |
| `extensionVersion` / `hallmarkRuleVersion` | `1.2.0` / `1.1.0`（未 bump） |

独立复算：`skillTreeHash("skills/design-references")` 与 `skillTreeHash("/Users/huanghaohai/.agents/skills/design-references")` 均 = `sha256:fe9d20b20e956ee6` ✓。

### 三共享件 sha256（供 DSH 字节核对，改后终态）

```
registry.md   c8ddcfbbdfaf8f1be25ee1a0e6a8b39ed88030a25934e286a030792daf5f7cba
workflow.md   2591764d116d15816b1196ee3beb944b62c59dfbed1c7e8f6874657694e014f1
ui-quickfix.md 1858c2fe1080bf38d7272cc8a928d9f87c44cb1a1dd0d328d3afeb4a5901f507  ← 本轮未改（同 Phase 8）
```

（另：`SKILL.md` = `32f3592abd7c985a680c24e78e6e956aec5bb65bdee842f51ae1ca1b91679c7f`。本轮改了 `SKILL.md`，故若 DSH 侧要对齐整树指纹，`SKILL.md` 也需同步复制——它不在原定"三共享件"里，但**在技能树指纹覆盖范围内**。）

---

## 3. DSH 跟进清单（顺序敏感）

1. **先取共享件新值**（整文件复制，勿手改）：
   - `workflow.md`：sha256 应为 `2591764d116d15816b1196ee3beb944b62c59dfbed1c7e8f6874657694e014f1`
   - `registry.md`：sha256 应为 `c8ddcfbbdfaf8f1be25ee1a0e6a8b39ed88030a25934e286a030792daf5f7cba`
   - `SKILL.md`：sha256 应为 `32f3592abd7c985a680c24e78e6e956aec5bb65bdee842f51ae1ca1b91679c7f`
   - `ui-quickfix.md` 无需取（与 Phase 8 同值）。
2. **改 DSH 侧 will-change 编号 `EM-11` → `EM-17`**（§0 表格三处：代码 + 注释 + 2 条测试断言）。
3. **改 `KNOWN_RULE_GAPS` 删除清单**：`EM-11` → `EM-17`；`EM-1/EM-4/EM-5` 保留（由 gate 10/14 + 独立 gate 覆盖，登记语义不变）。
4. **不必**取上游 `motion.test.mjs` / `layout.test.mjs` / `tool-smoke.test.mjs` / `pi-harness.mjs`（各自主张）。
5. **自跑生成器**（`registryGenerated` 各自主张）→ 两侧比**技能树指纹**，应同为 `sha256:fe9d20b20e956ee6`。
6. 若 DSH 也维护 `inject-map.md` / README 式文档：按 §1「工单之外的补齐」逐条对齐（这几处是**文档口径**，不进契约，但会进各自仓库文档一致性）。

---

## 4. 门规三轴审查（4 个 reviewer 子 agent 并行，提交前跑）

| 轴 | 结论 | 采纳的修复 |
| --- | --- | --- |
| ponytail（反过度工程） | 代码侧无过度工程；文档侧三处"同规则多写" | ① 编号段位句三连 → 压成一句 ② `motion.ts` 头部删与 workflow.md 重复的枚举，只留指针 ③ `registry.md` symlink 三连 → 一句 |
| code-review · Standards | 7 条硬约定 6 条干净；**1 处违规**：`motion.ts` 新注释写裸 `workflow.md` | ④ 改精确真源路径 `skills/design-references/references/workflow.md` |
| code-review · Spec | §1.1/§1.3/§1.4 落实；**§1.2② 映射句漏 EM-17**（真半改，3/4 reviewer 独立命中） | ⑤ 映射句补 `EM-17`；另按建议补 EM-3「入场」释义 |
| neat-freak | 全仓无同号双义（9 文件逐号核过）；6 列 × 103 行资源表零掉格；**SKILL.md「六栏」与表头首列「资源」对不位** | ⑥ 改「六项必填」；另按建议在 `inject-map.md` 补 EM-5 豁免面（`accordion`）、`motion.ts` 头部 EM-2 补「静止态」 |

未采纳（记录理由）：
- **`extensionVersion` 1.2.0 → 1.3.0**（reviewer 建议，给下游变更信号）：本轮只是 gate 标签变更、无新能力，且 bump 会牵动 pi 侧 reload 核验口径；留待下次功能变更时一起 bump。
- **旧号→新号迁移说明放 README 而非独立 CHANGELOG**：本仓无 CHANGELOG 段，README 维护段是最接近的位置。

---

## 5. 留待裁定（不阻塞，等用户看）

1. **`SKILL.md` 是否并入"共享件"清单**：本轮它被改（§1.4），且它在技能树指纹覆盖内 → 严格说 DSH 必须同步它才能对齐指纹。建议下轮把共享件清单从「三件」改为「`references/*` + `SKILL.md`」。
2. `interfaces.dev` 与 `emilkowalski/skills` 是否要在 `registry.md` 各补**独立资源行**（Phase 8 遗留）。
3. `skills/design-references/SKILL.md` 与 `references/registry.md` 的旧矛盾（「五栏」vs「六栏」）本轮以「六项」收口，若 DSH 侧口径不同请回执指出。

---

## 6. 校验命令速查（可复制）

```bash
# 上游末态
cd ~/my-pi-skills && git log --oneline -1 && git status --short

# 指纹
cat extensions/design-router/data/manifest.json
node -e 'import("/Users/huanghaohai/my-pi-skills/extensions/design-router/scripts/skill-hash.mjs").then(async m=>console.log(await m.skillTreeHash("skills/design-references")))'

# 测试（两种跑法）
node extensions/design-router/checks/run-tests.mjs
~/.bun/bin/bun extensions/design-router/checks/run-tests.mjs
node extensions/design-router/tests/self-test.ts

# 编号残留（应为 0）
grep -rn '"EM-1"\|"EM-4"' extensions/design-router/checks/
grep -rn 'EM-11' extensions/design-router skills/design-references   # 只应剩「EM-11~EM-16 视觉层」引用

# 部署副本一致性（7 处 + extension）
diff -r -q ~/my-pi-skills/skills/design-references ~/.agents/skills/design-references
```
