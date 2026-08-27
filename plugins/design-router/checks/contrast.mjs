/**
 * checks/contrast.mjs — 对比度计算（hallmark gate 40-41，完整可算；移植自 design-router checks/contrast.ts）
 *
 * 解析 CSS 规则的 color/background 配对，计算 WCAG 2.1 对比度 + APCA 近似值。
 * 支持：hex / rgb() / hsl() / oklch() / CSS 变量（一层 var() 解析，:root 定义）。
 * 判定以 WCAG 2.1 为准；APCA 为近似参考（标注），不参与阈值判定。
 */
import { loc } from "./types.mjs";

// ---------- 色值解析 ----------

function parseHex(h) {
  let s = h.replace(/^#/, "");
  if (s.length === 3 || s.length === 4) s = s.split("").map((c) => c + c).join("");
  if (s.length !== 6 && s.length !== 8) return null;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return { r, g, b };
}

function parseRgb(str) {
  const m = str.match(/rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)/i);
  if (!m) return null;
  const to255 = (v) => (v.endsWith("%") ? (parseFloat(v) / 100) * 255 : parseFloat(v));
  return { r: to255(m[1]), g: to255(m[2]), b: to255(m[3]) };
}

function parseHsl(str) {
  const m = str.match(/hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/i);
  if (!m) return null;
  let h = parseFloat(m[1]) % 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m2 = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return { r: Math.round((rgb[0] + m2) * 255), g: Math.round((rgb[1] + m2) * 255), b: Math.round((rgb[2] + m2) * 255) };
}

/** oklch → sRGB（Björn Ottosson 公式） */
function parseOklch(str) {
  const m = str.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:deg)?/i);
  if (!m) return null;
  const L = parseFloat(m[1]) / 100; // 0-1
  const C = parseFloat(m[2]);       // 0-0.4
  const H = (parseFloat(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
  const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const to255 = (v) => Math.round(clamp01(v) * 255);
  return { r: to255(r), g: to255(g), b: to255(bl) };
}

export function parseColor(str) {
  const s = str.trim();
  if (s.startsWith("#")) return parseHex(s);
  if (/^rgba?\(/i.test(s)) return parseRgb(s);
  if (/^hsla?\(/i.test(s)) return parseHsl(s);
  if (/^oklch\(/i.test(s)) return parseOklch(s);
  return null;
}

// ---------- 对比度 ----------
function linearize(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb) {
  const r = linearize(rgb.r), g = linearize(rgb.g), b = linearize(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function wcagContrast(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** APCA 近似（简化 SAPC，标注精度上限；判定以 WCAG 为准） */
export function apcaApprox(fg, bg) {
  const y = (rgb) => {
    const r = Math.pow(rgb.r / 255, 2.4);
    const g = Math.pow(rgb.g / 255, 2.4);
    const b = Math.pow(rgb.b / 255, 2.4);
    return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  };
  const yt = y(fg), yb = y(bg);
  const adapt = (v) => (v > 0.022 ? Math.pow(v, 0.4) - 0.031 : 0);
  const at = adapt(yt), ab = adapt(yb);
  const lc = yb > yt ? (ab - at) * 1.14 : (at - ab) * 1.14;
  return Math.abs(lc) * 100;
}

/** OKLCH 空间近似距离（gate 41 特例：文字≈填充）——用线性亮度差近似 */
function lightnessDistance(fg, bg) {
  return Math.abs(relativeLuminance(fg) - relativeLuminance(bg));
}

// ---------- CSS 解析 ----------

// 首字符排除 \n（避免 m.index 落在行首换行导致行号偏移）
const RULE_RE = /([^{}@\n][^{}]*)\{([^{}]*)\}/g;
const VAR_RE = /^\s*--([\w-]+)\s*:\s*(.+?)\s*;?\s*$/;

function extractRules(css) {
  const rules = [];
  const lines = css.split("\n");
  let offset = 0;
  const findLine = (idx) => {
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      count += lines[i].length + 1;
      if (count > idx) return i + 1;
    }
    return 0;
  };
  for (const m of css.matchAll(RULE_RE)) {
    const selector = m[1].trim();
    const decls = m[2];
    if (!selector || selector.startsWith("--")) continue;
    rules.push({ selector, decls, line: findLine(m.index ?? offset) });
    offset = m.index ?? offset;
  }
  return rules;
}

function extractVars(css) {
  const vars = new Map();
  for (const m of css.matchAll(RULE_RE)) {
    const selector = m[1].trim();
    if (!/^:root|^html|^body/.test(selector)) continue;
    for (const line of m[2].split(/[;\n]/)) {
      const vm = line.match(VAR_RE);
      if (vm) vars.set(vm[1].trim(), vm[2].trim());
    }
  }
  return vars;
}

function resolveVar(value, vars, depth = 0) {
  if (depth > 3) return value;
  const m = value.match(/var\(\s*--([\w-]+)/);
  if (!m) return value;
  const defined = vars.get(m[1]);
  if (!defined) return value; // 无法解析，保持原样
  const rest = value.replace(m[0], defined);
  return resolveVar(rest, vars, depth + 1);
}

/** 从声明块提取第一个可解析的 color / background-color */
function pickColor(decls, prop, vars) {
  const re = new RegExp(`${prop}\\s*:\\s*([^;}]+)`);
  const m = decls.match(re);
  if (!m) return null;
  const resolved = resolveVar(m[1].trim(), vars);
  if (/var\(/.test(resolved)) return null; // 多层 var 未解析
  if (resolved.startsWith("transparent")) return null;
  // background 简写：仅接受纯色值开头
  if (prop === "background") {
    const first = resolved.split(/\s+/)[0];
    return parseColor(first) ? first : null;
  }
  return parseColor(resolved) ? resolved : null;
}

/** 选择器包含判断：child 选择器文本中，parent 是否作为完整选择器单元出现（后代/子代上下文） */
function isDescendantContext(parent, child) {
  const esc = parent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[\\s>+~])${esc}(?=[\\s>+~.#:[]|$)`);
  return re.test(child);
}

// ---------- 主检查 ----------
export function runContrastChecks(files) {
  const findings = [];
  const TEXT_THRESHOLD = 4.5;

  for (const f of files) {
    if (!/\.(css|scss|less|tsx|jsx|vue|html?)$/i.test(f.path)) continue;
    const c = f.content;
    // HTML 文件：提取 <style> 块作为 CSS 源（避免 <style> 标签污染选择器解析）
    let cssSource = c;
    if (/\.html?$/i.test(f.path)) {
      const blocks = [...c.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
      if (blocks) cssSource = blocks;
    }
    const vars = extractVars(cssSource);
    const rules = extractRules(cssSource);
    let paired = 0;
    let fails = 0;

    // 同规则配对
    for (const rule of rules) {
      let bgStr = pickColor(rule.decls, "background-color", vars);
      if (!bgStr) bgStr = pickColor(rule.decls, "background", vars);
      const colorStr = pickColor(rule.decls, "color", vars);
      if (!bgStr || !colorStr) continue;
      const fg = parseColor(colorStr);
      const bg = parseColor(bgStr);
      if (!fg || !bg) continue;
      paired++;

      const ratio = wcagContrast(fg, bg);
      const apca = apcaApprox(fg, bg);
      if (ratio < TEXT_THRESHOLD) {
        fails++;
        findings.push({
          gate: "40",
          rule: "contrast-fail",
          severity: "error",
          message: `对比度 ${ratio.toFixed(2)}:1 < 4.5:1（${colorStr} on ${bgStr}；APCA≈${apca.toFixed(0)}，近似仅供参考）。选择器 ${rule.selector.slice(0, 60)}。大字/图标按 3:1 人工放宽。`,
          location: loc(f.path, rule.line),
        });
      }
      // gate 41: 文字≈填充（黑底黑字类）
      if (lightnessDistance(fg, bg) < 0.05 && ratio < 1.2) {
        findings.push({
          gate: "41",
          rule: "ink-on-ink",
          severity: "error",
          message: `文字色与填充色几乎相同（${colorStr} on ${bgStr}，ratio ${ratio.toFixed(2)}:1）。疑似 ink-on-ink——深色填充上要用 --color-paper 类文字。`,
          location: loc(f.path, rule.line),
        });
      }
    }

    // 继承配对：规则 A 有背景且自身无 color（或已配对），规则 B 选择器含 A 的完整单元且有 color → 配对
    const bgRules = rules
      .map((r) => ({ rule: r, bg: pickColor(r.decls, "background-color", vars) ?? pickColor(r.decls, "background", vars) }))
      .filter((x) => x.bg && x.rule.selector && !/[\\s>+~]/.test(x.rule.selector.trim())); // 仅简单选择器（单元素）作背景锚
    for (const a of bgRules) {
      const bg = parseColor(a.bg);
      if (!bg || a.bg.toLowerCase().includes("rgba(")) continue; // 半透明背景混合未知，跳过
      for (const b of rules) {
        if (b.selector === a.rule.selector || !isDescendantContext(a.rule.selector.trim(), b.selector.trim())) continue;
        const colorStr = pickColor(b.decls, "color", vars);
        if (!colorStr) continue;
        const fg = parseColor(colorStr);
        if (!fg) continue;
        paired++;
        const ratio = wcagContrast(fg, bg);
        if (ratio < TEXT_THRESHOLD) {
          fails++;
          findings.push({
            gate: "40",
            rule: "contrast-fail-inherited",
            severity: "error",
            message: `继承链对比度 ${ratio.toFixed(2)}:1 < 4.5:1（${colorStr} 渲染在 ${a.bg} 背景上）。选择器 ${b.selector.trim().slice(0, 50)} 在 ${a.rule.selector.trim()} 内。深色面板内文字需用浅色 token。`,
            location: loc(f.path, b.line),
          });
        }
      }
    }

    if (paired === 0 && /\.(css|scss)$/i.test(f.path) && /color\s*:/.test(c)) {
      findings.push({
        gate: "40",
        rule: "contrast-unverifiable",
        severity: "info",
        message: "有 color 声明但未能配对 background（继承/变量未解析）。对比度无法机器验证，请人工核对。",
        location: loc(f.path),
      });
    }
  }

  return findings;
}
