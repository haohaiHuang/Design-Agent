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

rmSync(root, { recursive: true, force: true });
console.log(`\nℹ tests ${pass + fail}\nℹ pass ${pass}\nℹ fail ${fail}`);
process.exit(fail === 0 ? 0 : 1);
