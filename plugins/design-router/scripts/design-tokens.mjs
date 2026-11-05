#!/usr/bin/env node
/**
 * scripts/design-tokens.mjs — design_tokens 工具核心：从 tokens/<bucket>.css 取精简契约（零依赖）
 *
 * 为什么需要它：assets/ 是不进上下文的资产（SPEC 原则 6），但环节 2 又必须拿到具体数值。
 * 让模型"直接读 CSS"会把整份文件塞进上下文；这里只输出签名 + 变量 + 3 个组件，
 * 单桶 ≤120 行（TOK-8），既够填约束集，又不烧预算。
 *
 * 双端同源：pi extension 与 DSH 插件都 import 本文件的 renderDesignTokens（薄壳只做参数映射）。
 * 因此这里不许依赖 checks/*.ts（DSH 侧只有 .mjs 编译产物），解析逻辑自成一份；
 * 与 checks/tokens.ts 的一致性由 checks/design-tokens.test.mjs 交叉核对。
 *
 * 用法：
 *   node scripts/design-tokens.mjs <bucket> [--parts color,type,space,shape,motion,components]
 *   DESIGN_ASSETS_DIR=/path/to/design-references/assets node scripts/design-tokens.mjs minimal
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** 8 桶固定顺序：未知桶报错时按这个顺序列出，便于和 registry / design_route 对齐 */
export const BUCKETS = ["minimal", "darktech", "editorial", "bold", "warmpaper", "liquid", "dataviz", "retro"];

/** 取用分组（SPEC §6.2 的 color/type/space/components + shape/motion 两个补齐组） */
export const PARTS = ["color", "type", "space", "shape", "motion", "components"];

/** 37 个必填变量：33 契约必填（SPEC §6.1）+ 4 个留白档落地变量（O1 §3.3） */
export const REQUIRED_VARS = [
  "--bg", "--surface", "--surface-2", "--border",
  "--fg", "--muted", "--accent", "--accent-fg",
  "--font-display", "--font-body", "--font-mono",
  "--step-1", "--step-2", "--step-3", "--step-4", "--step-5", "--step-6",
  "--space-1", "--space-2", "--space-3", "--space-4", "--space-5", "--space-6", "--space-7", "--space-8",
  "--radius-sm", "--radius-md", "--radius-lg", "--shadow-1", "--shadow-2",
  "--dur-fast", "--dur-base", "--ease-out",
  "--section-gap", "--page-gutter", "--page-max", "--measure",
];

const GROUPS = {
  color: ["--bg", "--surface", "--surface-2", "--border", "--fg", "--muted", "--accent", "--accent-fg"],
  type: [
    "--font-display", "--font-body", "--font-mono",
    "--step-1", "--step-2", "--step-3", "--step-4", "--step-5", "--step-6",
  ],
  space: [
    "--space-1", "--space-2", "--space-3", "--space-4", "--space-5", "--space-6", "--space-7", "--space-8",
    "--section-gap", "--page-gutter", "--page-max", "--measure",
  ],
  shape: ["--radius-sm", "--radius-md", "--radius-lg", "--shadow-1", "--shadow-2"],
  motion: ["--dur-fast", "--dur-base", "--ease-out"],
};

/** 桶契约目录：环境变量优先，其次运行时技能副本，最后仓库内相对路径（开发态） */
export function findAssetsDir() {
  const candidates = [
    process.env.DESIGN_ASSETS_DIR,
    join(homedir(), ".agents/skills/design-references/assets"),
    join(HERE, "../../../skills/design-references/assets"),
    join(homedir(), ".pi/agent/skills/design-references/assets"),
  ].filter(Boolean);
  for (const dir of candidates) {
    if (existsSync(join(dir, "tokens"))) return dir;
  }
  throw new Error(
    `找不到桶契约目录（已查找：${candidates.join(" / ")}）。先装 design-references skill（assets 随 skill 分发），或用 DESIGN_ASSETS_DIR 指定 assets 目录。`,
  );
}

/** 解析 tokens/<bucket>.css 的头注释 + 变量 + .ds-* 组件 */
export function parseTokensCss(css) {
  const header = css.match(/\/\*([\s\S]*?)\*\//)?.[1] ?? "";
  // 注释替换成等长空格，行号/结构不变（与 checks/tokens.ts 同一手法）
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

  const vars = new Map();
  for (const m of clean.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/gi)) {
    const name = m[1].toLowerCase();
    if (!vars.has(name)) vars.set(name, m[2].trim());
  }

  const components = [];
  for (const m of clean.matchAll(/\.(ds-[a-z0-9-]+)\s*\{([^}]*)\}/gi)) {
    components.push({ selector: `.${m[1]}`, body: m[2].trim() });
  }

  const source = (header.match(/source:\s*([^*\n]+)/i)?.[1] ?? "")
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    bucket: header.match(/bucket:\s*([a-z0-9-]+)/i)?.[1],
    // 签名允许自带 `·`（SPEC §6.1 示例如此），只在下一个字段处收尾
    signature: header.match(/signature:\s*([\s\S]+?)(?=\s*·\s*(?:bucket|source)\s*:|$)/i)?.[1]?.trim(),
    source,
    vars,
    components,
  };
}

function loadSignature(assetsDir) {
  const p = join(assetsDir, "signature.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** registry 的桶中文名（拿不到就退回英文桶名，不因此报错） */
function bucketLabel(bucket) {
  const candidates = [
    join(HERE, "../data/registry.json"), // 仓库 / pi extension / DSH 插件（脚本与 data 同级）
    join(HERE, "../../../extensions/design-router/data/registry.json"),
  ];
  for (const p of candidates) {
    try {
      const desc = JSON.parse(readFileSync(p, "utf8")).buckets?.[bucket];
      if (desc) return String(desc).split(/[：:]/)[0];
    } catch {
      /* 换下一个候选 */
    }
  }
  return bucket;
}

function renderComponents(components) {
  return components
    .map((c) => {
      const body = c.body
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `  ${l}`)
        .join("\n");
      return `${c.selector} {\n${body}\n}`;
    })
    .join("\n\n");
}

/**
 * 取一个桶的精简契约（≤120 行）。
 * @param {string} bucket 桶名（大小写不敏感）
 * @param {{parts?: string[]}} [opts] 选定分组；省略 = 全量
 */
export function renderDesignTokens(bucket, opts = {}) {
  const name = String(bucket ?? "").trim().toLowerCase();
  if (!BUCKETS.includes(name)) {
    throw new Error(`未知桶：${bucket}。可选 8 个：${BUCKETS.join(", ")}（用 design_tokens <bucket> 取契约）`);
  }

  const parts = opts.parts === undefined ? [...PARTS] : opts.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error(`parts 不能为空。可选：${PARTS.join(", ")}`);
  }
  const bad = parts.filter((p) => !PARTS.includes(p));
  if (bad.length) {
    throw new Error(`未知分组：${bad.join(", ")}。可选：${PARTS.join(", ")}`);
  }

  const assetsDir = findAssetsDir();
  const file = join(assetsDir, "tokens", `${name}.css`);
  if (!existsSync(file)) {
    throw new Error(`桶 ${name} 的契约文件不存在：${file}（先补 assets/tokens/${name}.css）`);
  }
  const contract = parseTokensCss(readFileSync(file, "utf8"));
  const signature = loadSignature(assetsDir);
  const meta = signature?.buckets?.[name];
  const tierNote = signature?.tierNotes?.[meta?.whitespace?.tier] ?? "";

  const lines = [];
  lines.push(`## design_tokens · ${name}（${bucketLabel(name)}）`, "");
  lines.push(`签名  ${contract.signature ?? "（头注释缺 signature）"}`);
  lines.push(`来源  ${contract.source.join(", ") || "（头注释缺 source）"}`, "");

  lines.push("四要素");
  if (meta) {
    const fp = meta.fontPair;
    const pal = meta.palette;
    const ws = meta.whitespace;
    lines.push(`· 字体对: display "${fp.display}" / body "${fp.body}" / mono "${fp.mono}"`);
    const area = pal.accentArea ? `（面积 ${pal.accentArea}）` : "";
    lines.push(`· 色派: ${pal.mode} · paper ${pal.paper} · ink ${pal.ink} · accent ${pal.accent}${area} · ${pal.note}`);
    lines.push(
      `· 留白档: ${ws.tier} 档${tierNote ? `（${tierNote}）` : ""} · section-gap ${ws.sectionGap} · gutter ${ws.gutter} · 版心 ${ws.pageMax} · 行长 ${ws.measure}`.replace("） · ", "）· "),
    );
    lines.push(`· 标志手法: ${meta.signatureMove}`);
    if (meta.feature) lines.push(`可测特征: ${meta.feature.id} —— ${meta.feature.rule}`);
  } else {
    lines.push(`· 标志手法: ${contract.signature ?? "（缺 signature）"}`);
    lines.push("（signature.json 缺失：四要素只剩签名，装齐 assets 后再取）");
  }
  lines.push("");

  const selected = [];
  for (const part of PARTS) {
    if (part === "components" || !parts.includes(part)) continue;
    for (const v of GROUPS[part]) if (contract.vars.has(v)) selected.push([v, contract.vars.get(v)]);
  }

  if (selected.length) {
    lines.push(`:root 变量（${selected.length} 个）`, "");
    let lastPart = null;
    for (const part of PARTS) {
      if (part === "components" || !parts.includes(part)) continue;
      const rows = GROUPS[part].filter((v) => contract.vars.has(v));
      if (!rows.length) continue;
      if (lastPart) lines.push("");
      lastPart = part;
      for (const v of rows) lines.push(`${v}: ${contract.vars.get(v)};`);
    }
    lines.push("");
  }

  if (parts.includes("components")) {
    lines.push("组件（只引用上方变量，复制即用）", "");
    lines.push(renderComponents(contract.components));
  }

  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

// ---------- CLI ----------
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const args = process.argv.slice(2);
  let bucket = null;
  let parts;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") {
      console.log(
        "用法: node scripts/design-tokens.mjs <bucket> [--parts color,type,space,shape,motion,components]\n" +
          `桶: ${BUCKETS.join(", ")}\n` +
          "环境变量: DESIGN_ASSETS_DIR=<design-references/assets 目录>",
      );
      process.exit(0);
    }
    if (a === "--parts") {
      parts = String(args[++i] ?? "")
        .split(/[,，\s]+/)
        .filter(Boolean);
      continue;
    }
    if (a.startsWith("--parts=")) {
      parts = a.slice("--parts=".length).split(/[,，\s]+/).filter(Boolean);
      continue;
    }
    if (a.startsWith("-")) {
      console.error(`未知参数：${a}。用 --help 看用法`);
      process.exit(1);
    }
    if (bucket) {
      console.error(`只接受一个桶名（已给 ${bucket} 与 ${a}）`);
      process.exit(1);
    }
    bucket = a;
  }
  if (!bucket) {
    console.error(`缺桶名。可选 8 个：${BUCKETS.join(", ")}`);
    process.exit(1);
  }
  try {
    console.log(renderDesignTokens(bucket, parts ? { parts } : {}));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
