# 回执 · Phase 2（上游侧）— manifest 指纹根治

**切片**：`manifest-指纹根治-双端工作切片-2026-09-29.md`
**上游提交**：`6dfe534`（已推 `origin/main`）— `fix(design-router): manifest 用技能树指纹取代自指字段 designReferencesSource`
**改动静止点**：三处副本指纹 `sha256:b188827d92fc0094`，与 Phase 1 期望一致

---

## 1 · §6 模板逐条

```
Phase 2 完成
- 新增 scripts/skill-hash.mjs（§2.1 函数体逐字节同切片；★ 另加一行空树守卫 + 改写头注释，见 §2）
- registry.json.generated = sha1 内容指纹（上游本就是，非日期）✅
- manifest.json：删 designReferencesSource 与 git rev-parse 段（含腐烂回退值 26b97f1）；
  新增 designReferencesHash = sha256:b188827d92fc0094、registryResourceCount = 103 ✅
- integration.test.mjs 的 normalize 补丁：已删（并顺带根治"跑校验套写脏工作区"，见 §3）
- V1 三处树指纹：sha256:b188827d92fc0094（实际扩到 7 个安装位置，全同）
- V2 manifest（上游）：{"extensionVersion":"1.2.0","hallmarkRuleVersion":"1.1.0",
                      "registryGenerated":"945475faa86c",
                      "designReferencesHash":"sha256:b188827d92fc0094",
                      "registryResourceCount":103}
- V3 纯重跑零 diff：通过
- V4 generated 一致性：通过（上游 945475faa86c；DSH 35c9b616a774 —— 两侧不同属预期）
- V5 上游测试套：5/5 文件 86 断言 通过；自测 11 项通过
```

## 2 · 与切片的两处偏差（其一需 DSH 定）

**① `skill-hash.mjs` 非逐字节同 §2.1（唯一实质偏差）**

函数体逐字节相同，差异仅两处：

| 位置 | 切片 §2.1 | 上游落法 | 原因 |
|---|---|---|---|
| 第 1 行头注释 | `// scripts/skill-hash.mjs —— 供生成器与一致性脚本共用` | 改写为实际关系（生成器用；一致性靠重跑生成器比字节，检测端不重复算法） | 原注释失实：`grep` 实测 checks/ 并未 import 它 |
| `return` 前 | — | `if (lines.length === 0) throw new Error(...)` | Standards 轴 Critical：空树会静默产出 `sha256:e3b0c44298fc1c14`（`sha256("")`），空壳目录会被判"指纹一致" |

**守卫对任何非空树的指纹值零影响**（与 DSH 侧旧实现逐目录比对全同：技能树/scripts/checks/tests/data 五个目录 SAME）。
**建议 DSH 在 Phase 3 同步这一行**，否则两副本差异 = 头注释 + 守卫两处；不同步则三处"机械比对"仍成立（值不受影响），但空树静默这条风险只在 DSH 侧留存。

**② 超出 §2.2/§2.3 的改动（均为文档/测试同步，无行为风险）**

- `README.md:28`、`README.md:68`：字段名同步 + 重跑触发面纠正（脚本、常量、**整棵技能树任一文件**）
- `checks/integration.test.mjs:36-38` 注释：同上措辞
- `tests/self-test.ts` 新增第 9 节 `testSkillHash()`：空树报错 / 格式 / 确定性 / 内容敏感（含子目录）/ manifest 对账；变异测试证明非恒真（删守卫、篡改 manifest、守卫改死代码三种变异全部被拦，还原后全绿）

## 3 · 附带根治：校验套不再写脏工作区

`integration.test.mjs` 的 normalize 补丁有个连带缺陷：当**仅有 `designReferencesSource` 不同**时 `drifted === false` → 不触发还原 → 字节其实已被生成器改写而无人察觉。表现就是跑完校验套 `git status` 变脏（前一轮已诊断）。
删掉补丁后：同步态跑校验套 `data/*.json` 字节不变（实测 sha256 前后相同），改文件后未重跑则 ❌ 且还原原字节。
**提交后再跑一次生成器：`git status --porcelain` 为空** —— 自指字段真死，不再需要补 chore 提交（对比上一轮的 `26a2af3`）。

## 4 · 未落地、留给 DSH 定夺的 4 条发现

审查报出但**单侧改会动跨仓契约/改变数值**，故未动：

1. **双指纹盲区（实证）**：`registryGenerated` 只含 `{resources, routes, buckets, routing, bucketNotes}`，`designReferencesHash` 只含技能树。
   把 `LOGO_EXTRA` 加一项后重跑：`registry.json` 字节变了，**两个指纹都不变**。
   未被任何指纹覆盖的生成物字段：`logoExtra / hallmarkExtra / cheatExtra / qualityLevels / source`。
   → 若要补，属字段规范变更（会改 `registryGenerated` 的值），两侧必须同轮做。
2. **树指纹对垃圾文件敏感**：walk 不过滤点文件，三副本中任一处出现 `.DS_Store` / 编辑器临时文件即误报不一致。
   → 过滤会改函数语义（当前无此类文件，故值不变），交 DSH 定。
3. **DSH 副本 `skill-hash.mjs` 头注释 11 行 JSDoc vs 切片 §2.1 单行** → 与 §2.1「逐字节相同」字面不符（仅注释、算法体一致）。
4. **旧有瑕疵（非本次引入）**：`integration.test.mjs` 生成器崩溃时 `after === before` → 漂移检查打 `✅ 与生成器输出一致`，与被后一行 `❌ 生成器可跑通` 自相矛盾（判定仍为失败，只是输出误导）。未改，避免继续扩大本次 diff 面。

## 5 · Phase 3 提示

- 逐字节锚点：`sha256(skills/design-references/references/registry.md) = 8b6d51e422e56cdce415e377beb5e1b524782e5681f6188353d52c65d08c73aa`（本切片未改其内容，实测仍为该值）
- DSH 的 `check-checks-sync.mjs` 若用技能树指纹对账，上游值 = `sha256:b188827d92fc0094`（含 `~/.agents`）；**同步守卫后仍为该值**
- `registryGenerated` 两侧不同属预期：上游 `945475faa86c` / DSH `35c9b616a774`（ROUTES 有意分叉）
