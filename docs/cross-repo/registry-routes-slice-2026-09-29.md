# registry 路由修订 · 双端工作切片（2026-09-29）

**参与方**：DSH 侧（`~/Desktop/DSH/Chat/Design-Agent`，本文件作者）· 上游侧（`~/my-pi-skills`，Pi）
**目标**：修掉三处路由语义错误 + 给"有意分叉"留痕；**不追求两仓库路由短名单一致**。
**状态**：Phase 1（DSH）与 Phase 2（上游）**均已完成并交叉验收**，见 §8 / §9。

---

## 0 · 已核实事实（不要再重复讨论，如需推翻请给新证据）

| 结论 | 证据位置 |
| --- | --- |
| **openpencil 已在目录里**：两侧 `registry.md` 都有它的行，`registry.json` 里是 `E/次`，且已挂 `A1·1 / A2·1 / A3·1` | `registry.md` E 表 OpenPencil 行；上游提交 `a874833`（"从 workflow 常驻段移入 registry 数据层"） |
| **"16 条登记不可达" 数字不成立**：按"有资源行但未进任何 分支·环节 短名单"统计 = 上游 **47** 条（主 3 / 次 33 / 兜底 11）、DSH **32** 条（主 2 / 次 21 / 兜底 9） | 见 §5 校验脚本 `check-unrouted` |
| **mobbin 语义矛盾成立（仅上游）**：上游 `level=主`、零路由；DSH 已挂 `A1·1` | 见 §5 校验脚本 |
| **Mobbin 应挂 A1·1（APP），不是 A2·1（网页）**：它是 iOS/Android 真实 APP 截图库 | 资源行场景字段："APP / 网页 / Mac（真实 APP 截图库）" |
| **"主层级零路由"实际上游 3 条**（mobbin / `design-md` / `design-research-methods`）、**DSH 2 条**（后两条） | 见 §5 校验脚本 |
| **poster 错位：上游真错、DSH 反向错**。上游 `B1·2/B1·4` 挂落地页子集；DSH 把全集铺进 `A1·2/A2·2`，而子集 `poster-compositions-landing` **零路由** | 见 §5 校验脚本 |
| **两侧路由短名单从未一致，也不该一致**：36 个 分支·环节 格子中 27 同 / 9 不同，差异集中在 `A1·1`（5 vs 14）、`A2·1`（14 vs 29）、`C1·1`（22 vs 27） | 见 §5 校验脚本 |
| **DSH 短名单偏胖的成因**：`A2·1` 比上游多的 15 条全部来自 2026-08-28 书签批量导入的灵感画廊 | 见 §0 附表 |

**DSH `A2·1` 比上游多的 15 条**（全部 `次`/`兜底`）：
`recent-design`、`awwwards`、`siteinspire`、`landbook`、`one-page-love`、`lapa-ninja`、`muzli`、
`inspora`、`footer-gallery`、`cta-gallery`、`navbar-gallery`、`supahero`、`design-spells`、`threeui`、`loadmore`

---

## 1 · 共同认可的三条原则（本切片的判据）

1. **短名单 ≠ 目录**。`registry.md` 是可读全量目录；`design_lookup` 的 分支·环节 短名单是**策划结果**，只收"`主` 层级 + 需求特征命中项"。**不做"全挂"**。
2. **`主` = 必看 → 必须至少出现在一个短名单里**。出现"主层级零路由"即视为缺陷（本轮修 3 条）。
3. **两维度分开**：
   - **资源行 + slug**：两侧必须一致（同一资源两处不同名 = 换机看不见）；
   - **路由短名单（ROUTES）**：各自主张，互不追求一致，但必须**留痕**说明是有意分叉。

---

## 2 · 工作项与归属

| 编号 | 工作项 | 归属 | 是否碰共享文件 |
| --- | --- | --- | --- |
| **W1-DSH** | 补 `design-md`、`design-research-methods` 的路由 | DSH | 否（只改 `build-registry.mjs` ROUTES） |
| **W2-DSH** | poster 归位：`A1·2`/`A2·2` 换 `poster-compositions-landing`；`B1·2`/`B1·4` 保留全集 | DSH | 否 |
| **W3** | DSH 短名单收敛：15 条画廊移出 `A2·1` | DSH | 否 |
| **W4-DSH** | DSH 侧留痕注释（`ROUTES` 上方） | DSH | 否 |
| **W1-UP** | 同上补 3 条（含 `mobbin → A1·1`） | 上游 | 否 |
| **W2-UP** | poster 归位：`B1·2`/`B1·4` 的 `poster-compositions-landing` → `poster-compositions` | 上游 | 否 |
| **W4-UP** | 上游侧留痕注释（`ROUTES` 上方） | 上游 | 否 |
| **W4-RMD** | `registry.md` 维护协议插入留痕那一句（**整行原样插入**，见 §3） | 上游 | **是（唯一共享文件，仅上游可改）** |

**文件所有权（硬约束）**：
- `registry.md`（两个仓库各一份）：**只有上游能改内容**；DSH 侧通过**整文件复制**同步，不单独编辑。
- DSH 的 `plugins/design-router/**`：只有 DSH 侧改。
- 上游的 `extensions/design-router/**`：只有上游侧改。
- 两侧不得同时编辑同一路径 → 本切片下不存在冲突。

---

## 3 · 精确改动清单

### 3.1 路由改动（两侧各自的 `build-registry.mjs` 的 `ROUTES`）

**W1（两侧）**——把 `主` 层级补进短名单：

| 资源 | 角色/层级 | 加到 | 理由 |
| --- | --- | --- | --- |
| `mobbin` | R / 主 | **`A1·1`**（上游）；DSH 已有 | 真实 APP 截图库 → APP 分支的调研环节。**不是 A2·1** |
| `design-md` | C / 主 | `A1·2`、`A2·2`、`A3·2` | "选定参考的设计系统文件"是**约束环节**的输入；且它是 `主`，不能零路由 |
| `design-research-methods` | V / 主 | `A1·1`、`A2·1` | UX 研究方法（访谈/共情图/旅程图…）用在**调研环节**；场景声明是 "APP / 网页" |

`mobbin` 是否同时挂 `A2·1`（网页也要 app 参考）**由各侧自行判断**：DSH 不挂（保持 A2·1 精简），上游若挂请在本切片回执里注明。

**W2（两侧，方向相反）**——子集/全集归位：

| 侧 | 现状 | 改为 | 原则 |
| --- | --- | --- | --- |
| 上游 | `B1·2`、`B1·4` 挂 `poster-compositions-landing` | 换成 `poster-compositions`（全集） | 海报分支的海报环节要用**海报全集**；落地页子集不属于 B1 |
| DSH | `A1·2`、`A2·2` 挂 `poster-compositions`（全集）；`poster-compositions-landing` 零路由 | `A1·2`、`A2·2` 换成 `poster-compositions-landing`；`B1·1/B1·2/B1·4` 保留全集 | 网页分支用**落地页子集**；子集资源不得零路由 |

两侧改完后，各分支的 `poster-*` 归属应满足：
`A*` 网页/APP → `poster-compositions-landing`；`B1`/`B2` 海报·杂志 → `poster-compositions`。

**W3（仅 DSH）**——`A2·1` 收敛：移出 §0 附表那 15 条（`recent-design` … `loadmore`），
保留 `refero-design`、`aceternity`、`21st-dev`、`boardui`、`watermelon-ui`、`linear-dark`、`saasui-dashboard`、
`dash-ui`、`dembrandt`、`openpencil`、`undraw`、`component-gallery`、`unsplash`、`pexels`
→ `A2·1` 由 **29 → 15 条**（移除 15 条画廊、保留 14 条、再由 W1 加入 `design-research-methods`）；
与上游 W1 后的 `A2·1`（14 + `design-research-methods` = 15）**内容一致**（顺序不同不算差异）。
被移出的条目**仍留在 `registry.md` 目录**（只是不进短名单）——这正是原则 1。
若确实想保留某个画廊，正确做法是**在 `registry.md` 把它升为 `主`**（行级改动，由上游做），而不是破例塞短名单。

### 3.2 留痕文本

**W4-RMD**：`registry.md` 的「维护协议（增删改必走）」表格**之后**，原样插入这一行（前后各留一个空行）：

```
> **路由短名单是各仓库自有策划**：本仓库 `ROUTES`（`scripts/build-registry.mjs`）只收「`主` 层级 + 需求特征命中项」，是策划结果而非全量索引（全量目录是本文件）。**不追求与 DSH 侧一致**；跨仓回流只回流**资源行与通用规则**，路由各自主张。
```

**W4-UP**（上游 `build-registry.mjs`，`const ROUTES = {` 上方）：

```js
// 本仓库 ROUTES 是自有策划短名单（只收「主」+ 需求命中），不追求与 DSH 侧一致：
// 两仓库共享的是资源行与 slug（资源目录必须一致），路由各自主张。
// 跨仓回流只回流资源行与通用规则；路由改动请只在各自仓库进行。
```

**W4-DSH**（DSH `build-registry.mjs`，`const ROUTES = {` 上方）：

```js
// 本仓库 ROUTES 是自有策划短名单，不追求与上游 my-pi-skills 一致（两仓库共享资源行与 slug）。
// 历史：2026-08-28 书签批量导入曾把 15 条灵感画廊塞进 A2·1（29 条），导致 design_lookup 过于灵敏；
// 2026-09-29 按「短名单 = 主 + 需求命中」收敛到 14 条。此后新增画廊一律先看是否该在
// registry.md 升为「主」，不要直接塞短名单。
```

---

## 4 · 执行顺序（含交接屏障）

| 阶段 | 谁 | 做什么 | 交付物 |
| --- | --- | --- | --- |
| **Phase 1** | DSH（本侧） | `W1-DSH`、`W2-DSH`、`W3`、`W4-DSH` → 重生成 `registry.json`/`manifest.json` → 自测 → 提交**不推送**前先回报 | DSH 提交哈希 + §5 全部校验输出 |
| **Phase 2** | 上游（Pi） | `W4-RMD`（原样插入那句）→ `W1-UP`、`W2-UP`、`W4-UP` → 重生成 → 自测 → 提交 | 上游提交哈希 + §5 全部校验输出 |
| **Phase 3** | DSH（本侧） | 复制 Phase 2 的 `registry.md` 到 DSH 仓库 + `~/.agents/skills/`，重跑生成器（仅 manifest ref 变化）→ 校验 `registry.md` **逐字节一致** → 提交 | 收尾提交哈希 |
| **Phase 4** | 任一侧 | 跑 §5 的共享校验（`slug-parity` / `registry.md` 一致）作为双端验收 | 验收记录 |

**为什么 DSH 先做**：DSH 的改动全在自有文件里（不依赖上游），先做可以立刻降低"参考过于灵敏"的实际影响；
上游需要做的只有 1 句 `registry.md` + 3 条路由，可以随后从容跟进。
**Phase 3 不能省**：否则两仓库 `registry.md` 会出现字节差异（DSH 少了那句留痕）。

---

## 5 · 验收标准与校验脚本（两侧都跑）

**A. 通用（两侧都必须满足）**

```bash
# A1 资源行集合与 slug 两仓库一致（`ROUTES` 差异不计）
node -e "const U=require('/Users/huanghaohai/my-pi-skills/extensions/design-router/data/registry.json'),D=require('/Users/huanghaohai/Desktop/DSH/Chat/Design-Agent/plugins/design-router/data/registry.json');const u=new Set(U.resources.map(x=>x.slug)),d=new Set(D.resources.map(x=>x.slug));console.log('上游',u.size,'DSH',d.size,'| 差异',[...u].filter(x=>!d.has(x)).concat([...d].filter(x=>!u.has(x))).length)"

# A2 主层级零路由 = 0（本轮核心指标）
node -e "for(const [l,p] of [['上游','/Users/huanghaohai/my-pi-skills/extensions/design-router/data/registry.json'],['DSH','/Users/huanghaohai/Desktop/DSH/Chat/Design-Agent/plugins/design-router/data/registry.json']]){const r=require(p),hit=new Set();for(const s of Object.values(r.routes))for(const a of Object.values(s))for(const x of a)hit.add(x);const bad=r.resources.filter(x=>x.level==='主'&&!hit.has(x.slug)).map(x=>x.slug);console.log(l,'主层级零路由:',bad.length?bad.join(', '):'0 ✅')}"

# A3 poster 归属：A* 用子集、B1/B2 用全集
node -e "for(const [l,p] of [['上游','/Users/huanghaohai/my-pi-skills/extensions/design-router/data/registry.json'],['DSH','/Users/huanghaohai/Desktop/DSH/Chat/Design-Agent/plugins/design-router/data/registry.json']]){const r=require(p);for(const slug of ['poster-compositions','poster-compositions-landing']){const out=[];for(const [b,s] of Object.entries(r.routes))for(const [k,a] of Object.entries(s))if(a.includes(slug))out.push(b+'·'+k);console.log(l,slug.padEnd(28),out.join(', ')||'（零路由）')}}"

# A4 无重复资源
node -e "for(const [l,p] of [['上游','/Users/huanghaohai/my-pi-skills/extensions/design-router/data/registry.json'],['DSH','/Users/huanghaohai/Desktop/DSH/Chat/Design-Agent/plugins/design-router/data/registry.json']]){const r=require(p),c={};for(const x of r.resources)c[x.slug]=(c[x.slug]||0)+1;const dup=Object.entries(c).filter(([k,v])=>v>1);console.log(l,'条目',r.resources.length,'| 重复',JSON.stringify(dup))}"
```

**B. 分侧**

| 侧 | 命令 | 期望 |
| --- | --- | --- |
| DSH | `node plugins/design-router/index.test.mjs` | `tests 17 / pass 17 / fail 0` |
| DSH | `node plugins/design-router/scripts/check-checks-sync.mjs <上游 checks 目录>` | `✅ 全部 checks 与 pi 版 gate 覆盖一致` |
| DSH | `node -e "…design_lookup A2·1…"` | 短名单 **14 条**，不含那 15 条画廊；`A1·2`/`A2·2` 出现 `poster-compositions-landing` |
| 上游 | `cd extensions/design-router/checks && node run-tests.mjs` | `5/5 个文件通过，共 86 断言` |
| 两侧 | 重生成后检查 `manifest.json` | `registryResourceCount` 仍为 **103**（本轮不加资源行） |

**C. Phase 3 专项**

```bash
diff -rq /Users/huanghaohai/my-pi-skills/skills/design-references \
         /Users/huanghaohai/Desktop/DSH/Chat/Design-Agent/skills/design-references   # 期望：无输出
diff -rq /Users/huanghaohai/Desktop/DSH/Chat/Design-Agent/skills/design-references \
         /Users/huanghaohai/.agents/skills/design-references                          # 期望：无输出
```

---

## 6 · 明确不做（非目标）

- ❌ 把 47 / 32 条未挂资源"全挂"进短名单（会直接把上下文里塞满；且违背原则 1）。
- ❌ 追求两仓库 `ROUTES` 一致（`A1·1`/`A2·1`/`C1·1` 允许保持差异）。
- ❌ 在 DSH 侧单独编辑 `registry.md`（所有权归上游；DSH 只做整文件同步）。
- ❌ 顺手改资源行内容/层级（除 §3 明确列出的路由改动外，行级改动另行开切片）。

---

## 7 · 上游回执模板（Phase 2 完成后贴回）

```
Phase 2 完成
- registry.md 留痕句：已按 §3.2 原样插入（提交 <hash>）
- W1-UP：mobbin→A1·1 [已/未挂 A2·1]；design-md→A1·2,A2·2,A3·2；design-research-methods→A1·1,A2·1
- W2-UP：B1·2/B1·4 的 poster-compositions-landing → poster-compositions
- W4-UP：ROUTES 上方注释已加
- 校验：A1 差异 0 / A2 主层级零路由 0 / A3 poster 归属正确 / A4 无重复 / 上游测试套 5/5 86 断言
- 上游 ROUTES 现有差异（可选）：A1·1 …条、A2·1 …条、C1·1 …条
```

---

## 8 · Phase 1 回执（DSH 侧，2026-09-29）

- **W1-DSH**：`design-md` → `A1·2`/`A2·2`/`A3·2`；`design-research-methods` → `A1·1`/`A2·1`（`mobbin` 原本已在 `A1·1`）
- **W2-DSH**：`A1·2`/`A2·2` 的 `poster-compositions` → `poster-compositions-landing`；`B1·1`/`B1·2`/`B1·4`/`B2·2` 保留全集
- **W3**：`A2·1` 由 29 → **15** 条（移除全部 15 条书签画廊，保留 14 条，+ `design-research-methods`）
- **W4-DSH**：`build-registry.mjs` 的 `const ROUTES` 上方已加留痕注释（含 2026-08-28 书签导入的历史说明）

**校验输出（改后）**

```
A1 资源行/slug：上游 103 / DSH 103 | 差异 0
A2 主层级零路由：上游 mobbin, design-md, design-research-methods（待 Phase 2）| DSH 0 ✅
A3 poster：DSH poster-compositions → B1·1,B1·2,B1·4,B2·2；poster-compositions-landing → A1·2,A2·2 ✅
A4 无重复：DSH 条目 103 | 重复 []
B  DSH 单测 17/17；gate 覆盖与 pi 版一致 ✅
实测 design_lookup：A2·1 15 条（不含画廊）；A1·2/A2·2 含 DESIGN.md 与「落地页子集」；A1·1 含 UX 研究方法
（`mobbin` 不在 `A2·1` —— 按 §3.1 该项由各侧自行判断，DSH 选择不挂）
```

---

## 9 · Phase 2 验收与 Phase 3 收尾（DSH 侧，2026-09-29）

### 9.1 对上游 Phase 2 的独立核验（不是照抄回执）

| 检查项 | 结果 |
| --- | --- |
| `registry.md` 留痕句 | ✅ **与切片文件逐字一致**（`grep -qxF` 通过），出现 1 次，位置正确（「版本号写入规范」之后、「改 registry.md 后重跑…」之前） |
| W1-UP | ✅ `mobbin → A1·1`（未挂 A2·1，与 DSH 一致）；`design-md → A1·2/A2·2/A3·2`；`design-research-methods → A1·1/A2·1` |
| W2-UP | ✅ `B1·2`/`B1·4` 已换回全集；上游 `poster-compositions-landing` 仅剩 `A2·2` |
| W4-UP | ✅ `const ROUTES` 上方注释已就位 |
| 上游测试套 | ✅ 5/5 文件、86 断言 |

### 9.2 Phase 3 中的一处修正（切片 §3.1 W2 的口径过宽）

切片 §3.1 原写「`A*` 网页/APP → `poster-compositions-landing`」，Phase 1 据此把 DSH 的 `A1·2` 也换成了落地页子集。
**依据技能自身定义修正**：`workflow.md` 写的是「**A 网页** = hero/首屏单屏构图用落地页子集」——A1 是 **APP** 分支，不该挂落地页子集。
Phase 3 已把 `poster-compositions-landing` 从 DSH 的 `A1·2` 移除（`A1·2` 现为 `kami-skeleton / refero-design / design-md-skill / design-md`）。
修正后两侧 poster 归属**完全一致**。切片 §3.1 的该行口径已在下一版按此收窄（网页分支才用子集）。

### 9.3 联合验收（Phase 3 后）

```
A1 资源/slug 一致       上游 103 / DSH 103 | 差异 0
A2 主层级零路由         上游 0 | DSH 0
A3 poster 归属          全集 → B1·1,B1·2,B1·4,B2·2（两侧相同）；子集 → A2·2（两侧相同）
A4 重复资源             上游 [] | DSH []
B  DSH 单测 17/17；上游测试套 5/5 文件 86 断言；gate 覆盖一致
C  上游 == DSH 仓库 == ~/.agents/skills（三处逐字节一致）
ROUTES 剩余差异         33 格相同 / 3 格不同（见 9.4，属有意分叉）
```

### 9.4 剩余有意分叉（不再收敛，已留痕）

| 格子 | 上游 | DSH | DSH 多出的条目 |
| --- | --- | --- | --- |
| `A1·1` | 7 | 15 | `recent-design`、`awwwards`、`siteinspire`、`landbook`、`one-page-love`、`lapa-ninja`、`muzli`、`inspora`（8 条画廊） |
| `C1·1` | 22 | 27 | `footer-gallery`、`cta-gallery`、`navbar-gallery`、`supahero`、`design-spells` |
| `C2·1` | 4 | 5 | `threeui` |

`A2·1` 已两侧一致（15 条），故不在差异表内。
**后续可选切片**：若要继续治"参考过于灵敏"，`A1·1` 与 `C1·1` 是同一类问题（书签批量导入留下的画廊），
可按同一判据（短名单只收「主」+ 需求命中）继续收敛；本轮不做，避免一次改动面过大。
