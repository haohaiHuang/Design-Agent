# 回执 · Phase 7（上游侧）· pi 侧收口（来源腐烂 / 护栏 / 登记过期）

**日期**：2026-09-29
**侧**：上游 `~/my-pi-skills` — 提交 **`81172ad`**（已推送，`HEAD == origin/main`，工作区 0 未提交）
**来源**：Phase 6 回执 §7 遗留项（用户指示：**pi 侧先搞完，DSH 才执行**）
**前置**：Phase 6 = `f57d056`（任务相关池移出 `design_lookup`）

---

## 1 · 本轮 4 件事（全部落在上游）

### ① `Fluid Functionalism` 行来源腐烂修正（唯一动共享件的改动）

- **事实**：`registry.md:154` 退化链写 `→ 官网直读`、来源栏只写官网 `https://www.fluidfunctionalism.com/`；而 EM-* 机器子集的真源按 `workflow.md:321` / `inject-map.md:62` 是 `emilkowalski/skills`。
- **实测**（`curl` GitHub API）：该仓根目录 = `.gitattributes` `.gitignore` `.pl` `LICENSE` `README.md` `performance-cheatsheet.md` `skills/`，**没有 `STANDARDS.md`**；仓库是 13 个 skill 的集合（`animate` / `review-animations` / `emil-design-eng` / `animation-vocabulary` …），真身是 **`skills/review-animations/STANDARDS.md`**（9801 B）。
- **内容核对**：该文件开头即 `# Animation Standards Reference` + 频率表（100+/日动效禁用…）+ 缓动决策序（`Never ease-in on UI`）+ 时长表 → 与 EM-1/3/4/5 语义对应，确认是真源。
- **修法（两文件各 1 行）**：
  - `registry.md`：退化链补 `→ GitHub 直读（`STANDARDS.md`）`；来源栏改为 `源 https://github.com/emilkowalski/skills（`skills/review-animations/STANDARDS.md`…）；官网 …`
  - `workflow.md:321`：裸 `STANDARDS.md` → `` `skills/review-animations/STANDARDS.md` ``（附一句防复发提示：该仓根目录无此文件）
- **解析器核验**：`build-registry.mjs` 按 `|` 裸切格 → 新文案无 `|`；资源数仍 **103**，该行解析正常（`fallback` / `source` 两字段都吃到）。

### ② `skill-hash.mjs` 垃圾过滤补全（**指纹值中性，已实测**）

- 新增：vim 连续 swap `.swo/.swn/.swm`、macOS AppleDouble `._*`、卷级目录 `.Spotlight-V100` / `.Trashes` / `.fseventsd`。
- **值中性证明**：用**旧规则**在同一棵树上重算 = `sha256:8b7076f90f4e7146`，与**新规则**一致 → 过滤补全未改值（树里当前无此类文件）。
- ⚠️ **该文件与 DSH 侧逐字节同码**：DSH 必须先取这一版，之后两侧的指纹比对才成立。

### ③ 登记过期检测（反向断言）

- `checks/integration.test.mjs`：加 `已登记空池不得过期` —— `KNOWN.emptyPool` 里的项若已不再是空池 → **失败**，提示"请从 KNOWN 移除"。
- **理由**：豁免登记会腐烂；池被填上后登记仍在，`⚠️ 已登记空池 2 处` 会把已不空的池报成空池，误导后续读者。修一行即可，所以按失败处理而非警告。
- **变异验证**：给 `B3·1` 塞 `kami-sancha` → `❌ 已登记空池不得过期（B3·1 已不再是空池，请从 KNOWN 移除）`。

### ④ `resources.length >= 45` 下限：**不改判据，只写清分工**

- 写死数量会随增删腐烂；"数量与 `registry.md` 逐行一致"由 `integration.test.mjs` 的**生成器字节比对**保证（生成器即 `registry.md → registry.json`，重跑零 diff）。下限只防"整表被清空 / 生成器读错文件"这类崩塌。现已把这段分工写成注释。

---

## 2 · 验证

| 项 | 结果 |
|---|---|
| `checks/run-tests.mjs`（node / bun） | **6/6 文件 · 98 断言**（原 97；+1 = ③） |
| `tests/self-test.ts` | 全过 |
| 生成器纯重跑 | **零 diff** |
| `install-design-router.sh --all-platforms` | 自检通过；部署副本 `cmp`（`skill-hash.mjs`/`integration.test.mjs`/`registry.json`/`manifest.json`/`README.md`）零输出；`~/.agents` 技能副本两文件一致 |
| 部署副本 `checks` | **6/6 · 98** |
| ② 值中性 | 旧规则 / 新规则同树同值 ✅ |

---

## 3 · 指纹（**最终权威值**）

| 值 | 前 | 后 |
|---|---|---|
| 上游 `registryGenerated` | `0204dbab6441` | **`428f9d917785`** |
| 技能树指纹 | `sha256:b188827d92fc0094` | **`sha256:800b810967d6b9ad`** |
| `registry.md` sha256 | `8b6d51e4…d08c73aa` | **`bd0b1bac614833bc…`** |
| `workflow.md` sha256 | — | `86ff81bbb11e56fe…` |

`manifest.json` 现值：
```json
{"extensionVersion":"1.2.0","hallmarkRuleVersion":"1.1.0","registryGenerated":"428f9d917785","designReferencesHash":"sha256:800b810967d6b9ad","registryResourceCount":103}
```

---

## 4 · 给 DSH 的跟进清单（**顺序敏感**）

1. **先同步 `scripts/skill-hash.mjs`** 到本版（逐字节同码）——否则指纹比对无意义。
2. 再整文件复制两个共享件：`references/registry.md`、`references/workflow.md` → 复制完技能树指纹应为 **`sha256:800b810967d6b9ad`**。
3. 上一轮（Phase 6）的 D1/D2/D4 按同一修法自行跟进：`index.mjs:294` 去掉 `logoExtra` 合并、logo 专项段遍历全部键、`index.test.mjs` 加 V 类挂载断言。
4. 本轮 ③ 的镜像断言（空池登记过期）自行决定是否加。
5. `data/registry.json` / `manifest.json` 由 DSH 自己的生成器重跑，`registryGenerated` 各自主张（**不要求两侧相同**）。
6. 契约**不变**：① 资源行 + slug 两侧一致；② ROUTES 各自主张；**extra 池 = 各自主张**。

---

## 5 · 状态

- 上游 pi 侧：**已收口**（`81172ad`）。Phase 6 回执 §7 的遗留项 ①②③ **全部处置**。
- 仍需你在 pi 内 `/reload`（或重启）才吃到新 extension（部署已完成）。
- 未答/留存（不阻塞）：`interfaces.dev` 与 `emilkowalski/skills` 是否要在 `registry.md` 各补一条独立资源行（现都挂在宿主行来源栏里）；前端 `~/.pi/agent/skills/design-references` 为 symlink、共享层为真身，`registry.md` 维护协议里"改共享件 → 6 平台重装"的提示可补一句"含 symlink 目标"。
