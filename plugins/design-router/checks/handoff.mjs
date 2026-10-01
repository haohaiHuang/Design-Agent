/**
 * checks/handoff.mjs — 交付物一致性机械核对（HC-*）
 *
 * 存在理由（有真机证据，不是预防性设计）：
 *   2026-10-01 T2 真机：critic 评审迟到 → 触发第二轮返工 → 原型改了 40+ 次、取证出了四代，
 *   而 `DECISION.md` 冻结在返工之前，从未回算，最后仍 `present` 声明完成。第三方开发盲测判：
 *   A-3 依据不可达 / A-7 对比度算错（19.05→17.27 等） / A-8 跨件数值互斥（hover 色、圆角档、
 *   字号、letter-spacing 全对不上） / A-9 验收命令不可跑 —— **照着交付物会写出与原型相反的实现**。
 *   同轮日志里 persona 的 prose 自检（「八查」「跨件」）出现 0 次，而工具调用 13 次：
 *   → 结论：能救的是**机械核对**，不是再写一条自检提示。
 *
 * 四类检查（全部确定性、零依赖、只读）：
 *   HC-1 引用路径可达    —— 文书里引用的路径是否真实存在；裸文件名（包外）单列
 *   HC-2 跨件数值一致    —— 文书 vs 参考原型的色值/圆角/字号/字距/时长是否互斥
 *   HC-3 对比度可复算    —— 文书引用的 N.NN:1 用文档自己定义的令牌重算，对不上即报
 *   HC-4 验收可跑性      —— §7 里把本 Agent 的 DSH 工具当 shell 命令用、又没标归属/替代法
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const DS_TOOLS = ["design_audit", "design_contrast", "design_lookup", "design_route", "design_diversity", "design_quality"];
const BARE_DOC_NAMES = ["ui-quickfix.md", "workflow.md", "SKILL.md", "registry.md", "poster-compositions.md"];

function readIfFile(p) {
  try {
    if (!existsSync(p) || !statSync(p).isFile()) return null;
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

/** 递归收集目录下的文件（深度上限防止走进 node_modules / 大目录） */
function walk(dir, depth = 0, out = []) {
  if (depth > 3) return out;
  let ents = [];
  try {
    ents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of ents) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, depth + 1, out);
    else out.push(p);
  }
  return out;
}

// ---------- WCAG 相对亮度 ----------
function luminance(hex) {
  const h = String(hex).replace("#", "");
  if (h.length !== 6) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** 从 CSS 文本里抽 `--name: #hex` 形式的令牌表 */
function tokenTable(cssText) {
  const table = {};
  for (const m of cssText.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) {
    table[m[1]] = m[2].toLowerCase();
  }
  return table;
}

/** 数值抽取（色值 / px / rem / ms / em） */
function numericSets(text) {
  return {
    colors: new Set((text.match(/#[0-9a-fA-F]{6}\b/g) || []).map((c) => c.toLowerCase())),
    px: new Set((text.match(/\b\d+(?:\.\d+)?px\b/g) || []).map((v) => v.toLowerCase())),
    rem: new Set((text.match(/\b\d+(?:\.\d+)?rem\b/g) || []).map((v) => v.toLowerCase())),
    ms: new Set((text.match(/\b\d+(?:\.\d+)?ms\b/g) || []).map((v) => v.toLowerCase())),
    clamp: new Set((text.match(/clamp\([^)]*\)/g) || []).map((v) => v.replace(/\s+/g, "").toLowerCase())),
    lspacing: new Set((text.match(/letter-spacing\s*:\s*([^;}"']+)/g) || []).map((v) => v.split(":")[1].trim().toLowerCase())),
  };
}

/**
 * @param {{designsDir: string, projectDir?: string}} opts
 * @returns {Array<{gate:string, rule:string, severity:string, message:string, location:string}>}
 */
export function runHandoffChecks(opts = {}) {
  const designsDir = opts.designsDir;
  const findings = [];
  if (!designsDir || !existsSync(designsDir)) {
    return [
      {
        gate: "HC-0",
        rule: "handoff-target",
        severity: "error",
        message: `designs 目录不存在：${designsDir || "(未提供)"}`,
        location: String(designsDir || ""),
      },
    ];
  }
  const root = dirname(designsDir);
  const projectDir = opts.projectDir || join(root, "project");
  const files = walk(designsDir);
  const docs = files.filter((f) => f.endsWith(".md"));
  const protos = files.filter((f) => f.endsWith(".html") && !/preview-shell|iframe-shell|probe/i.test(basename(f)));
  const docText = docs.map((f) => readIfFile(f) || "").join("\n");
  const protoText = protos.map((f) => readIfFile(f) || "").join("\n");

  // ---------- HC-1 引用路径可达 ----------
  const refRe = /(?:designs|project)\/[A-Za-z0-9_./\u4e00-\u9fa5-]+/g;
  const seen = new Set();
  for (const ref of docText.match(refRe) || []) {
    const clean = ref.replace(/[)>,;`"'。，；）]+$/, "");
    if (seen.has(clean)) continue;
    seen.add(clean);
    if (!existsSync(join(root, clean)) && !existsSync(join(designsDir, clean.replace(/^designs\//, "")))) {
      findings.push({
        gate: "HC-1",
        rule: "ref-unreachable",
        severity: "error",
        message: `文书引用了不存在的路径：\`${clean}\`（第三方按此找不到依据）`,
        location: clean,
      });
    }
  }
  for (const name of BARE_DOC_NAMES) {
    if (!docText.includes(name)) continue;
    if (files.some((f) => basename(f) === name)) continue; // 随包交付则可达
    findings.push({
      gate: "HC-1",
      rule: "ref-bare-name",
      severity: "warn",
      message: `引用了裸文件名 \`${name}\` 且未随包交付——第三方在包内取不到；写全路径或随包附上`,
      location: name,
    });
  }

  // ---------- HC-2 跨件数值一致 ----------
  if (protos.length > 0) {
    const D = numericSets(docText);
    const P = numericSets(protoText);
    const onlyDocColors = [...D.colors].filter((c) => !P.colors.has(c));
    const onlyProtoColors = [...P.colors].filter((c) => !D.colors.has(c));
    if (onlyDocColors.length)
      findings.push({
        gate: "HC-2",
        rule: "color-doc-only",
        severity: "warn",
        message: `文书里的色值原型中没有：${onlyDocColors.join(", ")}——确认是"新增令牌"还是两边已经跑偏`,
        location: docs.map((d) => basename(d)).join(","),
      });
    if (onlyProtoColors.length)
      findings.push({
        gate: "HC-2",
        rule: "color-proto-only",
        severity: "error",
        message: `原型里的色值文书没有登记：${onlyProtoColors.join(", ")}——开发按文书做不出原型效果`,
        location: basename(protos[0]),
      });
    const onlyDocClamp = [...D.clamp].filter((c) => !P.clamp.has(c));
    const onlyProtoClamp = [...P.clamp].filter((c) => !D.clamp.has(c));
    if (onlyDocClamp.length || onlyProtoClamp.length)
      findings.push({
        gate: "HC-2",
        rule: "clamp-mismatch",
        severity: "error",
        message: `字号 clamp 不一致｜文书独有: ${onlyDocClamp.join(" ") || "—"}｜原型独有: ${onlyProtoClamp.join(" ") || "—"}（开发会做出与原型不同的字号）`,
        location: basename(protos[0]),
      });
    const onlyDocLsp = [...D.lspacing].filter((v) => !P.lspacing.has(v));
    const onlyProtoLsp = [...P.lspacing].filter((v) => !D.lspacing.has(v));
    if (onlyDocLsp.length || onlyProtoLsp.length)
      findings.push({
        gate: "HC-2",
        rule: "letter-spacing-mismatch",
        severity: "warn",
        message: `letter-spacing 互斥｜文书: ${onlyDocLsp.join(" ") || "—"}｜原型: ${onlyProtoLsp.join(" ") || "—"}`,
        location: basename(protos[0]),
      });
    const onlyDocMs = [...D.ms].filter((v) => !P.ms.has(v));
    const onlyProtoMs = [...P.ms].filter((v) => !D.ms.has(v));
    if (onlyDocMs.length || onlyProtoMs.length)
      findings.push({
        gate: "HC-2",
        rule: "duration-mismatch",
        severity: "warn",
        message: `时长/兜底值不一致｜文书独有: ${onlyDocMs.join(" ") || "—"}｜原型独有: ${onlyProtoMs.join(" ") || "—"}`,
        location: basename(protos[0]),
      });
  }

  // ---------- HC-3 对比度可复算 ----------
  // 精度优先：**只认规范写法** `A on B = N.NN:1`（A/B 为 `--token` 或 #hex）。
  // 不用"就近取两色"的模糊配对——实测那样会把同一行的阈值（4.5:1）与第二个比率配错颜色，
  // 产生误报；误报比漏报更糟（会诱导改坏本来正确的数字）。
  // 非规范写法的比率 → 聚合为一条"无法复核"warn。
  const cssText = [
    ...(existsSync(projectDir) ? walk(projectDir).filter((f) => f.endsWith(".css") || f.endsWith(".html")) : []),
    ...protos,
  ]
    .map((f) => readIfFile(f) || "")
    .join("\n");
  const tokens = { ...tokenTable(cssText), ...tokenTable(docText) };
  const resolveRef = (raw) => {
    const r = raw.replace(/[`\s]/g, "");
    if (/^#[0-9a-fA-F]{6}$/.test(r)) return r.toLowerCase();
    const name = r.replace(/^--/, "");
    return tokens[name] || null;
  };
  const pairRe =
    /(`?--[a-z0-9-]+`?|#[0-9a-fA-F]{6})\s+on\s+(`?--[a-z0-9-]+`?|#[0-9a-fA-F]{6})[^0-9\n]{0,14}([0-9]{1,2}\.[0-9]{1,2})\s*:\s*1/gi;
  const evaluated = new Set();
  for (const m of docText.matchAll(pairRe)) {
    const a = resolveRef(m[1]);
    const b = resolveRef(m[2]);
    const ratio = parseFloat(m[3]);
    if (!a || !b) continue;
    const key = `${a}/${b}/${ratio}`;
    if (evaluated.has(key)) continue;
    evaluated.add(key);
    const got = contrast(a, b);
    if (got === null) continue;
    if (Math.abs(got - ratio) > 0.05) {
      findings.push({
        gate: "HC-3",
        rule: "contrast-wrong",
        severity: "error",
        message: `对比度算错：文书写 ${ratio}:1，按 ${a} on ${b} 实算 ${got.toFixed(2)}:1（"判断为真"的底线）`,
        location: "DECISION.md",
      });
    }
  }
  // 未被规范写法覆盖的比率（阈值声明也算）→ 聚合一条 warn，不逐条刷屏
  const canonicalRatios = new Set([...docText.matchAll(pairRe)].map((m) => m[3]));
  const otherRatios = [
    ...new Set([...docText.matchAll(/([0-9]{1,2}\.[0-9]{1,2})\s*:\s*1/g)].map((m) => m[1])),
  ].filter((r) => !canonicalRatios.has(r));
  if (otherRatios.length) {
    findings.push({
      gate: "HC-3",
      rule: "contrast-unverifiable",
      severity: "warn",
      message: `另有 ${otherRatios.length} 个对比度数字无法机器复核（未写成 \`--a on --b = N:1\`）：${otherRatios.slice(0, 6).join(":1, ")}:1——第三方只能人工核对`,
      location: "DECISION.md",
    });
  }

  // ---------- HC-4 验收可跑性 ----------
  for (const t of DS_TOOLS) {
    const idx = docText.indexOf(`\`${t}`);
    if (idx < 0) continue;
    const near = docText.slice(Math.max(0, idx - 120), idx + 200);
    const attributed = /DSH (?:插件 )?工具|本 Agent 的工具|不是 shell|技能内部工具/.test(near);
    const alternative = /替代|无该工具|人工逐条核对|若没有/.test(near);
    if (!attributed && !alternative) {
      findings.push({
        gate: "HC-4",
        rule: "tool-unattributed",
        severity: "warn",
        message: `§7 把本 Agent 的 DSH 工具 \`${t}\` 当命令写，未标明归属、也未给无该工具时的替代核对法——第三方跑不了这条验收`,
        location: t,
      });
    }
  }

  return findings;
}
