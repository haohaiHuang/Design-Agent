# 回执 · Phase 10（上游侧）— DR-A4 元素级解析 + 新资源行

- 日期：2026-09-30
- 上游仓库：`~/my-pi-skills`（**改动已就绪，未提交** —— 按门规等用户确认）
- 前序：Phase 9 = `e4ae451`（HEAD == `origin/main`）
- 依据工单：`~/Desktop/DSH/Chat/上游跟进-Phase10-DR-A4元素级与新资源行-2026-09-30.md`
- DSH 侧对应：`4435a08`（DR-A4 改元素级 + 工单归档）；Phase 9 同步 = `7a04d26`

> ⚠️ **本轮有 1 条需 DSH 跟进的偏差**：工单 §1 参考实现里的 `\b(...|@click)` **自带缺陷**（`@` 是非词字符，`\b@click` 永不成立）——上游照抄后**把 Vue `@click` 的检测从「能报」变成「不报」，是一处真回归**（复现证据见 §2.1）。上游已修（一行正则），**DSH 需同修法跟进**，否则两侧在 Vue 模板上永久不一致。

---

## 1. 实现

### §1 DR-A4 改元素级（`checks/a11y.ts`）

- 新增 `openTags(content, tagNames)`（`:15-39`）：按开标签取属性文本，逐字符跟踪引号与 `{}` 深度 —— 与工单参考**语义等价**（引号状态机 / `depth` 与 `Math.max(0,depth-1)` / `>` 仅 depth===0 断 / 行号 `slice(0,index).split("\n").length` 全部逐点一致），`gate`/`rule`/`severity`/`message` **逐字节相同**（message byte-identical ✓）。
- DR-A4 主体（`:139-155`）改走 `openTags(c, "div|span|li|td")`。
- **额外加固（工单参考未涵盖，见 §2.1 理由）**：属性判定改用两条带否定式后顾的正则，替代参考里的 `\b(...)`：

  ```ts
  const CLICK_ATTR = /(?<![-\w])(?:@click|onclick)\s*=/i;     // 修 @click 回归 + 排除 data-onclick + 大小写
  const KEYBOARD_ATTR = /(?<![-\w])(?:role\s*=|tabindex\b)/i; // 排除 data-tabindex="x"
  ```

### §2 registry 新资源行 `emilkowalski/skills`

- `references/registry.md:155`：文本与工单 §2.2 **逐字节一致**（python 比对 byte-identical），落在 C 区，**位置按工单「紧邻 Fluid Functionalism 行、即现 `:154` 之后」** → 现序为 FF(`:154`) → emilkowalski(`:155`)。
- `scripts/build-registry.mjs:114` 新 slug 映射 `["emilkowalski-skills", "emilkowalski/skills"]`（置于 `fluid-functionalism` 之前；核实无更早关键词命中新行名，首个生效匹配不撞车）。
- `scripts/build-registry.mjs:352` `ROUTES.C2[2]` 追加 `emilkowalski-skills`。
- 生成物：`registry.json` 新条目六格与 registry.md 逐字节相等；`slug`/`quality:"未评估"`/无 `bucket` 均符合生成器规则（无桶 ⇒ 不进 `design_route`）。

### 工单之外顺手修的三处既有文本缺陷（各 1 行）

| 文件 | 现状 → 修正 | 依据 |
| --- | --- | --- |
| `references/registry.md:154`（FF 行·未改动行） | 退化链 `→ GitHub 直读（\`STANDARDS.md\`）` → 补前缀 `skills/review-animations/STANDARDS.md` | `workflow.md:322` 明文禁令；新行按全路径写导致同表自相矛盾 |
| `extensions/design-router/inject-map.md:47` | 「**原生**元素绑点击但键盘不可达（DR-A4）」→ **非原生** | 与 `README.md:39` 及 DR-A4 语义相反（漏字） |
| `tests/self-test.ts:31` | 注释「下限故意留松（45 对 103）」→ 104 | 资源数已 103→104；断言本体是 `>= 45` 不受影响 |

---

## 2. 验收（V1–V5）

### V1 · DR-A4 行为（三类证据）

**2.1 跨实现对跑（上游 `checks/a11y.ts` vs DSH `plugins/design-router/checks/a11y.mjs`，同一批夹具、同一归一化 `gate|rule|severity|location`）**

| 夹具 | 上游（本轮回执态） | DSH（`4435a08`） | 一致？ |
| --- | --- | --- | --- |
| minified 单行（工单原夹具） | `DR-A4` + `DR-A8` 各 1 | 同 | ✅ |
| `<div onClick={() => go()} role="button">` | 0 | 0 | ✅ |
| `<div onClick={() => go()}>` | 1 | 1 | ✅ |
| `<div role="button" tabindex="0" onclick>` | 0（只报 CS-2） | 0 | ✅ |
| 跨行开标签 `<div\n onclick=…>` | 1 | 1 | ✅ |
| **Vue `<div @click="go()">`** | **1** | **0** ❌ | **DSH 需跟进** |
| **`<div data-onclick="go()">`** | **0** | **1** ❌ | **DSH 需跟进** |
| **`<DIV ONCLICK="go()">`** | **1** | **0** ❌ | **DSH 需跟进** |

**2.2 旧 vs 新（同仓，证明「修的就是那些漏报」且无意外行为漂移）**

```
minified.html      旧=[DR-A8]                     新=[DR-A4, DR-A8]   ← 工单要修的漏报
multiline.html     旧=[]                          新=[DR-A4]          ← 同源第二处漏报（`<div` 与 onclick 不同行）
data-onclick.html  旧=[DR-A4]                     新=[]               ← 假阳性修正
upper.html         旧=[]                          新=[DR-A4]          ← 大小写补全
vue.html           旧=[DR-A4]                     新=[DR-A4]          ← 回归已修（未修时=0）
其余夹具           同                               同
```

**回归复现（`node -e` 实测，修前）**：`/\b(onclick|onClick|@click)\s*=/.test(' @click="go()"')` = **false**（旧的**行级**正则 `<(div|span|li|td)\b[^>]*(onclick|onClick|@click)\s*=` = **true**）→ 即照抄工单参考会让 Vue DR-A4 静默失效。修后 = true。

**2.3 真实产物：DR-A 读数逐条不变（无新增误报）** —— 4 个真实页面（`关于当前运营板块改造的想法.html` / `wireframe-v5.html` / `optics-workshop/index.html` / `m1-project-tree-wireframe.html`）旧 vs 新 `gate|rule|severity|location` 集合**完全相同**（0 / 1 / 1 / 0 条）。

> 说明：Phase 8/9 用的 `~/Desktop/Test/designs/geo-dashboard.html` **已不存在**（该目录已删），故本轮改用上述 4 个真实产物；旧树 = `fed170e` 全量副本跑同一批文件。

### V2 · 测试

```
node checks/run-tests.mjs         → 8/8 文件通过，共 121 断言
~/.bun/bin/bun checks/run-tests.mjs → 8/8 文件通过，共 121 断言
node tests/self-test.ts           → ✅ 全部自检通过
```

断言 113 → **121**（a11y 新增 **8** 条，全部有区分度：minified 单行 / 跨行 / JSX `>` 截断 / Vue `@click` / 大小写 / `data-onclick` / 分工不变 / DR-A8 同行），README 两处已同步为 121。

### V3 · registry 行

C 区 ✓ · 六项全填 ✓ · 退化链 `→ GitHub 直读（\`skills/review-animations/STANDARDS.md\` 等）` 带前缀、无裸文件名 ✓ · 行内无 `|`（解析器裸 `|` 切格，逐行核实 6 格）✓ · 文本与工单 §2.2 逐字节一致 ✓ · `registry.json` 六格逐字节相等（非手敲）✓

### V4 · 工具实跑（真调，非静态推断）

```
design_lookup(C2, 2) 含 emilkowalski: true
  → 输出含独立小节「### emilkowalski/skills（动效工程技能集：…（`review-animations` 的 `STANDARDS.md` = …」+ 来源行
design_route("动效设计 / 网页落地页") 含 emilkowalski（应 false）: false   ← 无 bucket，未污染风格桶
资源数 104（manifest.registryResourceCount，由 resources.length 派生，非写死）
```

### V5 · 收口

- 生成器重跑 ✓（`integration.test.mjs` 字节比对绿 = `registry.json`/`manifest.json` ≡ registry.md 重生成结果）
- `./install-design-router.sh --all-platforms` ✓ → 7 处 skill 副本（`~/.agents` 真身 + pi symlink + workbuddy/codex/claude/trae-ide/trae-work）`diff -r` **零输出**；pi extension 副本 ✓
- 副本内容级核对：a11y.ts 含 `openTags`、manifest 为 104（rsync `-a` 保 mtime，**不以 mtime 作证据**）

### 指纹三件套（终态）

| 字段 | 值 |
| --- | --- |
| **技能树指纹 `designReferencesHash`** | **`sha256:5c462378b7a2b0ab`**（Phase 9：`sha256:fe9d20b20e956ee6`） |
| **`registryGenerated`** | **`6c6a53d65e6c`**（Phase 9：`428f9d917785`） |
| **`registryResourceCount`** | **104**（103 → 104） |
| `extensionVersion` / `hallmarkRuleVersion` | `1.2.0` / `1.1.0`（未 bump） |

```bash
# 供 DSH 字节核对（终态 sha256）
skills/design-references/references/registry.md   2b405555a257849aba443f8f6bd49e4056037541177646748729cb063767ab79   ← 本轮改了（新行 + FF 行补前缀 + 行序）
skills/design-references/references/workflow.md   2591764d116d15816b1196ee3beb944b62c59dfbed1c7e8f6874657694e014f1   ← 未改（同 Phase 9）
skills/design-references/references/ui-quickfix.md 1858c2fe1080bf38d7272cc8a928d9f87c44cb1a1dd0d328d3afeb4a5901f507  ← 未改
skills/design-references/SKILL.md                 32f3592abd7c985a680c24e78e6e956aec5bb65bdee842f51ae1ca1b91679c7f   ← 未改（同 Phase 9）
```

独立复算：`skillTreeHash("skills/design-references")` 与 `skillTreeHash("/Users/huanghaohai/.agents/skills/design-references")` 均 = `sha256:5c462378b7a2b0ab` ✓

---

## 3. DSH 跟进清单（顺序敏感）

1. **取共享件新值**（**整文件复制**，勿手改）：`registry.md` sha256 应为 `2b405555a257849aba443f8f6bd49e4056037541177646748729cb063767ab79`（改了它，其余三件未变）。复制后技能树指纹应为 `sha256:5c462378b7a2b0ab`。
2. **DR-A4 属性判定同修法跟进（建议，属行为对齐非契约）**：把 `CLICK_ATTR` / `KEYBOARD_ATTR` 两条正则照搬（`(?<![-\w])(?:@click|onclick)\s*=/i` 与 `(?<![-\w])(?:role\s*=|tabindex\b)/i`），并补同名 3 条测试。**不做也行，但请登记为 `KNOWN_RULE_GAPS` 里的既有差异**——现在这 3 个夹具有真实分歧（上表 ❌ 三项），不登记会让 §对账脚本的「未登记差异 exit 1」直接报警。
3. **接 ROUTES**：把 `emilkowalski-skills` 挂到自己的 `C2 · 环节 2`（短名单各自主张）。
4. **重跑生成器** + 对账（资源行 104 + slug 一致 + 规则族）。
5. 若 DSH 侧也有 `inject-map.md` 式文档：`:47` 的「原生 → 非原生」同修；`tests/self-test.ts` 式注释里的 103 → 104。

---

## 4. 门规三轴审查（4 个 reviewer 子 agent 并行，提交前跑）

| 轴 | 结论 | 采纳 |
| --- | --- | --- |
| ponytail | 无过度工程；`openTags` 不重复既有 `grepLines`/`parseCss`（行级/CSS 专用，表达不了元素级），字符扫描是正确最小版；唯一冗余是新增测试里有 1 条无区分度 | 重构测试块：删无区分度那条，换成 8 条**各自能区分实现**的断言 |
| code-review · Standards | ①–⑧ 中 7 条通过；1 处违反：新行名称栏引用 `STANDARDS.md` 等未写精确路径 | 名称栏文本**保持与工单逐字节一致**（工单 §2.2 是共享契约值），改为把同表 FF 行的裸路径补齐（§1 表格） |
| code-review · Spec | §1 参考语义等价（含 message 逐字节）；§2.2 文本一致；§2.3 挂载 ✓；**揪出 `\b@click` 回归（本轮唯一 🔴）** + 4 条边界缺陷 | 修回归 + `data-onclick` 假阳 + 大小写 + `data-tabindex`；§同时发现**跨行开标签**是第二处漏报，补测试 |
| neat-freak | ①–⑤ 中 113 残留 0、118 静态核算正确、引用无漏、a11y 注释与元素级一致；报 3 处旧文本 | `self-test.ts:31` 103→104、`a11y.test.mjs:2` 头注释范围改「DR-A3 ~ DR-A8」、`inject-map.md:47` 漏「非」字 |

未采纳（记录理由）：
- **`openTags` 去掉 `tagNames` 参数硬编码**（ponytail 建议）：保留参数能防未来第二个 tag 集合调用点分叉；一行成本换一个扩展点，判为划算。
- **测试第 3 条「只报 CS-2」的正向半句**（Spec 指出只验了「不报 DR-A4」）：CS-2 属 `checks/cheat.ts`，`runA11yChecks` 不含它；在 a11y 测试里断言 CS-2 会引入跨模块依赖 → **改为在回执里说明**（CS-2 由 `tests/self-test.ts` 的 cheat 夹具覆盖）。

---

## 5. 留待裁定（不阻塞）

1. **台账（`resources/design-references.md`）是否登记新行**：`references/registry.md` 维护协议「增」明确要求「**同步台账**」，但该台账是**手维护的旧层**（23 个编号条目，含 Kami/logo-generator 等 C 类），**Phase 6–9 新增的资源全都不在里面** → 系统性漂移，不是本轮引入；只补这一条反而更不一致。**建议二选一**：① 声明台账为「阶段性人工索引」并从维护协议里删掉「同步台账」步骤；② 把 104 条资源一次性对齐（一次大改）。等你裁。
2. **`inject-map.md:47` 与其它文档**：本轮顺手修了「原生→非原生」，若 DSH 侧有同句请同修。
3. **`/Desktop/Test/designs/` 已不在**：Phase 8/9 回执引用的真实产物路径失效（本轮已换用 4 个真实页面）。若你想保留一个固定的「真产物」测试样本，建议放进仓库或另设固定路径，否则每次回执的证据对象都会漂。
