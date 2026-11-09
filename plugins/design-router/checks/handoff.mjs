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
 *   HC-5 证据新鲜度      —— 文书/取证是否早于原型最后改动（真机复跑实测：report 10:38 < theme.css 10:45，
 *                          文书却写成"修复后实测" → 第三方无基准）
 *   HC-6 未定义令牌      —— 被 var(--x) 引用却任何地方都没定义的令牌（真机实测：`--paper-2` 用了没定义
 *                          → 照提示词产出无效 CSS；`--r3` 幽灵令牌）
 *   HC-8 反向断言        —— "要求 X 为 0"的模式先在【改前项目】上跑一遍：命中 0 = 这条验收查不到
 *                          任何东西（真机实测：验收写 `transition: all`〔带空格〕而项目里是
 *                          `transition:all .3s` → 该禁令完全失明）
 *   HC-7 验收自洽性      —— 把 §7 里的 grep 型验收命令抽出来**逐条实跑**：命令本身能不能跑、
 *                          会不会被注释/子串假阳、断言是否可能恒真（真机实测：`999px` 禁令被
 *                          `.skip{left:-9999px}` 命中；`transition:all` 命中注释；`.doc-row` 计数 `0===0`）
 *   HC-9 实现映射表      —— §5 是否把「元素 → 实现物」落成可核对的表：表存在、每行两列实现至少一列、
 *                          证据 path:line 真实可达、状态列非空；声称「项目已有」的组件在项目里搜得到。
 *                          覆盖度（每个可见块有没有行）不机器判定——见该段注释。
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const DS_TOOLS = ["design_audit", "design_contrast", "design_lookup", "design_route", "design_diversity", "design_quality", "design_search", "design_gap"];
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

// ---------- HC-9 用的 markdown 表格解析 ----------
/** 行内单元格拆分：去首尾竖线后按 | 切，保留原顺序（不做转义处理，交付表格不用转义） */
function splitRow(line) {
  let s = String(line).trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

/** 收集 markdown 表格：连续以 | 开头的行成块；返回 [{header, rows}]（跳过 --- 分隔行） */
function markdownTables(text) {
  const out = [];
  let buf = [];
  const flush = () => {
    if (buf.length >= 2) {
      const rows = buf.slice(1).filter((l) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(l));
      out.push({ header: splitRow(buf[0]), rows: rows.map(splitRow) });
    }
    buf = [];
  };
  for (const line of String(text).split("\n")) {
    if (/^\s*\|/.test(line)) buf.push(line);
    else flush();
  }
  flush();
  return out;
}

/** 表头单元格归一化：去掉粗体标记、反引号与空白，便于做列名匹配 */
function normCell(c) {
  return String(c).replace(/[*`\s]/g, "");
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
  const docText = docs.map((f) => readIfFile(f) || "").join("\n");
  // 路径可达性要扫的不止 .md：真机实测漏过一处——reference-*.html 里写了 designs/修改方向.md（不存在）。
  // 但**数值/令牌比对仍只用 .md**，否则原型自己的色值会被当成"文书里也有"，HC-2 就失效了。
  const refDocs = files.filter((f) => /\.(md|html)$/.test(f));
  const refText = refDocs.map((f) => readIfFile(f) || "").join("\n");
  const protos = files.filter((f) => f.endsWith(".html") && !/preview-shell|iframe-shell|probe/i.test(basename(f)));
  const cssTextAll = walk(designsDir)
    .concat(existsSync(join(root, "project")) ? walk(join(root, "project")) : [])
    .filter((f) => f.endsWith(".css") || f.endsWith(".html"))
    .map((f) => readIfFile(f) || "")
    .join("\n");
  const protoText = protos.map((f) => readIfFile(f) || "").join("\n");

  // ---------- HC-1 引用路径可达 ----------
  const refRe = /(?:designs|project)\/[A-Za-z0-9_./\u4e00-\u9fa5-]+/g;
  const seen = new Set();
  for (const ref of refText.match(refRe) || []) {
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
    if (!refText.includes(name)) continue;
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
  // 只看"工具名第一次出现的地方"会误报（真机实测：§4.1 标题里的 `design_audit` 没有归属，
  // 但 §7 g) 里明确写了"这是本 Agent 的 DSH 工具，不是 shell 命令"→ 归属是有的）。
  // 判据改为：该工具名**任何一个**出现处附近有归属或替代法，即通过。
  const ATTR = /DSH\s*(?:插件\s*)?工具|本 Agent 的工具|不是 shell|技能内部工具|第三方环境通常没有/;
  const ALT = /替代|无该工具|人工逐条核对|若没有|没有该工具/;
  for (const t of DS_TOOLS) {
    const name = "`" + t;
    const idxs = [];
    for (let i = docText.indexOf(name); i >= 0; i = docText.indexOf(name, i + 1)) idxs.push(i);
    if (idxs.length === 0) continue;
    const ok = idxs.some((i) => {
      const near = docText.slice(Math.max(0, i - 200), i + 220);
      return ATTR.test(near) || ALT.test(near);
    });
    if (!ok) {
      findings.push({
        gate: "HC-4",
        rule: "tool-unattributed",
        severity: "warn",
        message: `§7 把本 Agent 的 DSH 工具 \`${t}\` 当命令写，未标明归属、也未给无该工具时的替代核对法——第三方跑不了这条验收`,
        location: t,
      });
    }
  }

  // ---------- HC-5 证据新鲜度 ----------
  // 只在"声称是修复后结果"的文书/取证上判：DECISION.md、修改方向.md、verify/*、render-report*
  const newest = (arr) => arr.reduce((m, f) => Math.max(m, statSync(f).mtimeMs || 0), 0);
  const protoMtime = newest(protos);
  const claimDocs = docs.filter((f) => /DECISION\.md$|修改方向\.md$/.test(f));
  const evidence = files.filter((f) => /\/verify\/|render-report|final-render|state-recheck|interaction-states/.test(f));
  if (protoMtime > 0) {
    for (const f of [...claimDocs, ...evidence]) {
      const t = statSync(f).mtimeMs || 0;
      if (t > 0 && t < protoMtime) {
        const lag = Math.round((protoMtime - t) / 1000);
        // 文书里**点名引用**了这份过期取证 = 拿旧值当"修复后实测" → error；
        // 只是静静躺着的旧文件 → warn
        const cited = claimDocs.some((d) => (readIfFile(d) || "").includes(basename(f)));
        findings.push({
          gate: "HC-5",
          rule: "stale-evidence",
          severity: cited ? "error" : "warn",
          message: `${basename(f)} 比参考原型最后改动早 ${lag}s——记录的很可能是**改动前**的值${cited ? "，却被文书当作\"修复后实测\"引用" : ""}。返工后必须重渲染/重算并覆盖（真机复跑就是这么坏的）`,
          location: basename(f),
        });
      }
    }
  }

  // ---------- HC-6 未定义令牌 ----------
  const allText = docText + "\n" + protoText;
  const defined = new Set();
  for (const m of allText.matchAll(/--([a-z0-9-]+)\s*:/g)) defined.add(m[1]);
  for (const m of cssTextAll.matchAll(/--([a-z0-9-]+)\s*:/g)) defined.add(m[1]);
  const undefinedRefs = new Set();
  for (const m of allText.matchAll(/var\(\s*--([a-z0-9-]+)\s*\)/g)) {
    if (!defined.has(m[1])) undefinedRefs.add(m[1]);
  }
  if (undefinedRefs.size) {
    findings.push({
      gate: "HC-6",
      rule: "undefined-token",
      severity: "error",
      message: `引用了未定义的令牌：${[...undefinedRefs].map((t) => "--" + t).join(", ")}——照此产出的是无效 CSS（真机复跑：\`--paper-2\` 用了没定义、\`--r3\` 幽灵令牌）`,
      location: "DECISION.md",
    });
  }

  // ---------- HC-7 验收自洽性 ----------
  // 真机实测（第 6 轮）：验收的真实写法是**列表式**——
  //   "h) 反向核对（…均应为 0 处）：`linear-gradient`；`transition: all`；`999px`；…"
  //   即"0 处"标记在**列表之前**。所以抽取按**行**做：该行含零标记 → 取该行所有反引号模式。
  //   同时排除 JS 断言片段（`right > innerWidth` 这类是浏览器里跑的，不是 grep 模式）。
  const zeroPatterns = [];
  const promptIdx = docText.search(/##\s*7\.|开发交接提示词/);
  if (promptIdx >= 0) {
    const section = docText.slice(promptIdx);
    const zeroMarker = /(均?应?为\s*0\s*处|必须为\s*0|→\s*0\s*处|为\s*0\s*处)/;
    const isJsLike = (x) =>
      /(===|!==|=>|\bdocument\b|querySelector|getComputedStyle|innerWidth|getBoundingClientRect|\breturn\b|\bconst\b|\blet\b|\bfunction\b|window\.|\.length|\[\s*\.\.\.)/.test(x);
    for (const line of section.split("\n")) {
      if (!zeroMarker.test(line)) continue;
      for (const m of line.matchAll(/`([^`\n]{3,60})`/g)) {
        const pat = m[1].trim();
        if (isJsLike(pat)) continue;
        if (/^[\u4e00-\u9fa5]+$/.test(pat)) continue;
        if (/^--[a-z0-9-]+$/.test(pat) || /^#[0-9a-fA-F]{3,8}$/.test(pat)) continue;
        zeroPatterns.push(pat);
      }
    }
  }
  for (const pat of new Set(zeroPatterns)) {
    let re = null;
    try {
      re = new RegExp(pat);
    } catch {
      findings.push({
        gate: "HC-7",
        rule: "acceptance-regex-host-dependent",
        severity: "warn",
        message: `验收模式 \`${pat}\` 无法用 JS 正则编译，可能依赖特定 grep 语法（BSD grep 无 -P）——改成可移植写法或给等价替代`,
        location: "§7",
      });
      continue;
    }
    for (const proto of protos) {
      const raw = readIfFile(proto) || "";
      const stripped = raw
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      if (re.test(stripped)) {
        findings.push({
          gate: "HC-7",
          rule: "acceptance-self-conflict",
          severity: "error",
          message: `验收要求 \`${pat}\` 为 0，但**视觉基准自己命中**（${basename(proto)}）——基准过不了自己的验收，第三方的"通过"不可信`,
          location: basename(proto),
        });
      } else if (re.test(raw)) {
        findings.push({
          gate: "HC-7",
          rule: "acceptance-comment-false-positive",
          severity: "warn",
          message: `验收要求 \`${pat}\` 为 0：只在**注释**里命中（剥注释后为空）——朴素 grep 会误报，验收里要写明"剥注释后再匹配"`,
          location: basename(proto),
        });
      }
    }
  }

  // ---------- HC-8 反向断言（检查失明）----------
  // 真机实测（第 6 轮第三方头号问题之一）：验收写 `transition: all`（带空格）→ 在改前项目上命中 0，
  // 而项目里就是 `transition:all .3s`。**一条永远命中 0 的禁令等于没有禁令**，但没人会发现，
  // 因为它"看起来通过了"。判据：要求为 0 的模式，必须在**改前项目**上真能命中（说明它查的是现存问题）。
  if (existsSync(projectDir)) {
    const projTexts = walk(projectDir)
      .filter((f) => /\.(html|css|js|mjs|tsx|vue|md)$/.test(f))
      .map((f) => readIfFile(f) || "");
    const norm = (x) => x.replace(/\s+/g, "");
    for (const pat of new Set(zeroPatterns)) {
      let re = null;
      try {
        re = new RegExp(pat);
      } catch {
        continue; // 编译不了的情况 HC-7 已单独报
      }
      if (projTexts.some((t) => re.test(t))) continue; // 能命中 = 这条验收有效
      // 命中 0：是"只差空白/写法"，还是"本就针对新增代码"？
      const loose = projTexts.some((t) => t && norm(t).includes(norm(pat)));
      if (loose) {
        findings.push({
          gate: "HC-8",
          rule: "acceptance-blind-typo",
          severity: "error",
          message: `验收失明：\`${pat}\` 在改前项目上命中 0，但**去掉空白后能命中**——模式与目标只差写法（真机实例：\`transition: all\` 查不到 \`transition:all\`）。该禁令等于没写，改成 \`transition:\\s*all\` 之类`,
          location: "§7",
        });
      } else {
        findings.push({
          gate: "HC-8",
          rule: "acceptance-blind",
          severity: "warn",
          message: `验收 \`${pat}\` 在改前项目上命中 0——若它本意是查出项目里现存的问题，则这条查不到任何东西；若它约束的是新增代码，请在验收里注明"新增项"`,
          location: "§7",
        });
      }
    }
  }

  // ---------- HC-9 实现映射表（元素 → 实现物，可核对）----------
  // 存在理由：上面 HC-2 只核对「文书 vs 原型的数值一致」。数值对了，开发仍要自己推
  // 「这该是哪个组件、有哪些状态」——真机盲测里 A-3「依据不可达」就是这个形状：
  // 文书给了一串度量值，没有一个可执行物。
  // 判据：写了 §5 开发交接规格的文书，必须含一张「元素 → 实现物」表，且每行证据可解析。
  // 覆盖度（每个可见块是否都有一行）**不机器判定**——静态解析 HTML 分不清布局容器与可见块，
  // 硬判会误报，而误报比漏报更糟；覆盖度交给 4.critique / 盲测。
  const claimDocs9 = docs.filter((f) => /DECISION\.md$|修改方向\.md$/.test(f));
  if (claimDocs9.length > 0 && protos.length > 0) {
    // 只认**标题行**：正文里"见 §5 开发交接规格"这类交叉引用不能让 HC-9 误判为"写了 §5"
    const SPEC_HEAD = /(^|\n)#{1,4}\s*5[.、\s]/;
    const EVID_RE = /([\w./\u4e00-\u9fa5-]+\.(?:html?|css|md|svg|json))(?::(\d+))?/;
    const textLineCount = (p) => (readIfFile(p) || "").split("\n").length;
    // 项目文本只在需要核对「声称项目已有」时读一次；超大项目设上限，避免拖慢核对
    const projText = (() => {
      if (!existsSync(projectDir)) return "";
      const files = walk(projectDir).filter((f) => /\.(html|css|scss|js|mjs|tsx?|vue|md|json)$/.test(f)).slice(0, 400);
      return files.map((f) => readIfFile(f) || "").join("\n");
    })();
    for (const doc of claimDocs9) {
      const txt = readIfFile(doc) || "";
      if (!SPEC_HEAD.test(txt)) continue; // 不转开发就不写 §5，不判
      const tables = markdownTables(txt);
      const table = tables.find((t) => {
        const h = t.header.map(normCell);
        return h.some((c) => /元素|区块|区域/.test(c)) && h.some((c) => /证据|依据/.test(c));
      });
      if (!table) {
        // 有 §5 却没表：要么写成散文（开发读不出实现物），要么表头缺「元素/证据」列
        const anyTable = tables.length > 0;
        findings.push({
          gate: "HC-9",
          rule: "mapping-table-missing",
          severity: "error",
          message: anyTable
            ? `§5 里有一张表，但表头缺「元素」或「证据」列——HC-9 无法核对实现映射。表头需含：元素 / 目标项目已有实现 / 等价实现 / 状态 / 证据`
            : `§5 开发交接规格里没有「元素 → 实现物」表——开发只拿到度量值，还得自己推组件与状态（就是盲测里 A-3「依据不可达」的形状）。补一张表：元素 / 语义角色 / 目标项目已有实现 / 等价实现 / 状态 / 证据`,
          location: basename(doc),
        });
        continue;
      }
      const h = table.header.map(normCell);
      const idxElem = h.findIndex((c) => /元素|区块|区域/.test(c));
      const idxEvid = h.findIndex((c) => /证据|依据/.test(c));
      const implIdx = h.map((c, i) => (/实现|组件/.test(c) ? i : -1)).filter((i) => i >= 0);
      const idxState = h.findIndex((c) => /状态/.test(c));
      if (implIdx.length === 0) {
        findings.push({
          gate: "HC-9",
          rule: "mapping-table-header",
          severity: "error",
          message: `映射表缺「实现」列（目标项目已有实现 / 等价实现 至少一列）——只有元素名不构成交接`,
          location: basename(doc),
        });
        continue;
      }
      if (table.rows.length === 0) {
        findings.push({
          gate: "HC-9",
          rule: "mapping-table-empty",
          severity: "error",
          message: `映射表只有表头没有行——等于没写`,
          location: basename(doc),
        });
        continue;
      }
      table.rows.forEach((cells, i) => {
        const at = (idx) => (idx >= 0 && idx < cells.length ? cells[idx] : "");
        const elem = at(idxElem).replace(/[*`]/g, "").trim();
        const evid = at(idxEvid);
        const implVals = implIdx.map(at).filter((v) => v && v.trim() && v.trim() !== "—" && v.trim() !== "-");
        const stateVal = at(idxState).trim();
        const rowLabel = `第 ${i + 1} 行${elem ? `（${elem}）` : ""}`;
        if (!elem) {
          findings.push({
            gate: "HC-9",
            rule: "mapping-row-incomplete",
            severity: "error",
            message: `映射表 ${rowLabel} 缺元素名——不知道这一行映射的是什么`,
            location: basename(doc),
          });
        }
        if (implVals.length === 0) {
          findings.push({
            gate: "HC-9",
            rule: "mapping-impl-missing",
            severity: "error",
            message: `映射表 ${rowLabel} 两个实现列都为空——开发没有可执行物（目标项目没有该组件时，必须给等价实现）`,
            location: basename(doc),
          });
        }
        if (idxState >= 0 && !stateVal) {
          findings.push({
            gate: "HC-9",
            rule: "mapping-state-empty",
            severity: "warn",
            message: `映射表 ${rowLabel} 状态列为空——交互规格里点名的状态要落到行上（default / hover / focus / disabled / loading / error / empty 中适用的）`,
            location: basename(doc),
          });
        }
        // 证据：path[:line]，或指向文书自身的 §N
        const m = evid.match(EVID_RE);
        if (!m) {
          if (!/§\s*\d/.test(evid)) {
            findings.push({
              gate: "HC-9",
              rule: "mapping-evidence-format",
              severity: "error",
              message: `映射表 ${rowLabel} 证据列不是可解析的「文件:行号」，也没指向文书 §N——第三方核不到出处`,
              location: basename(doc),
            });
          }
          return;
        }
        const rel = m[1].replace(/^\.\//, "");
        const candidates = [join(root, rel), join(designsDir, rel.replace(/^designs\//, "")), join(dirname(doc), rel)];
        const hit = candidates.find((p) => existsSync(p) && statSync(p).isFile());
        if (!hit) {
          findings.push({
            gate: "HC-9",
            rule: "mapping-evidence-unreachable",
            severity: "error",
            message: `映射表 ${rowLabel} 证据指向不存在的文件：\`${rel}\``,
            location: rel,
          });
          return;
        }
        if (m[2]) {
          const line = Number(m[2]);
          const total = textLineCount(hit);
          if (!Number.isFinite(line) || line < 1 || line > total) {
            findings.push({
              gate: "HC-9",
              rule: "mapping-evidence-line",
              severity: "error",
              message: `映射表 ${rowLabel} 证据行号越界：\`${rel}:${line}\`，该文件只有 ${total} 行`,
              location: `${rel}:${line}`,
            });
          }
        }
        // 声称「目标项目已有实现」→ 项目里应当真能搜到；搜不到是 warn（可能来自生成物或别名）
        if (projText && implVals.length > 0) {
          const names = new Set();
          for (const v of implVals) {
            for (const x of v.match(/\b[A-Z][A-Za-z0-9]{2,}\b/g) || []) names.add(x);
            for (const x of v.match(/\.[a-z][a-z0-9-]{2,}/g) || []) names.add(x);
          }
          const absent = [...names].filter((n) => !projText.includes(n));
          if (names.size > 0 && absent.length === names.size) {
            findings.push({
              gate: "HC-9",
              rule: "mapping-claim-unverified",
              severity: "warn",
              message: `映射表 ${rowLabel} 声称的实现物在目标项目里搜不到：${absent.join(", ")}——确认是别名/生成物，否则开发照此实现会落空`,
              location: basename(doc),
            });
          }
        }
      });
    }
  }

  return findings;
}
