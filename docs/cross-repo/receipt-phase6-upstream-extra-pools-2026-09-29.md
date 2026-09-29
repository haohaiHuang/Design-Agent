# 回执 · Phase 6（上游侧）· EXTRA 池键序与校验漏挂

**日期**：2026-09-29
**侧**：上游 `~/my-pi-skills`（未提交，**待确认**）
**切片**：`EXTRA池键序与校验漏挂-双端工作切片-2026-09-29.md`（已按用户裁定修订）
**起止基线**：`ea43201`（`origin/main`）→ **`f57d056`（已推送，`HEAD == origin/main`）**；提交含 7 文件改动 + 1 新增文件
**后续**：本回执 §7 遗留项 ①③ 已在 **Phase 7 `81172ad`** 收口（见 `回执-Phase7-上游-pi侧收口-2026-09-29.md`）。

---

## 1 · 裁定落地（D1–D4）

| 项 | 裁定 | 落地 | 证据 |
|---|---|---|---|
| **D1** | 根因 = 任务相关池混进任务无关入口 → `design_lookup` **不再合并** `logoExtra`；`logoExtra` 只由 `design_route` 消费；5 个 R 源挪键 `1`，键 `2`/`4` 保留 | ✅ | `index.ts:666-674`（合并删除）· `index.ts:479-495`（专项段） |
| **D2** | `HALLMARK_EXTRA[4] += kill-ai-slop` | ✅ | `build-registry.mjs:374-377` |
| **D3** | `logo-background-styles` **排除**，理由写 `build-registry.mjs` 注释（**不碰 `registry.md`**） | ✅ | `build-registry.mjs:370-371`；`git diff --stat -- skills/` = 空 |
| **D4** | 新增 V 类挂载不变量（原"次层级 orphan 检测"判据撤回） | ✅ | `tests/self-test.ts:76-92` |

**实现时对 D1 建议的追加修正（超出"专项段读 `[1] ∪ [2]`"）**：专项段改为**遍历全部键**并按环节标注 —— 严格照原文只读 `[1]∪[2]` 会让键 4 的 `logo-quality-floor`（V 类）失去全部入口（详见 §3-1）。

---

## 2 · 改动摘要

```
 extensions/design-router/README.md                 |  6 +++---
 extensions/design-router/checks/integration.test.mjs |  2 +-
 extensions/design-router/data/manifest.json        |  2 +-
 extensions/design-router/data/registry.json        | 11 ++++++---
 extensions/design-router/index.ts                  | 18 +++++++++---
 extensions/design-router/scripts/build-registry.mjs | 13 +++++++---
 extensions/design-router/tests/self-test.ts        | 29 ++++++++++++++++---
 7 files changed, 62 insertions(+), 19 deletions(-)
+ extensions/design-router/checks/pool-scope.test.mjs（新增，未跟踪）
```

- `LOGO_EXTRA`：`{2:[6 项]}` → `{1:[5 个 R 调研源], 2:["logo-design-patterns"], 4:["logo-quality-floor"]}`（键 = 该资源服务的环节）
- `HALLMARK_EXTRA[4]`：`["hallmark-slop-test"]` → `["hallmark-slop-test","kill-ai-slop"]`
- `design_lookup`：删除 `...(registry.logoExtra[stage] || [])`；**保留** `hallmarkExtra` / `cheatExtra` 合并
- `design_route` logo 专项段：`logoExtra[2]`（6 项）→ 全部键（7 项，带 `环节 N` 标注）
- `checks/pool-scope.test.mjs`：新增端到端检查（跑真 `index.ts`，11 断言）
- `registry.json` / `manifest.json`：重生成

**未动**：`registry.md`（及 `skills/` 下任何文件）、`ROUTES`、`BUCKETS`、`ROUTING`、`QUALITY_LEVELS`。

---

## 3 · 验证证据（V2–V6）

### V2/V3 — `bun checks/pool-scope.test.mjs`（node 同样 11/11）
```
✅ logoExtra 键为 ["1","2","4"]（1 调研源 / 2 原则 / 4 底线），实际 ["1","2","4"]
✅ logoExtra[1] 恰为 5 项 ["logggos","logo-archive","logoinspo","logosystem","logobook"]
✅ logoExtra[2] 恰为 1 项 ["logo-design-patterns"]
✅ logoExtra[4] 恰为 1 项 ["logo-quality-floor"]
✅ design_route(logo) 有「专项资源」段
✅ design_route(logo) 列出 logoExtra **全部 7 项**（含键 2/4）
✅ design_lookup 36 格均不含任务相关池（logoExtra）
✅ design_lookup 仍合并 hallmarkExtra（环节 2 禁忌清单）
✅ design_lookup 仍合并 cheatExtra（环节 2 细节 craft）
✅ 环节 4 校验清单成对：kill-ai-slop + hallmark-slop-test
✅ logo-background-styles 有意排除出 logo 池（只在 B1·2 海报）
```
**V3 口径按用户裁定收窄到全环节**（9 分支 × 4 环节 = 36 格循环，未退化为只查环节 2）。

### V4 — 不回归
- `checks/run-tests.mjs`：**6/6 文件 · 97 断言**（改前 5/86；+1 文件 +11 断言）；`bun` / `node` 两跑法同结果。
- `tests/self-test.ts`：全过 → `主层级零路由 0`、`V 类零挂载 0`、无缺 slug（本轮 `deadRefs` 已扩到三个 extra 池）、指纹回环/键序一致。
- 空池仍恰为 `B3·1` / `C3·1`（`B3·4` / `C2·4` 由 `hallmarkExtra[4]` 填满 —— README 与 `integration.test.mjs` 注释已同步改写）。

### V5 — 变异验证（均 /tmp **整套仓库**副本，源仓库未动）

| 变异 | 期望 | 实测 |
|---|---|---|
| 专项段退回只读 `[1]∪[2]`（= C1 回归） | ❌ | `❌ …全部 7 项（含键 2/4）（缺：logo-generator 图形质量底线…）` exit 1 |
| 删 `LOGO_EXTRA[4]` | ❌ | `❌ logoExtra 键为 […] 实际 ["1","2"]` + `AssertionError: V 类资源不得零挂载：logo-quality-floor` |
| 清空 `LOGO_EXTRA[2]` | ❌ | `❌ logoExtra[2] 恰为 1 项 […] 实际 []` |
| 键 1 换序 | ❌ | `❌ logoExtra[1] 恰为 5 项 […] 实际 ["logo-archive","logggos",…]` |
| 删 `LOGO_EXTRA[1]` | ❌（非崩溃） | 键集断言 + 成员断言双报，exit 1 |
| `CHEAT_EXTRA` 加死 slug `bogus-slug` | ❌ | `AssertionError: 路由/extra 池引用了不存在的 slug：bogus-slug` |
| `design_lookup` 恢复合并 `logoExtra`（旧口径） | ❌ | 45 格泄漏全列（`A1·1…C3·1`）→ 印证"只挪键不摘合并"无用 |

### V6 — 确定性 / 部署
- 生成器纯重跑：`registry.json` + `manifest.json` **零 diff**。
- `install-design-router.sh --all-platforms`：自检全过；部署副本 `index.ts` / `build-registry.mjs` / `registry.json` / `manifest.json` / `pool-scope.test.mjs` / `README.md` 与工作区 `cmp` 零输出；5 个平台技能副本一致；部署副本跑 `checks/run-tests.mjs` = **6/6 · 97**。
- **共享件指纹未变**：技能树 `sha256:b188827d92fc0094`；`registry.md` `8b6d51e422e56cdce415e377beb5e1b524782e5681f6188353d52c65d08c73aa`。

---

## 4 · 审查发现与处置

提交门三轴（ponytail 内嵌 / code-review 双轴子 agent 并行 / neat-freak）共揪出 **2 Critical + 5 Warning**，**全部本轮处置**：

- **C1 · `logoExtra[4]` 死键（实现引入的回归）**：`logo-quality-floor` 摘合并后失去唯一入口，而 self-test 的"入池 = 挂载"判据把它算作已挂载 → 绿灯掩盖"登记后无人调用"。**已修**：专项段遍历全部键 + 新增可达性断言；self-test 注释已写明"入池只证明登记，入口由 pool-scope 管"。
- **C2 · 新检查在旧 node 上无限自重生成**：委派 node 的守卫未区分"bun"与"无 API 的旧 node"（实测模拟 12 秒 529 进程）。**已修**：只有 `process.versions.bun` 才委派；否则打印所需版本 + `exit 1`（实测 0.02 秒响亮失败）。
- **W1–W3（测试强度）**：哨兵从数据导出改**具名钉死**（原写法在成员被静默删除时会跟着缩水，测试照过）；补键集断言；哨兵覆盖全量池名而非仅键 1。
- **W4/W5**：`?.` 兜底 + `r.error` 打印。
- **W-B（既有缺口，顺手补）**：`deadRefs` 原只查 routes，现覆盖三个 extra 池 → 池里写死 slug 会报错。
- 全部修复经**增量聚焦复核**（第二个 reviewer 子 agent）：**0 Critical**，结论"可提交"；复核中追加发现的 W-A（键 2 成员无守卫）已同轮补掉。

---

## 5 · 指纹收口

| 值 | 旧 | 新 |
|---|---|---|
| 上游 `registryGenerated` | `cfbd65fc5e50` | **`0204dbab6441`** |
| ↳ **追记（Phase 7 `81172ad`）** | `0204dbab6441` | **`428f9d917785`**（Phase 7 改了 `registry.md` 文案 → 载荷哈希随之变） |
| 技能树指纹 | `sha256:b188827d92fc0094` | **不变** |
| ↳ **追记（Phase 7 `81172ad`）** | `sha256:b188827d92fc0094` | **`sha256:800b810967d6b9ad`**（Phase 7 补 emil 动效真源路径，`registry.md` + `workflow.md` 各改 1 行） |
| `registry.md` sha256 | `8b6d51e4…d08c73aa` | **不变** |
| ↳ **追记（Phase 7 `81172ad`）** | `8b6d51e4…d08c73aa` | **`bd0b1bac614833bc…`** |
| 上游 `manifest.json` | — | `{"extensionVersion":"1.2.0","hallmarkRuleVersion":"1.1.0","registryGenerated":"0204dbab6441","designReferencesHash":"sha256:b188827d92fc0094","registryResourceCount":103}` |

> 活基线一律改名新值；旧值仅在本回执/切片中作历史记录，不改归档件的历史行。

---

## 6 · 需 DSH 知会 / 自行决定

1. **同段代码同现象**：DSH `index.mjs:294` 也按 stage 无条件合并 `logoExtra`（`B1·2` / `A2·2` / `C1·2` 等被塞 5 个 logo 源）→ 是否按**同一修法**跟进由 DSH 决定（不同轮、不锁契约、不阻塞）。
2. **`checks/` 文件集变了**：上游新增 `checks/pool-scope.test.mjs`（会随 `install` 分发到各平台）→ DSH `plugins/design-router/scripts/check-checks-sync.mjs`（比对 gate 覆盖 + 9 处副本）可能报 diff，由 DSH 侧处理。
3. **契约**：按用户裁定，跨仓契约只有 ① 资源行 + slug 一致 ② ROUTES 各自主张；**extra 池 = 各自主张**。本回执不要求 DSH 对齐任何 extra 池内容。
4. `tests/` 不下发（install `--exclude 'tests/'`）→ 核验 DSH 侧时勿用 `tests/self-test.ts` 作为对象。

---

## 7 · 状态

- 上游：**已实现 + 已部署到 6 平台副本 + 全绿**，**已于 `f57d056` 提交并推送**（`HEAD == origin/main`，用户 2026-09-29 授权）。
- 工作区：0 未提交。
- 遗留（不阻塞本轮，留待下轮规格侧）：① `integration.test.mjs` 的"空池恰为 `B3·1`/`C3·1`"仅锁阶段 1 新增、未锁"已登记空池被填上"；② `resources.length > 0` 下限过松；③ `._*` / `.swn` / `.swm` / `.Spotlight-V100` 等垃圾类型未覆盖。
