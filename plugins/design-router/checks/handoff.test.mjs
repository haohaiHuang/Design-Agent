/**
 * checks/handoff.test.mjs — HC-* 机械核对的自测
 *
 * 夹具直接复刻 2026-10-01 T2 真机暴露的形态：
 *   文书里的对比度算错（19.05 实为 17.27）、引用不存在的路径、裸文件名、
 *   文书与原型字号 clamp 互斥、原型独有色值、把 design_audit 当 shell 命令。
 * 跑法：node checks/handoff.test.mjs
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHandoffChecks } from "./handoff.mjs";

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${extra ? " — " + extra : ""}`);
  }
}

const root = mkdtempSync(join(tmpdir(), "handoff-"));
const designs = join(root, "designs");
const project = join(root, "project");
mkdirSync(join(project, "styles"), { recursive: true });
mkdirSync(designs, { recursive: true });

// 项目令牌（--paper/--ink 的真实对比度是 17.27:1，不是文书写的 19.05:1）
writeFileSync(
  join(project, "styles", "theme.css"),
  ":root { --paper:#f5f4ed; --ink:#0f1011; --brand:#5e6ad2; --radius:8px; }\n",
);
writeFileSync(join(project, "index.html"), "<!DOCTYPE html><html><body><h1>hi</h1></body></html>\n");

// 文书：复刻 T2 的六类问题
writeFileSync(
  join(designs, "DECISION.md"),
  [
    "# DECISION.md",
    "",
    "## 3. 约束集",
    "- 正文对比度 `--paper` on `--ink` = 19.05:1（真机实测口径）",
    "- 字号 `clamp(2.75rem,6.4vw,4.75rem)`",
    "",
    "## 6. 修改方向清单",
    "依据见 `designs/missing-evidence.md`；协议见 `ui-quickfix.md`。",
    "",
    "## 7. 开发交接提示词",
    "验收：跑 `design_audit project/`，error 级必须为 0。",
    "",
    "详见 `designs/reference-landing.html`。",
  ].join("\n"),
);

// 原型：字号与文书互斥，并有一个文书未登记的颜色
writeFileSync(
  join(designs, "reference-landing.html"),
  '<!DOCTYPE html><html><head><style>:root{--paper:#f5f4ed;--ink:#0f1011;--brand-ink:#4a52b8}\nh1{font-size:clamp(2.25rem,4.75vw,4.25rem)}</style></head><body><h1>x</h1></body></html>\n',
);

const F = runHandoffChecks({ designsDir: designs, projectDir: project });
const has = (gate, rule) => F.some((f) => f.gate === gate && (!rule || f.rule === rule));

console.log("runHandoffChecks 自测：");
check("HC-1 抓到不存在的引用路径", has("HC-1", "ref-unreachable"));
check("HC-1 抓到裸文件名（包外引用）", has("HC-1", "ref-bare-name"));
check("HC-2 抓到字号 clamp 互斥", has("HC-2", "clamp-mismatch"));
check("HC-2 抓到原型独有的色值", has("HC-2", "color-proto-only"));
check("HC-3 抓到对比度算错（19.05 → 17.27）", has("HC-3", "contrast-wrong"),
  F.filter((f) => f.gate === "HC-3").map((f) => f.message).join(" | "));
check("HC-4 抓到未标归属的 DSH 工具", has("HC-4", "tool-unattributed"));
check("不误报：干净的路径不报 HC-1 ref-unreachable",
  !F.some((f) => f.rule === "ref-unreachable" && f.location.includes("reference-landing.html")));

// 反向夹具：修好之后应当 0 error
writeFileSync(
  join(designs, "DECISION.md"),
  [
    "# DECISION.md",
    "## 3. 约束集",
    "- 调色板：`--paper:#f5f4ed`、`--ink:#0f1011`、`--brand-ink:#4a52b8`",
    "- 正文对比度 `--paper` on `--ink` = 17.27:1",
    "- 字号 `clamp(2.25rem,4.75vw,4.25rem)`",
    "## 7. 开发交接提示词",
    "验收：有 DSH 插件时跑 `design_audit project/`（本 Agent 的 DSH 工具，不是 shell 命令；",
    "无该工具时按变更清单逐项人工核对）。",
    "详见 `designs/reference-landing.html`。",
  ].join("\n"),
);
const F2 = runHandoffChecks({ designsDir: designs, projectDir: project });
const errs2 = F2.filter((f) => f.severity === "error");
check("修好后 0 项 error", errs2.length === 0, errs2.map((f) => `[${f.gate}] ${f.message}`).join(" | "));

// ---- HC-5 证据新鲜度 / HC-6 未定义令牌 ----
import { utimesSync } from "node:fs";
mkdirSync(join(designs, "verify"), { recursive: true });
writeFileSync(join(designs, "verify", "render-report.json"), '{"note":"修复前旧值"}');
writeFileSync(join(designs, "reference-landing.html"), '<!DOCTYPE html><html><style>h1{color:#0f1011}</style><body><h1>x</h1></body></html>\n');
// 把取证设成"比原型旧 600 秒"，并在文书里点名引用它（模拟真机：报告早于最终 css 却被当修复后实测）
const old = new Date(Date.now() - 600_000);
utimesSync(join(designs, "verify", "render-report.json"), old, old);
writeFileSync(
  join(designs, "DECISION.md"),
  [
    "# DECISION.md",
    "## 3. 约束集",
    "- 调色板：`--paper:#f5f4ed`、`--ink:#0f1011`",
    "- 正文对比度 `--paper` on `--ink` = 17.27:1",
    "修复后实测见 `verify/render-report.json`。",
    "禁用态用 `var(--paper-2)`。",
    "## 7. 开发交接提示词",
    "验收：有 DSH 插件时跑 `design_audit project/`（本 Agent 的 DSH 工具，不是 shell 命令）。",
  ].join("\n"),
);
const F3 = runHandoffChecks({ designsDir: designs, projectDir: project });
check("HC-5 抓到被引用的过期取证（error）", F3.some((f) => f.gate === "HC-5" && f.severity === "error"),
  F3.filter((f) => f.gate === "HC-5").map((f) => f.message).join(" | "));
check("HC-6 抓到未定义令牌 var(--paper-2)", F3.some((f) => f.gate === "HC-6" && f.severity === "error"),
  F3.filter((f) => f.gate === "HC-6").map((f) => f.message).join(" | "));

// ---- HC-8 反向断言（检查失明）----
mkdirSync(join(project, "src"), { recursive: true });
writeFileSync(
  join(project, "src", "page.html"),
  '<div style="transition:all .3s;background:linear-gradient(90deg,#5e6ad2,#8b5cf6)">x</div>\n',
);
mkdirSync(join(designs, "shots"), { recursive: true });
writeFileSync(join(designs, "reference-x.html"), "<div class=ok>y</div>\n");
writeFileSync(
  join(designs, "DECISION.md"),
  [
    "# DECISION.md",
    "## 3. 约束集",
    "- 调色板：`--paper:#f5f4ed`、`--ink:#0f1011`",
    "## 7. 开发交接提示词",
    "- 全项目 grep：`linear-gradient` → 0 处；`transition: all` → 0 处；`nonexistent-thing-xyz` → 0 处",
  ].join("\n"),
);
const F4 = runHandoffChecks({ designsDir: designs, projectDir: project });
const hc8 = F4.filter((f) => f.gate === "HC-8");
check("HC-8 抓到『只差写法』的失明验收（transition: all）",
  hc8.some((f) => f.rule === "acceptance-blind-typo" && f.severity === "error"),
  JSON.stringify(hc8.map((f) => f.message)));
check("HC-8 不误报有效验收（linear-gradient 在项目里能命中）",
  !hc8.some((f) => f.message.includes("linear-gradient")));
check("HC-8 对'本就针对新增项'的模式只报 warn",
  hc8.some((f) => f.rule === "acceptance-blind" && f.severity === "warn" && f.message.includes("nonexistent-thing-xyz")));

// ---- HC-9 实现映射表（元素 → 实现物）----
const hc9Of = (F) => F.filter((f) => f.gate === "HC-9");
const writeDecision = (body) => writeFileSync(join(designs, "DECISION.md"), body.join("\n"));
const specHead = ["# DECISION.md", "## 5. 开发交接规格", ""];

// 有 §5 却没表 → error
writeDecision([...specHead, "视觉规格见 §3；交互状态见原型。"]);
let F5 = runHandoffChecks({ designsDir: designs, projectDir: project });
check("HC-9 抓到 §5 没有映射表", hc9Of(F5).some((f) => f.rule === "mapping-table-missing" && f.severity === "error"),
  JSON.stringify(hc9Of(F5).map((f) => f.message)));

// 表存在但实现列全空 / 状态空 / 证据断链
writeDecision([
  ...specHead,
  "| 元素 | 语义角色 | 目标项目已有实现 | 等价实现 | 状态 | 证据 |",
  "| --- | --- | --- | --- | --- | --- |",
  "| 顶部指标卡 | 指标摘要 | — | — | | reference-x.html:1 |",
  "| 提交按钮 | 主操作 | Button | — | default / hover | reference-missing.html:3 |",
]);
const F6 = runHandoffChecks({ designsDir: designs, projectDir: project });
check("HC-9 抓到两列实现都空", hc9Of(F6).some((f) => f.rule === "mapping-impl-missing" && f.severity === "error"));
check("HC-9 抓到状态列为空（warn）", hc9Of(F6).some((f) => f.rule === "mapping-state-empty" && f.severity === "warn"));
check("HC-9 抓到证据文件不存在", hc9Of(F6).some((f) => f.rule === "mapping-evidence-unreachable" && f.severity === "error"));
check("HC-9 不把合法的实现列误报为缺失",
  !hc9Of(F6).some((f) => f.rule === "mapping-impl-missing" && f.message.includes("提交按钮")));

// 证据行号越界
writeDecision([
  ...specHead,
  "| 元素 | 语义角色 | 目标项目已有实现 | 等价实现 | 状态 | 证据 |",
  "| --- | --- | --- | --- | --- | --- |",
  "| 顶部指标卡 | 指标摘要 | — | .metric-card | default / loading | reference-x.html:999 |",
]);
const F7 = runHandoffChecks({ designsDir: designs, projectDir: project });
check("HC-9 抓到证据行号越界", hc9Of(F7).some((f) => f.rule === "mapping-evidence-line" && f.severity === "error"),
  JSON.stringify(hc9Of(F7).map((f) => f.message)));

// 好表：项目里真有的类名 + 可达证据 → 0 项 HC-9
writeDecision([
  ...specHead,
  "| 元素 | 语义角色 | 目标项目已有实现 | 等价实现 | 状态 | 证据 |",
  "| --- | --- | --- | --- | --- | --- |",
  "| 顶部指标卡 | 指标摘要 | — | .ok | default / loading / empty | reference-x.html:1 |",
]);
const F8 = runHandoffChecks({ designsDir: designs, projectDir: project });
check("HC-9 好表 0 项问题", hc9Of(F8).length === 0, JSON.stringify(hc9Of(F8).map((f) => f.message)));

// 声称项目已有、但项目里搜不到 → warn
writeDecision([
  ...specHead,
  "| 元素 | 语义角色 | 目标项目已有实现 | 等价实现 | 状态 | 证据 |",
  "| --- | --- | --- | --- | --- | --- |",
  "| 顶部指标卡 | 指标摘要 | MetricCard | — | default | reference-x.html:1 |",
]);
const F9 = runHandoffChecks({ designsDir: designs, projectDir: project });
check("HC-9 对『项目搜不到的实现物』只报 warn",
  hc9Of(F9).some((f) => f.rule === "mapping-claim-unverified" && f.severity === "warn"),
  JSON.stringify(hc9Of(F9).map((f) => f.message)));

// 正文提到「§5 开发交接规格」但没有 §5 标题 → 不判（避免交叉引用误报）
writeDecision([
  "# DECISION.md",
  "## 3. 约束集",
  "- 转开发时的字段见 §5 开发交接规格（本次不转开发，不写 §5）",
  "## 7. 开发交接提示词",
  "验收：无",
]);
const F10 = runHandoffChecks({ designsDir: designs, projectDir: project });
check("HC-9 不把正文里的交叉引用当成写了 §5", hc9Of(F10).length === 0,
  JSON.stringify(hc9Of(F10).map((f) => f.message)));

rmSync(root, { recursive: true, force: true });
console.log(`\nℹ tests ${pass + fail}\nℹ pass ${pass}\nℹ fail ${fail}`);
process.exit(fail === 0 ? 0 : 1);
