# 上游跟进清单 · Phase 9：EM 编号统一 + 三条共享件收口

**日期**：2026-09-30
**前置**：上游 Phase 8 = `fed170e`；DSH 已完成 Phase 9 的 DSH 侧 = `0afec30`（补齐 DR-A 家族 + EM-11 + CS-2 分工对齐）
**契约**：不变（资源行 + slug 一致 · ROUTES 各自主张 · extra 池各自主张）
**唯一该相等的值**：技能树指纹（改完本条清单里的共享件后会再变一次，DSH 按你们给的新值同步）

---

## 0 · DSH 侧已经做完的（你们只需核对语义，不必改 DSH）

| 项 | 内容 | 证据 |
| --- | --- | --- |
| DR-A 家族补齐 | `DR-A3/A4/A7/A8/A5` 移植进 `checks/a11y.mjs`，文案与严重级与上游逐字一致 | 真实产物 `geo-dashboard.html`：DSH 与上游现在**完全同数** `10 项（error 0 / warn 3 / info 7）`（此前 DSH 少报 DR-A7） |
| EM-11 | 新增「`will-change` 用在非合成属性」（上游 `motion.ts` 旧编号 `EM-3`），编号依共享 `workflow.md` 口径 | 跨实现 fixture ⑩ 两侧行为一致 |
| CS-2 分工 | DSH 版原把 `<div onclick>` 也收进 `CS-2` → 补上 DR-A4 后同一行会报 🔴+🟡；已改为只管 `role="button"`（用上游文案） | fixture ⑦ 两侧 gate 集合一致；新增回归测试锁分工 |
| 工具冒烟 | 6 个工具逐个真调（补「调用了未 import 的 `*Checks`」这类只有真跑才炸的漏洞） | 单测 26/26 |
| 对账脚本修假绿 | 原只比数字 gate，对 `DR-*/KS-*/CS-*/EM-*` 家族完全失明；现数字 gate 按文件比、规则族按全体并集比 + `KNOWN_RULE_GAPS` 登记表（未登记差异与登记过期都退出 1） | 负例验证退出码 1 |

**跨实现行为对齐**：10 个 fixture（纹理渐变 / 真 clip:text / 跨块 / 微调间距 / 布局级 / DR-A3/A4/A7/A8 / will-change）+ 真实产物，两侧 gate 集合**逐条相同**（编号归一后）。

---

## 1 · 上游要做的四件事

### 1.1 `extensions/design-router/checks/motion.ts`：按共享文档改编号（**行为不变，只改 id**）

共享 `workflow.md` 的 EM 口径是：EM-1 `transition: all`（由 gate 10 覆盖）/ EM-2 入场 `scale(0)` / **EM-3 UI 上 `ease-in`** / EM-4 刻意动画用内置 `ease-out` / **EM-5 UI 时长 >300ms** / EM-6…EM-10。
上游 `motion.ts` 现在把其中两件事编成了 EM-1 / EM-4，并与文档的 EM-1（`transition: all`）**直接撞号**：

| 上游现在 | 语义 | 改为 |
| --- | --- | --- |
| `EM-1` | 进入方向用 `ease-in` | **`EM-3`** |
| `EM-4` | 进入方向时长 > 300ms | **`EM-5`** |
| `EM-3` | `will-change` 用在非合成属性 | **`EM-11`**（新号，见 1.2） |
| `EM-2` | 进入方向 `scale(0)` | 不变 ✓ |

改动点：`report("EM-1", …)` → `report("EM-3", …)`；`report("EM-4", …)` → `report("EM-5", …)`；`report("EM-3", …)` → `report("EM-11", …)`；模块头注释的四行清单同步；相关 fixture/测试里引用这些 id 的断言同步（`checks/motion.test.mjs`）。

### 1.2 `skills/design-references/references/workflow.md`（**共享件**）

① EM 清单里补第 11 条（现清单到 EM-10）：

```
EM-11 `will-change` 用在非合成属性（只应用 transform/opacity/filter）
```

② 「机器实现映射」那句（现文：`EM-2/EM-3/EM-5 为 design_audit 独立 gate；EM-1 由 gate 10 覆盖、EM-7 由 gate 14 覆盖、EM-8 由 gate 27 覆盖`）补上 EM-11：

```
EM-2/EM-3/EM-5/EM-11 为 design_audit 独立 gate；EM-1 由 gate 10 覆盖、EM-7 由 gate 14 覆盖、EM-8 由 gate 27 覆盖
```

### 1.3 `skills/design-references/references/registry.md`（**共享件**）：维护协议补 symlink 说明

在「维护协议（增删改必走）」表后补一句（我们此前一直留作「未裁定」，本轮**裁定为补**）：

```
**改共享件后的重装**：改动 `registry.md` / `workflow.md` / `ui-quickfix.md` / `SKILL.md` 任一文件后，都要重跑生成器
并重装各平台副本（`./install-design-router.sh --all-platforms`）。注意**副本里可能有 symlink**：pi 侧
`~/.pi/agent/skills/design-references` 是指向 `~/.agents/skills/design-references` 的符号链接，真身只有一份——
对 symlink 路径写入会直接改到真身，判断「哪几处副本需要更新」时要把 symlink 目标算进去。
```

### 1.4 `skills/design-references/SKILL.md:142`（**共享件**）：五栏 → 六栏（裁定）

现文：`新增资源前先登记进 registry.md（角色/形态/层级/适用场景/退化链五栏必填）`
与 `registry.md:9`「**六栏**全填（含精确来源）」矛盾。**裁定以六栏为准**（`registry.md` 是资源登记的唯一真相源，且表格实际列就是 6 项 + 资源名）：

```
新增资源前先登记进 registry.md（角色/形态/层级/适用场景/退化链/精确来源六栏必填；精确来源写 URL/仓库/本地路径，禁止只写名称），站不住位置的不装；与现有资源同型的不装。
```

---

## 2 · 验收清单

| # | 断言 | 手段 |
| --- | --- | --- |
| V1 | `motion.ts` 行为不变、只有 id 变：同一批动效 fixture 的**命中集合**与改前逐条相同（把新旧 id 归一后比） | 改前先存一份基线输出，改后 diff |
| V2 | 上游侧不再出现 `EM-1`/`EM-4`（`grep -rn '"EM-1"\|"EM-4"' checks/`）且 `EM-11` 存在 | grep |
| V3 | `checks/run-tests.mjs`（现 8 文件 113 断言）+ `tests/self-test.ts` 全绿 | 实跑 |
| V4 | 上游 `design_audit` 对 `~/Desktop/Test/designs/geo-dashboard.html` 仍为 `10 项（error 0 / warn 3 / info 7）`、gate 集合与本清单 §0 相同 | 实跑 |
| V5 | 改完共享件：重跑生成器 + `./install-design-router.sh --all-platforms`；把**新技能树指纹 + 三个共享件的 sha256** 写进回执，DSH 侧据此整文件同步并核对（两侧应同值） | 常规收口 |

---

## 3 · 顺带登记的已知限制（不要求本轮改）

- **DR-A4 是行级判定**：同一行里出现 `role=`/`tabindex` 会整行跳过，于是 **minified 单行 HTML 会漏报 DR-A4**（两侧同实现，DSH 侧测试夹具已按逐行写）。要根治得做元素级解析——属于新工作，先登记。
- `motion.ts` 的 `EM-1/EM-4` 与文档 EM-1 撞号这件事说明：**共享文档里的编号是跨仓契约的一部分**，以后新增编号请在文档里先登记，再在两侧实现。

---

## 4 · 完成后请回执

`回执-Phase9-上游-EM编号统一与共享件收口-YYYY-MM-DD.md`，含：改动 diff 摘要 / V1–V5 证据 / **新技能树指纹 + 三个共享件 sha256** / 更新的 `registryGenerated`。
DSH 侧收到后做：整文件同步 → 重跑生成器 → 对账（9 处副本 + 规则族）→ 删除 `KNOWN_RULE_GAPS` 里已对齐的 EM-1/EM-4/EM-5/EM-11 登记 → 归档回执。
