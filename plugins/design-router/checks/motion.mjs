/**
 * checks/motion.mjs — 动效纪律检查（含 enter / exit 方向判定）
 *
 * 由 pi 侧 checks/motion.ts 移植（DSH 副本用 .mjs；等价性由 checks/dsh-parity.test.mjs 差分钉住）。
 *
 * 覆盖 craft 段「动效数值 / 物理感 / 实现」里可机器判定的子集：
 *   EM-2  进入方向 scale(0)（含静止态） → 🔴
 *   EM-3  进入方向用 ease-in           → 🔴
 *   EM-5  进入方向时长 > 300ms          → 🟡
 *   EM-17 will-change 用在非合成属性    → 🟡
 * （编号依共享 `skills/design-references/references/workflow.md` 的 EM 清单，本模块只用机器层号）
 *
 * ## 为什么需要方向判定
 * `ease-in` 与 `scale(0)` 在**退出**方向是合法的（离场就该加速、就该缩没），
 * 在**进入**方向是错的（进场该减速、该从可见尺寸缩来）。不分方向的裸检查
 * 会把正确代码判成错——而这两条在 🔴 档，误报会直接拦死产出。
 *
 * ## 方向怎么判（两条规则，都不靠猜）
 * 1. **@keyframes**：首帧 `scale(0)` ⟹ 从「无」出现 ⟹ 进入（是 bug）；
 *    末帧 `scale(0)` ⟹ 缩到「无」离场 ⟹ 退出（合法）。无需读动画名。
 * 2. **transition**：CSS 语义——属性变化时用的是**新状态** computed style 里的
 *    transition。故「状态选择器（.open/:hover/[data-state=open]）上的 transition」
 *    只作用于进入；「基础选择器上的 transition」在状态规则**也**声明了 transition 时
 *    只作用于退出，否则两个方向共用 ⟹ 归 ambiguous。
 *
 * 无法判定方向时降 🟡，不硬判 🔴（三轴第①条：判不准就不给硬档）。
 */
import { loc } from "./types.mjs";

// 状态选择器：补齐后即「进入」方向
const ENTER_SEL =
  /\.is-|\.open(?!\w)|\.opened|\.visible|\.shown?(?!\w)|\.active(?!\w)|\.entering|\.expanded|\.in(?!\w)|:hover|:focus|:checked|:target|\[data-state=["']open|\[data-open|\[aria-expanded=["']true/;
const EXIT_SEL =
  /\.exiting|\.leaving|\.closing|\.closed|\.hidden(?!\w)|\[data-state=["']closed|\[data-closed|\[hidden\]/;

// 弹层豁免（craft 段：modal/drawer/overlay 走 200–500ms）
const OVERLAY_SEL = /modal|drawer|overlay|dialog|sheet|popover|lightbox|toast/i;
// accordion 豁免（craft 段：height 仅 accordion）
export const ACCORDION_SEL = /accordion|collaps|details|disclos|expand|reveal|faq/i;
// 合成友好属性（will-change 只该用在这些上）
const COMPOSITED = new Set(["transform", "opacity", "filter", "scroll-position", "contents", "auto", "backdrop-filter"]);

// ---------------------------------------------------------------- CSS 提取与解析

/** 收集可解析的 CSS：<style> 块 + 行内 style="..." 声明；非 CSS 又两者皆无时返回 null
 *  （JS 对象字面量的 {} 会污染解析，所以 .tsx/.js 只在真的带样式时才解析） */
export function extractCss(content, path, kind) {
  const isCss = kind === "css" || /\.(css|scss|sass|less)$/i.test(path);
  const parts = [];
  if (isCss) {
    parts.push(content);
  } else {
    parts.push(...[...content.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]));
    // JSX 的 style={{...}} 不匹配（无引号），只取 HTML 的 style="..."
    parts.push(...[...content.matchAll(/style\s*=\s*"([^"]*)"/gi)].map((m) => `.inline{${m[1]}}`));
  }
  const joined = parts.join("\n").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  return joined.trim() ? joined : null;
}

export function parseCss(src, lineOffset = 0, at = []) {
  const rules = [];
  const keyframes = [];
  const nl = (i) => src.slice(0, i).split("\n").length;
  let i = 0;
  for (;;) {
    const open = src.indexOf("{", i);
    if (open === -1) break;
    const selector = src.slice(i, open).trim().replace(/\s+/g, " ");
    let depth = 1;
    let j = open + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") depth--;
      j++;
    }
    const body = src.slice(open + 1, j - 1);
    const line = lineOffset + nl(open) - 1;
    if (/^@keyframes\b/i.test(selector)) {
      keyframes.push({ name: selector.replace(/^@keyframes\s+/i, "").trim(), body, line });
    } else if (/^@(media|supports|layer|container|scope)\b/i.test(selector)) {
      const inner = parseCss(body, lineOffset + nl(open), [...at, selector]);
      rules.push(...inner.rules);
      keyframes.push(...inner.keyframes);
    } else if (selector && !selector.startsWith("@")) {
      rules.push({ selector, decls: body, line, at });
    }
    i = j;
  }
  return { rules, keyframes };
}

/** 解析 @keyframes 的各帧（label + 声明） */
export function kfSteps(body) {
  const out = [];
  let i = 0;
  for (;;) {
    const open = body.indexOf("{", i);
    if (open === -1) break;
    const label = body.slice(i, open).trim();
    let d = 1;
    let j = open + 1;
    while (j < body.length && d > 0) {
      if (body[j] === "{") d++;
      else if (body[j] === "}") d--;
      j++;
    }
    out.push({ label, decls: body.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

// ---------------------------------------------------------------- 取值helper

const scaleOf = (decls) => {
  const m = decls.match(/\bscale(?:3d)?\s*\(\s*([\d.]+)/i);
  return m ? parseFloat(m[1]) : null;
};
const opacityOf = (decls) => {
  const m = decls.match(/(?:^|[;{\s])opacity\s*:\s*([\d.]+)/i);
  return m ? parseFloat(m[1]) : null;
};

/** 动画名方向回退（首帧/末帧无信息时用）。camelCase 或分隔符形式，避免 spin 命中 in */
const NAME_ENTER = /(?:[a-z](?:In|Enter|Open|Show|Appear|Reveal|Mount|Expand)|(?:^|[-_.])(?:in|enter|open|show|appear|reveal|mount|expand))$/;
const NAME_EXIT = /(?:[a-z](?:Out|Exit|Close|Hide|Leave|Dismiss|Unmount|Collapse)|(?:^|[-_.])(?:out|exit|close|hide|leave|dismiss|unmount|collapse))$/;

/** @keyframes 方向：轨迹优先，动画名回退 */
export function kfDirection(kf) {
  const steps = kfSteps(kf.body);
  if (steps.length >= 2) {
    const first = scaleOf(steps[0].decls);
    const last = scaleOf(steps[steps.length - 1].decls);
    if (first === 0) return "enter"; // 首帧就是「无」⟹ 从无出现
    if (last === 0) return "exit"; // 末帧缩到「无」⟹ 离场
    const fo = opacityOf(steps[0].decls);
    const lo = opacityOf(steps[steps.length - 1].decls);
    if (fo === 0 && lo !== null && lo > 0) return "enter";
    if (lo === 0 && fo !== null && fo > 0) return "exit";
  }
  if (NAME_ENTER.test(kf.name)) return "enter";
  if (NAME_EXIT.test(kf.name)) return "exit";
  return "ambiguous";
}

/** transition 方向：见文件头 §方向怎么判 */
export function transitionDirection(rule, all) {
  if (ENTER_SEL.test(rule.selector)) return "enter"; // transition 落在状态规则上 ⟹ 目标是该状态 ⟹ 进场
  if (EXIT_SEL.test(rule.selector)) return "exit";
  const base = rule.selector.match(/\.[\w-]+/g) ?? [];
  if (!base.length) return "ambiguous";
  const paired = all.find(
    (o) =>
      o !== rule &&
      /\btransition/.test(o.decls) &&
      (ENTER_SEL.test(o.selector) || EXIT_SEL.test(o.selector)) &&
      base.every((c) => o.selector.includes(c)),
  );
  if (!paired) return "ambiguous"; // 无状态规则 ⟹ 两个方向共用同一条 transition
  // 基础态更可见 ⟹ 基础规则的 transition 管「回到可见」= 进场；反之管退场。
  const self = visScore(rule.decls) ?? 1;
  const other = visScore(paired.decls) ?? 1;
  if (self === other) return "ambiguous";
  return self > other ? "enter" : "exit";
}

/** 可见度：scale(0) 视为不可见；否则取 opacity（未声明按静止可见=1） */
function visScore(decls) {
  if (scaleOf(decls) === 0) return 0;
  return opacityOf(decls);
}

/** transition 各段的时长（段内第一个 <time> 是 duration，后面的才是 delay） */
function durationsOf(decls) {
  const out = [];
  const push = (v) => {
    for (const m of v.matchAll(/([\d.]+)(ms|s)\b/g)) {
      out.push(m[2] === "s" ? parseFloat(m[1]) * 1000 : parseFloat(m[1]));
      break; // 段内只取首个
    }
  };
  for (const m of decls.matchAll(/transition-duration\s*:\s*([^;}]+)/gi)) for (const seg of m[1].split(",")) push(seg);
  for (const m of decls.matchAll(/(?:^|[;{\s])transition\s*:\s*([^;}]+)/gi)) for (const seg of m[1].split(",")) push(seg);
  return out;
}

// ---------------------------------------------------------------- 检查

export function runMotionChecks(files) {
  const findings = [];

  for (const f of files) {
    const css = extractCss(f.content, f.path, f.kind);
    if (!css) continue;
    const { rules, keyframes } = parseCss(css);
    const kfByName = new Map(keyframes.map((k) => [k.name, k]));

    const report = (gate, rule, severity, message, line) =>
      findings.push({ gate, rule, severity, message, location: loc(f.path, line) });

    // ---- EM-3: 进入方向用 ease-in ----
    for (const r of rules) {
      if (!/\btransition\b/.test(r.decls)) continue;
      if (!/\bease-in(?!-out)/.test(r.decls)) continue;
      const dir = transitionDirection(r, rules);
      if (dir === "exit") continue; // 离场加速 = 正确用法
      const sev = dir === "enter" ? "error" : "warn";
      report(
        "EM-3",
        "ease-in-on-enter",
        sev,
        `<${r.selector}> 的进入过渡用 ease-in（先慢后快）。进入应减速入位 → var(--ease-out) 或 cubic-bezier(0.23,1,0.32,1)。` +
          (dir === "ambiguous" ? "（未识别出状态选择器，无法确认方向，故记 🟡）" : ""),
        r.line,
      );
    }
    // @keyframes 上的 animation-timing-function / animation 简写
    for (const kf of keyframes) {
      const shorthand = css.match(new RegExp(`animation\\s*:[^;}]*\\b${kf.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[^;}]*`, "i"));
      const usesEaseIn = /\bease-in(?!-out)/.test(shorthand?.[0] ?? "");
      if (usesEaseIn && kfDirection(kf) === "enter") {
        report("EM-3", "ease-in-on-enter", "error", `动画 <${kf.name}> 进入方向用 ease-in。进入应减速入位。`, kf.line);
      }
    }

    // ---- EM-2: 进入方向 scale(0) ----
    for (const kf of keyframes) {
      const steps = kfSteps(kf.body);
      if (!steps.length) continue;
      if (scaleOf(steps[0].decls) === 0 && kfDirection(kf) === "enter") {
        report(
          "EM-2",
          "scale-zero-on-enter",
          "error",
          `动画 <${kf.name}> 首帧 transform: scale(0) —— 从「无」凭空出现。改 scale(0.9–0.97) + opacity: 0。`,
          kf.line,
        );
      }
    }
    for (const r of rules) {
      if (!/\btransition\b/.test(r.decls)) continue;
      if (scaleOf(r.decls) !== 0) continue; // 静止态就是 scale(0)
      // 状态规则上的 scale(0) 不是「静止态」：`.x.closed{scale(0)}` 是缩没离场，合法写法。
      // 只有「静止态就缩没」才报 —— 那正是「元素只能从无到有」的成因。
      if (ENTER_SEL.test(r.selector) || EXIT_SEL.test(r.selector)) continue;
      report(
        "EM-2",
        "scale-zero-on-enter",
        "error",
        `<${r.selector}> 静止态 transform: scale(0) 且声明了 transition —— 元素只能从「无」缩着出现。改 scale(0.9–0.97) + opacity: 0。`,
        r.line,
      );
    }

    // ---- EM-17: will-change 用在非合成属性 ----
    for (const r of rules) {
      const m = r.decls.match(/will-change\s*:\s*([^;}]+)/i);
      if (!m) continue;
      const bad = m[1]
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((p) => p && !COMPOSITED.has(p));
      if (bad.length) {
        report("EM-17", "will-change-misuse", "warn", `will-change: ${bad.join(", ")} 不是合成属性（只应用 transform/opacity/filter）。滥用会吃掉显存并可能更慢。`, r.line);
      }
    }

    // ---- EM-5: 进入方向时长 > 300ms ----
    for (const r of rules) {
      const over = durationsOf(r.decls).filter((d) => d > 300);
      if (!over.length) continue;
      if (OVERLAY_SEL.test(r.selector)) continue; // modal/drawer/overlay 走 200–500ms
      if (ACCORDION_SEL.test(r.selector)) continue;
      const dir = transitionDirection(r, rules);
      if (dir === "exit") continue;
      report(
        "EM-5",
        "overlong-transition",
        "warn",
        `<${r.selector}> 过渡时长 ${over.join("/")}ms > 300ms（UI 通用上限；modal/drawer/overlay 可 200–500ms）。`,
        r.line,
      );
    }
  }

  return findings;
}
