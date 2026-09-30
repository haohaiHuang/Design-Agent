/**
 * checks/layout.mjs — 布局/视觉纪律检查（移植自 design-router checks/layout.ts）
 *
 * 覆盖 hallmark gate 2 / 10 / 14 / 24 / 34 / 50 / 51 + design-references 环节4 圆角/渐变扫描
 * + 动效 EM-2 / EM-3 / EM-5 / EM-11（EM-11 于 2026-09-30 补齐，编号依共享 workflow.md）。
 * 全部为文本可判定；渲染类（gate 6/35/36/44/45）不在本模块。
 */
import { loc, grepLines, pageText, collectCssVars, propValueSpan, resolveVar, isSrOnlyIdiom, extractCss, parseCss } from "./types.mjs";

const SPACING_OK = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96, 128, 160, 192];
// 4pt 刻度只管**布局级**间距；< 8px 属元件内微调（徽标内边距、光学对齐、hairline 配套），不判违规。
// 早期版本把 2/3/5/6px 也报 warn —— 2026-09-30 真实产物上一次跑出 24 条同类噪音，把唯一的 error 淹了。
const MICRO_SPACING_MAX = 8;
const RADIUS_OK = new Set([0, 2, 4, 6, 8, 12, 16, 24, 32, 999, 9999]);

export function runLayoutChecks(files) {
  const findings = [];
  const isPage = files.some((f) => f.kind === "html" || /\.html?$/.test(f.path));
  const vars = collectCssVars(files);

  for (const f of files) {
    const c = f.content;

    // ---- gate 2: 渐变（含 gradient-text）----
    // 渐变文字的判据只有一条：**同一条规则块内**出现 background-clip: text（含 -webkit- 前缀）。
    // 早期版本把「background-image: <渐变>」也算成渐变文字并报 error，于是把斜纹/纹理背景误报成
    // 渐变文字（2026-09-30 真实产物复盘：一处 repeating-linear-gradient 纹理被判 error）。
    // 纹理/背景渐变保留 warn（需约束集背书），只有 clip:text 惯用法才是 error。
    const cssLines = c.split("\n");
    const ruleBlockAt = (ln) => {
      let s = ln - 1;
      let e = ln - 1;
      while (s > 0 && !cssLines[s].includes("{")) s--;
      while (e < cssLines.length - 1 && !cssLines[e].includes("}")) e++;
      return cssLines.slice(s, e + 1).join("\n");
    };
    for (const ln of grepLines(c, /(linear|radial|conic)-gradient|background-clip\s*:\s*text/i)) {
      const isText = /(-webkit-)?background-clip\s*:\s*text/i.test(ruleBlockAt(ln));
      findings.push({
        gate: "2",
        rule: "gradient",
        severity: isText ? "error" : "warn",
        message: isText
          ? "渐变文字（background-clip: text + gradient）。任何流派都禁止渐变文字。"
          : "检测到渐变（背景或纹理）。背景/纹理渐变需有约束集背书；渐变文字另有判定。",
        location: loc(f.path, ln),
      });
    }

    // ---- gate 10: transition: all ----
    for (const ln of grepLines(c, /transition\s*:\s*all|transition-all/i)) {
      findings.push({
        gate: "10",
        rule: "transition-all",
        severity: "warn",
        message: "transition: all / transition-all。必须指定具体属性（如 transition: color .2s）。",
        location: loc(f.path, ln),
      });
    }

    // ---- gate 14: 动画布局属性 ----
    const LAYOUT_PROPS = /\b(width|height|top|left|margin|padding)\b/i;
    for (const ln of grepLines(c, /transition-property\s*:/i)) {
      const line = c.split("\n")[ln - 1];
      const m = line.match(/transition-property\s*:\s*([^;]+)/i);
      if (m && LAYOUT_PROPS.test(m[1])) {
        findings.push({
          gate: "14",
          rule: "animate-layout-prop",
          severity: "warn",
          message: `transition-property 动画布局属性：${m[1].trim()}（width/height/top/left/margin/padding）。改动画 transform/opacity。`,
          location: loc(f.path, ln),
        });
      }
    }
    for (const m of c.matchAll(/@keyframes\s+[\w-]+\s*\{([^}]*)\}/g)) {
      const hit = m[1].match(LAYOUT_PROPS);
      if (hit) {
        findings.push({
          gate: "14",
          rule: "animate-layout-prop",
          severity: "warn",
          message: `@keyframes 帧内动画布局属性：${hit[0]}。改动画 transform/opacity。`,
          location: loc(f.path),
        });
      }
    }

    // ---- gate 24: 非 4pt 间距 ----
    // 只判定 padding / gap / margin **自身的值片段**（原先按整行抓所有 Npx，会把同一行
    // border:1px 的 1px 算成间距违规）；sr-only 惯用法（width/height:1px + 隐藏）整行豁免。
    for (const prop of ["padding", "gap", "margin"]) {
      for (const ln of grepLines(c, new RegExp(`(?:^|[;{\\s])${prop}\\s*:`, "i"))) {
        const line = c.split("\n")[ln - 1];
        if (isSrOnlyIdiom(line)) continue;
        const span = propValueSpan(line, prop);
        if (!span) continue;
        const vals = span.match(/(\d{1,3})px/g);
        if (!vals) continue;
        const bad = vals.filter((v) => {
          const n = parseInt(v);
          return n !== 0 && n >= MICRO_SPACING_MAX && !SPACING_OK.includes(n);
        });
        if (bad.length) {
          findings.push({
            gate: "24",
            rule: "off-scale-spacing",
            severity: "warn",
            message: `间距值不在 4pt 刻度上：${bad.join(", ")}（--space-* 令牌或多 4 倍数）。`,
            location: loc(f.path, ln),
          });
        }
      }
    }

    // ---- gate 34: 缺 overflow-x: clip（页面级，html/body；含外链样式表）----
    if (f.kind === "html" && !/overflow-x\s*:\s*clip/i.test(pageText(f))) {
      findings.push({
        gate: "34",
        rule: "missing-overflow-x-clip",
        severity: "error",
        message: "页面未见 overflow-x: clip（html 和 body 都要，用 clip 不用 hidden）。320-1920px 无水平滚动是硬要求。",
        location: loc(f.path),
      });
    }

    // ---- gate 50: grid 1fr 无 minmax 且含图片 ----
    if (f.kind !== "html" && /<img|<picture/i.test(c)) {
      for (const ln of grepLines(c, /grid-template-columns\s*:[^;]*\b1fr\b/i)) {
        const line = c.split("\n")[ln - 1];
        if (!/minmax\(0\s*,\s*1fr\)/.test(line)) {
          findings.push({
            gate: "50",
            rule: "grid-track-plain-1fr",
            severity: "warn",
            message: "含图片的 grid 轨道用了裸 1fr（应 minmax(0, 1fr)），手机上会被图片固有宽度撑破。",
            location: loc(f.path, ln),
          });
        }
      }
    }

    // ---- gate 51: display 标题缺 overflow-wrap（页面级，含外链样式表）----
    const pageC = f.kind === "html" ? pageText(f) : c;
    const hasDisplayHead = /(h1|hero|display|title)[\w-]*\s*[,{]/i.test(pageC);
    if (hasDisplayHead && !/overflow-wrap\s*:\s*anywhere/.test(pageC)) {
      findings.push({
        gate: "51",
        rule: "missing-overflow-wrap",
        severity: "warn",
        message: "存在 display 级标题但未见 overflow-wrap: anywhere（长词/连字符会溢出视口）。",
        location: loc(f.path),
      });
    }

    // ---- DR 环节4: 圆角档位扫描 ----
    for (const ln of grepLines(c, /border-radius\s*:\s*([^;]+)/i)) {
      const line = c.split("\n")[ln - 1];
      const m = line.match(/border-radius\s*:\s*([^;]+)/i);
      if (!m) continue;
      const vals = m[1].split(/\s+/).map((v) => v.trim());
      const bad = vals.filter((v) => {
        if (v.endsWith("%")) return false;
        // 解析一层 var(--x)：token 引用是约束集要求，不能反过来判它档位异常；
        // 解析不出（链式 var/无 fallback）则跳过，不误报。
        const resolved = v.includes("var(") ? resolveVar(v, vars) : v;
        if (resolved === null) return false;
        const n = parseFloat(resolved);
        if (Number.isNaN(n)) return false;
        return !RADIUS_OK.has(n);
      });
      if (bad.length) {
        findings.push({
          gate: "DR-4",
          rule: "radius-off-scale",
          severity: "info",
          message: `border-radius 档位异常：${bad.join(", ")}（常见档位 0/2/4/8/12/16/24/999）。`,
          location: loc(f.path, ln),
        });
      }
    }

    // ---- DR-5: 注释定界符自毁 / 未定义的 CSS 变量（渲染核对才能发现的静态盲区）----
    // 实测教训：注释里再写一个 `/*` 会让第一个 `*/` 提前闭合，把后面的 `:root` 一起吞掉，
    // 全页令牌失效（标题回退 Times、按钮透明），而所有文本类检查都看不出来。
    if (f.kind === "html" || f.kind === "css") {
      const raw = f.raw ?? c;
      const opens = (raw.match(/\/\*/g) || []).length;
      const closes = (raw.match(/\*\//g) || []).length;
      if (opens > closes) {
        findings.push({
          gate: "DR-5",
          rule: "comment-unterminated",
          severity: "error",
          message: `CSS 注释定界符未闭合（/* ${opens} 个 vs */ ${closes} 个）：注释会一直吃到文件尾，其后的 :root 与规则全部失效——渲染核对才能发现，静态扫描看不见。`,
          location: loc(f.path),
        });
      }
    }
    for (const ln of grepLines(c, /var\(\s*--[a-z0-9-]+/i)) {
      const line = c.split("\n")[ln - 1];
      for (const m of line.matchAll(/var\(\s*--([a-z0-9-]+)\s*(,)?/gi)) {
        const name = m[1].toLowerCase();
        if (vars.has(name) || m[2]) continue; // 已定义或有 fallback → 合法
        findings.push({
          gate: "DR-5",
          rule: "undefined-css-var",
          severity: "warn",
          message: `引用了未定义的 CSS 变量 --${name}（且无 fallback）：该条声明会整条失效，渲染结果与代码意图不一致。`,
          location: loc(f.path, ln),
        });
      }
    }

    // ---- 动效 EM-* 子集（来源 emilkowalski/skills STANDARDS.md，grep 可查的机器子集）----
    // EM-1（transition: all）由 gate 10 覆盖；EM-7（布局属性动画）由 gate 14 覆盖——同语义不重复输出。

    // EM-2: 入场动画 scale(0)（内容从 scale(0) 进入会闪跳/布局抖动）
    for (const ln of grepLines(c, /@keyframes[^\{]*\s*\{[^}]*scale\s*\(\s*0\s*\)|transform\s*:[^;]*scale\s*\(\s*0\s*\)/i)) {
      findings.push({
        gate: "EM-2",
        rule: "motion-enter-scale-zero",
        severity: "warn",
        message: "动效 EM-2: 入场动画 scale(0)（transform: scale(0)）。入场应从 scale(0.95-0.98) 起，避免闪跳/布局抖动。",
        location: loc(f.path, ln),
      });
    }

    // EM-3: UI 元素上用 ease-in（UI 动画应默认 ease-out；ease-in 用于离场）
    for (const ln of grepLines(c, /animation-timing-function\s*:\s*ease-in\b|transition-timing-function\s*:\s*ease-in\b/i)) {
      findings.push({
        gate: "EM-3",
        rule: "motion-ease-in-ui",
        severity: "warn",
        message: "动效 EM-3: UI 元素上使用 ease-in（animation/transition-timing-function: ease-in）。UI 入场/状态变化应默认 ease-out；ease-in 仅用于离场动画。",
        location: loc(f.path, ln),
      });
    }

    // EM-5: UI 动画时长 >300ms 无理由（UI 状态变化应在 300ms 内；>300ms 仅限叙事性/全屏过渡）
    for (const ln of grepLines(c, /(animation|transition)-duration\s*:\s*([^;]+)/i)) {
      const line = c.split("\n")[ln - 1];
      const m = line.match(/(animation|transition)-duration\s*:\s*([^;]+)/i);
      if (!m) continue;
      const durVals = m[2].match(/(\d+(?:\.\d+)?)(ms|s)\b/gi);
      if (!durVals) continue;
      const over = durVals.filter((v) => {
        const n = parseFloat(v);
        return /ms$/i.test(v) ? n > 300 : n > 0.3;
      });
      if (over.length) {
        findings.push({
          gate: "EM-5",
          rule: "motion-duration-over-300",
          severity: "warn",
          message: `动效 EM-5: UI 动画时长 >300ms（${over.join(", ")}）无理由。UI 状态变化应在 300ms 内；>300ms 仅限叙事性/全屏过渡。`,
          location: loc(f.path, ln),
        });
      }
    }

    // EM-11: will-change 用在非合成属性（滥用会吃显存并可能更慢）
    // 编号依共享 workflow.md 的 EM 口径（EM-1..EM-10 已占用；upstream motion.ts 旧编号为 EM-3）。
    const css11 = extractCss(c, f.path, f.kind);
    if (css11) {
      for (const r of parseCss(css11).rules) {
        const m = r.decls.match(/(?:^|[;{\s])will-change\s*:\s*([^;}]+)/i);
        if (!m) continue;
        const COMPOSITED = new Set(["transform", "opacity", "filter", "scroll-position", "contents", "auto", "backdrop-filter"]);
        const bad = m[1]
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter((propName) => propName && !COMPOSITED.has(propName));
        if (bad.length) {
          findings.push({
            gate: "EM-11",
            rule: "will-change-misuse",
            severity: "warn",
            message: `动效 EM-11: will-change: ${bad.join(", ")} 不是合成属性（只应用 transform/opacity/filter）。滥用会吃掉显存并可能更慢。`,
            location: loc(f.path, r.line),
          });
        }
      }
    }
  }

  return findings;
}
