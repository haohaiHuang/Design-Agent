# cross-repo — DSH 与上游 `my-pi-skills` 的跨仓协议与工作切片

这里存放**两仓协作的正式记录**：共同认可的工作切片（谁改什么、验收标准、交接顺序）与上游回执。
放在仓库内的原因：下个 agent（或下个人）不需要翻聊天记录，就能知道"哪些东西必须两仓一致、哪些是有意分叉、怎么验"。

## 文件索引

| 本目录文件 | 工作区原名 | 内容 |
| --- | --- | --- |
| `registry-routes-slice-2026-09-29.md` | `registry-双端工作切片-2026-09-29.md` | **路由修订切片**：修 `主` 层级零路由、poster 子集/全集归位、DSH `A2·1` 短名单收敛、给"有意分叉"留痕。含 Phase 1–3 回执与联合验收 |
| `manifest-fingerprint-slice-2026-09-29.md` | `manifest-指纹根治-双端工作切片-2026-09-29.md` | **manifest 指纹根治切片**：删自指字段 `designReferencesSource`、改内容派生指纹、树指纹对账。含 Phase 1–5 回执与最终基线 |
| `receipt-phase2-upstream-manifest-fingerprint-2026-09-29.md` | `回执-Phase2-上游-…md` | 上游侧 Phase 2 回执（全文原样归档） |
| `receipt-phase4-upstream-manifest-fingerprint-2026-09-29.md` | `回执-Phase4-上游-…md` | 上游侧 Phase 4 回执（全文原样归档） |
| `receipt-phase5-reconciliation-2026-09-29.md` | `回执-Phase5-收尾-双端对账-2026-09-29.md` | 上游侧 Phase 5 双端对账回执：契约锚点全绿、路由 7 格分叉分类、`logoExtra` 漏挂裁定与修复、Phase 6 待办清单 |
| `extra-pools-and-mount-checks-slice-2026-09-29.md` | `EXTRA池键序与校验漏挂-双端工作切片-2026-09-29.md` | Phase 6 切片：EXTRA 池键语义（D1）、漏挂补挂（D2/D3）、V 类挂载不变量（D4）；含被撤回的「三池必须一致」契约 |
| `receipt-phase6-upstream-extra-pools-2026-09-29.md` | `回执-Phase6-上游-EXTRA池键序与校验漏挂-2026-09-29.md` | 上游 Phase 6 回执：任务相关池移出 `design_lookup`（D1 修根因）、`kill-ai-slop` 补挂、新增 `checks/pool-scope.test.mjs` 端到端断言 |
| `receipt-phase7-upstream-source-rot-and-guards-2026-09-29.md` | `回执-Phase7-上游-pi侧收口-2026-09-29.md` | 上游 Phase 7 回执：emil 动效真源路径修正（**动了共享件** registry.md/workflow.md）、树指纹垃圾类补全、登记过期检测、下限判据分工说明 |
| `upstream-followup-gates-and-chart-readout-2026-09-30.md` | `上游跟进-闸门误报修正与环节4图表读数核对-2026-09-30.md` | 真实产物复盘产出的上游跟进清单：`checks/layout.ts` 的 gate 2 判据收窄 + gate 24 微调豁免（精确改法 + 建议测试），以及 `workflow.md` §环节 4 → 1c 要补的「图表读数逐项对齐」人工核对项（含共享件契约后果与 V1–V5 验收） |
| `receipt-phase8-upstream-gates-and-chart-readout-2026-09-30.md` | `回执-Phase8-上游-闸门修正与图表读数-2026-09-30.md` | 上游 Phase 8 回执：gate 2/24 同修法落地 + 环节 4 三条硬规则 + workflow.md/ui-quickfix.md 共享件改写 + 上游独占修复 `runNonTextContrastChecks` 缺 import（DR-6 自引入起从未真跑）+ 新守卫 pi-harness/tool-smoke |
| `upstream-followup-phase9-em-numbering-and-shared-files-2026-09-30.md` | `上游跟进-Phase9-EM编号统一与共享件收口-2026-09-30.md` | Phase 9 工单：`motion.ts` 按共享文档改 EM 编号（EM-1→EM-3 / EM-4→EM-5 / EM-3→EM-11）+ `workflow.md` 补 EM-11 + `registry.md` 补 symlink 重装说明 + `SKILL.md:142` 五栏→六栏裁定；含 V1–V5 与 DSH 侧已完成的对照 |
| `receipt-phase9-upstream-em-numbering-and-shared-files-2026-09-30.md` | `回执-Phase9-上游-EM编号统一与共享件收口-2026-09-30.md` | 上游 Phase 9 回执：`motion.ts` 按共享文档改号（EM-1→EM-3 / EM-4→EM-5 / will-change→**EM-17**，因 EM-11~EM-16 已被视觉层占用）+ `workflow.md` 补 EM-17 与编号段位句 + `registry.md` symlink 说明 + `SKILL.md` 六项必填；含门规三轴审查与 V1–V5 |
| `upstream-followup-phase10-dra4-and-new-resource-row-2026-09-30.md` | `上游跟进-Phase10-DR-A4元素级与新资源行-2026-09-30.md` | Phase 10 工单：① DR-A4 改元素级解析（附可直接照抄的 `openTags` 扫描器 + 三条建议测试，修 minified 单行漏报）；② 新资源行 `emilkowalski/skills`（裁定「补」= EM-* gate 真源、C 区转译行）+ `interfaces.dev` 裁定「不补」（同型不装）；含 V1–V5 |

> 归档件与工作区原件**逐字节相同**（未做任何改写）；仅文件名改为 ASCII，映射见上表。
> 工作区原件仍在 `~/Desktop/DSH/Chat/`。

## 两仓契约（速查）

| 维度 | 要求 | 为什么 |
| --- | --- | --- |
| **资源行 + slug**（`skills/design-references/references/registry.md`、`registry.json` 的资源集合） | **必须一致** | 同一资源在两处用不同 slug，换机/新人会以为"这个资源不存在" |
| **技能树指纹** `manifest.designReferencesHash` | **必须一致** | 它是"所有副本内容相同"的机械依据；一条命令即可对账 |
| **路由短名单** `ROUTES`（`scripts/build-registry.mjs`） | **各自主张，不追求一致**（但有留痕） | 短名单是"主 + 需求特征命中"的策划结果，两侧用户面不同；全量目录是 `registry.md` |
| **`manifest.registryGenerated`** | **两侧不同属预期** | 它哈希的是"本仓生成物"（含 ROUTES），用途是"纯重跑零 diff"+ 与本仓 `registry.json.generated` 对账 |
| `registry.md` 内容 | **只有上游能改**；DSH 通过整文件复制同步 | 单一真相源，避免两侧各改一半 |
| **三个 extra 池**（`logoExtra` / `hallmarkExtra` / `cheatExtra`） | **各自主张**（与 `ROUTES` 同类，不要求逐项相同） | 2026-09-29 裁定：曾有一条「三池必须逐项相同」的临时契约，**已撤回**——池成员由各仓按自身口径决定；`designReferencesHash` 只覆盖技能树，不含池 |

## 对账命令（DSH 侧一条命令）

```bash
# gate 覆盖一致性 + 技能树指纹（扫描所有存在的平台副本）
node plugins/design-router/scripts/check-checks-sync.mjs <上游>/extensions/design-router/checks
```

期望输出：`✅ 全部 checks 与 pi 版 gate 覆盖一致。` + 各副本同一 `sha256:…` + `✅ N 处技能副本内容一致。`

**当前基线（每次变更后更新此表；历史见下方沿革）**

| 量 | 值 |
| --- | --- |
| 技能树指纹 | `sha256:fe9d20b20e956ee6`（9 处副本一致） |
| `registry.md` 文件指纹 | `sha256:c8ddcfbbdfaf8f1be25ee1a0e6a8b39ed88030a25934e286a030792daf5f7cba` |
| `workflow.md` 文件指纹 | `sha256:2591764d116d15816b1196ee3beb944b62c59dfbed1c7e8f6874657694e014f1` |
| `ui-quickfix.md` 文件指纹 | `sha256:1858c2fe1080bf38d7272cc8a928d9f87c44cb1a1dd0d328d3afeb4a5901f507` |
| `SKILL.md` 文件指纹 | `sha256:32f3592abd7c985a680c24e78e6e956aec5bb65bdee842f51ae1ca1b91679c7f`（**在技能树指纹覆盖范围内**，改动它同样要同步各副本） |
| `registryGenerated` | 上游 `428f9d917785` / DSH `524ac50ea211`（不同属预期） |
| 资源条目 | 两侧均 **103** |
| EXTRA 池 | 各自主张（**非契约**）；两侧恰好相同：`logoExtra` 键 1/2/4、`hallmarkExtra[4]` 含 `kill-ai-slop` |

**共享件清单（2026-09-30 起）**：`skills/design-references/` 的**整棵树**都算共享件（`references/*` + `SKILL.md`），
改任一个都要重跑生成器 + 重装各平台副本（`./install-design-router.sh --all-platforms`，注意 symlink 目标只算一份），
并由 DSH 整文件复制同步后比对技能树指纹。

**已知差异（登记在案，不算漂移）**

| 项 | 内容 | 处理 |
| --- | --- | --- |
| a11y 规则族 | 上游独有 `DR-A3`/`DR-A4`/`DR-A5`/`DR-A7`/`DR-A8` | **已对齐**（DSH 补齐到 `checks/a11y.mjs`，`extractCss`/`parseCss` 移入 `types.mjs` 共用） |
| `CS-2` 语义 | DSH 版原把 `<div onclick>` 也收进 CS-2，与 `DR-A4` 重叠 | **已对齐**（只管 `role="button"` + 上游文案，回归测试锁分工） |
| 动效编号 | 上游 `motion.ts` 与共享文档编号不一致（EM-1/EM-4 撞号、will-change 无号） | **已对齐**（上游 `e4ae451` 改号；will-change 取 **EM-17**，因 EM-11~EM-16 属视觉层自查号）；`KNOWN_RULE_GAPS` 已清空 |
| `gate 14` 覆盖 | DSH 旧实现只认 `transition-property:`，**漏掉 `transition: width .3s` 简写**（第三方夹具 05-tracejam-saas 上暴露） | **已对齐**（按上游实现改为解析 CSS 规则 + `(?<!border-)` 守卫 + accordion height 豁免，回归测试锁定） |
| 文档层（无机器 gate） | 共享 `workflow.md` 里 EM-1（`transition: all`，由 gate 10 覆盖）、EM-4/EM-6~EM-10 属视觉层自查，无独立机器 gate | 非集合差异，记在此处；`KNOWN_RULE_GAPS` 只登记**编号集合**差异 |
| `DR-A4` 行级判定 | 同一行出现 `role=`/`tabindex` 会整行跳过 → minified 单行 HTML 漏报 | **DSH 已改元素级**（`checks/a11y.mjs`，含 `openTags` 扫描器与 minified/JSX 测试）；**上游待跟进**（Phase 10 工单 §1）——在此之前 minified 单行 HTML 上两侧**会分叉**（DSH 报、上游漏） |
| 遗留待定 | `interfaces.dev` 与 `emilkowalski/skills` 是否各补独立资源行 | Phase 8 遗留，未裁定 |

**基线沿革**

| 时点 | 技能树指纹 | `registry.md` | 上游 / DSH `registryGenerated` | 触发原因 |
| --- | --- | --- | --- | --- |
| Phase 1–4 | `b188827d92fc0094` | `8b6d51e4…` | `93517affeae9` / `22ab4157ed14` | 技能树指纹上线；指纹覆盖全字段 |
| Phase 5 | `b188827d92fc0094` | `8b6d51e4…` | `cfbd65fc5e50` / `22ab4157ed14` | 上游补齐 `logoExtra` 5 个 logo 源 |
| **Phase 6** | `b188827d92fc0094` | `8b6d51e4…` | `0204dbab6441` / `524ac50ea211` | 任务相关池移出 `design_lookup`（D1/D2/D4） |
| **Phase 7** | **`800b810967d6b9ad`** | **`bd0b1bac614833bc…`** | **`428f9d917785`** / `524ac50ea211` | 上游修正 emil 动效真源路径（共享件变更）+ 树指纹垃圾类补全 |
| **Phase 8** | **`b891206f88ee2a0d`** | **`6a2b577083ffbccf…`**（+ `workflow.md` `037369c2…`、`ui-quickfix.md` `1858c2fe…`） | `428f9d917785` / `524ac50ea211` | 闸门误报修正落两侧 + 环节 4 图表读数核对（共享件 workflow/ui-quickfix/registry 协议文案变更） |
| **Phase 9** | **`fe9d20b20e956ee6`** | **`c8ddcfbbdfaf8f1b…`**（+ `workflow.md` `2591764d…`、`SKILL.md` `32f3592a…`） | `428f9d917785` / `524ac50ea211` | 动效编号向文档对齐（EM-1→EM-3 / EM-4→EM-5 / will-change→EM-17）+ 共享文档补 EM-17 与编号段位句 + symlink 重装说明 + 六项必填 |

> 归档的切片/回执里的基线值属**当时**证据，不再逐个改写；以此表为当前权威值。

## 流程约定（两仓改动怎么走）

1. 先写切片：目标、判据、**精确改动**、归属与顺序、验收命令、非目标、回执模板；
2. 共享文件（`registry.md`）只有上游改 → DSH 随后整文件复制并校验逐字节一致；
3. 各自仓库的文件各自改，**不同时编辑同一路径**；
4. 每阶段回执 + 交叉验收（另一方独立重跑校验，不照抄回执）；
5. 收尾把切片与回执归档到本目录。
6. **归档件的修订归属**：切片/回执由产出方写在共享工作区（`~/Desktop/DSH/Chat/`），**归档进本目录由 DSH 侧落笔**；
   上游若需修正归档内容（如基线值过期），写进回执的同时可**直接改本目录文件**，但须在回执里列明改了哪几个文件，
   并**由 DSH 侧 review 后提交**（维持「不两边同时编辑同一路径」）。表格与结构由 DSH 维护——插在表格行之间会打断表格，一律写在表后。
