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

**当前基线（2026-09-29）**

| 量 | 值 |
| --- | --- |
| 技能树指纹 | `sha256:b188827d92fc0094`（9 处副本一致） |
| `registry.md` 文件指纹 | `sha256:8b6d51e422e56cdce415e377beb5e1b524782e5681f6188353d52c65d08c73aa` |
| `registryGenerated` | 上游 `cfbd65fc5e50` / DSH `22ab4157ed14`（不同属预期） |
| 资源条目 | 两侧均 **103** |

## 流程约定（两仓改动怎么走）

1. 先写切片：目标、判据、**精确改动**、归属与顺序、验收命令、非目标、回执模板；
2. 共享文件（`registry.md`）只有上游改 → DSH 随后整文件复制并校验逐字节一致；
3. 各自仓库的文件各自改，**不同时编辑同一路径**；
4. 每阶段回执 + 交叉验收（另一方独立重跑校验，不照抄回执）；
5. 收尾把切片与回执归档到本目录。
6. **归档件的修订归属**：切片/回执由产出方写在共享工作区（`~/Desktop/DSH/Chat/`），**归档进本目录由 DSH 侧落笔**；
   上游若需修正归档内容（如基线值过期），写进回执的同时可**直接改本目录文件**，但须在回执里列明改了哪几个文件，
   并**由 DSH 侧 review 后提交**（维持「不两边同时编辑同一路径」）。表格与结构由 DSH 维护——插在表格行之间会打断表格，一律写在表后。
