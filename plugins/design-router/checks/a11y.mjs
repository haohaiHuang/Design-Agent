/**
 * checks/a11y.mjs — 可访问性纪律检查（移植自 design-router checks/a11y.ts）
 *
 * 覆盖 hallmark gate 26 / 27 / 33 / 39（文本可判定子集）+ DR-A3 / DR-A4 / DR-A5 / DR-A7 / DR-A8
 *   （2026-09-30 从上游 a11y.ts 补齐；此前 DSH 只有前 4 项，DR-A* 家族整体缺失）。
 *   DR-A3 控件无 accessible name / DR-A4 非原生元素绑点击无 role·tabindex / DR-A5 hover 显现未限定输入设备 /
 *   DR-A7 有 <nav> 但无 skip link / DR-A8 正数 tabindex。
 *   DR-A6（hit-area < 24px）**故意不做机器 gate**：需基础样式层叠求解，静态判不准，归 craft 段模型判。
 * gate 40-41 对比度在 contrast.mjs 单独算。
 */
import { loc, grepLines, pageText, extractCss, parseCss } from "./types.mjs";

export function runA11yChecks(files) {
  const findings = [];

  for (const f of files) {
    const c = f.content;
    const hasInteractive = /<(button|a\b|input|select|textarea|summary|label\b)/i.test(c);

    // ---- gate 26: 交互元素缺 :focus-visible（页面级：外链样式表里写了也算有）----
    if (hasInteractive && !/:focus-visible/.test(pageText(f))) {
      findings.push({
        gate: "26",
        rule: "missing-focus-visible",
        severity: "error",
        message: "页面含交互元素但无任何 :focus-visible 规则。键盘用户需要即时焦点指示。",
        location: loc(f.path),
      });
    }

    // ---- gate 27: 动效缺 prefers-reduced-motion ----
    const hasMotion = /@keyframes|animation\s*:|transition\s*:/.test(c);
    if (hasMotion && !/prefers-reduced-motion/.test(c)) {
      findings.push({
        gate: "27",
        rule: "missing-reduced-motion",
        severity: "error",
        message: "存在 animation/transition 但无 @media (prefers-reduced-motion: reduce) 回退。每个动效都要有 reduced-motion 版本。",
        location: loc(f.path),
      });
    }

    // ---- gate 33: svg 缺 aria ----
    for (const ln of grepLines(c, /<svg\b/i)) {
      const line = c.split("\n")[ln - 1];
      if (!/aria-label|aria-hidden|role="img"/.test(line)) {
        findings.push({
          gate: "33",
          rule: "svg-missing-aria",
          severity: "warn",
          message: "<svg> 缺 aria-label 或 aria-hidden=\"true\"。装饰性 SVG 必须显式隐藏或命名。",
          location: loc(f.path, ln),
        });
      }
    }

    // ---- gate 39: input 态（启发式子集）----
    const hasInput = /<(input|textarea|select)\b/i.test(c);
    if (hasInput) {
      // 39a: 焦点环用 border 而非 outline
      const focusUsesBorder = /:focus[^}]{0,200}?border\s*:/i.test(c) && !/:focus[^}]{0,200}?outline\s*:/.test(c);
      if (focusUsesBorder) {
        findings.push({
          gate: "39",
          rule: "focus-ring-from-border",
          severity: "warn",
          message: "焦点态通过 border 实现（应 outline: 2px solid var(--color-focus) + outline-offset），border 变化会移动布局。",
          location: loc(f.path),
        });
      }
      // 39b: disabled 只靠 opacity
      const disablesByOpacityOnly = /:disabled[^{]*\{[^}]*opacity\s*:/i.test(c) && !/:(disabled|disabled)[^{]*\{[^}]*(cursor\s*:\s*not-allowed|aria-disabled)/i.test(c);
      if (disablesByOpacityOnly) {
        findings.push({
          gate: "39",
          rule: "disabled-opacity-only",
          severity: "warn",
          message: "disabled 仅靠 opacity。需要三通道：opacity + cursor: not-allowed + disabled 属性。",
          location: loc(f.path),
        });
      }
    }

    // ---------------------------------------------------------------- DR-A* 家族（移植自上游 a11y.ts）
    // 下列 5 条以前只在 pi 侧存在；2026-09-30 真实产物复盘时发现 DR-A7 恰好命中用户的产物
    // 而 DSH 报不出来，故整体补齐。文案/严重级与上游逐字一致。

    // ---- DR-A3: 交互控件无 accessible name ----
    // 有界匹配 [\s\S]{0,600}? 防回溯与跨元素误配。JSX 内插文本（{t('close')}）去标签后仍非空 → 不报。
    for (const m of c.matchAll(/<(button|a)\b([^>]*)>([\s\S]{0,600}?)<\/\1\s*>/gi)) {
      const [, tag, attrs, inner] = m;
      if (tag.toLowerCase() === "a" && !/\bhref\s*=/.test(attrs)) continue; // 无 href 的 <a> 不是控件
      if (/\b(aria-label|aria-labelledby|title)\s*=\s*(\{[^}]+\}|["'][^"']+["'])/.test(attrs)) continue;
      if (/\bhidden\b|aria-hidden\s*=\s*"true"/.test(attrs)) continue;
      if (inner.replace(/<[^>]*>/g, "").replace(/&nbsp;|\s/g, "")) continue; // 有可见文本
      if (/<img\b[^>]*\balt\s*=\s*["'][^"']+["']/i.test(inner)) continue; // <img alt="Close">
      if (/<svg\b[^>]*aria-label\s*=/i.test(inner)) continue;
      findings.push({
        gate: "DR-A3",
        rule: "control-missing-accessible-name",
        severity: "error",
        message: `<${tag}> 无 accessible name（内部无文本、无 aria-label/title/命名图片）。图标按钮必须命名，否则屏幕阅读器只读 “button”。`,
        location: loc(f.path),
      });
    }

    // ---- DR-A4: 非原生元素绑点击且无 role/tabindex → 键盘不可达 ----
    for (const ln of grepLines(c, /<(div|span|li|td)\b[^>]*(onclick|onClick|@click)\s*=/)) {
      const line = c.split("\n")[ln - 1];
      if (/\brole\s*=|tabindex|tabIndex/.test(line)) continue;
      findings.push({
        gate: "DR-A4",
        rule: "non-native-interactive",
        severity: "error",
        message: "非原生元素绑定了点击事件但无 role/tabindex —— 键盘与屏幕阅读器完全不可达，且不支持 Cmd/Ctrl/中键。用 <button>（动作）或 <a href>（导航）。",
        location: loc(f.path, ln),
      });
    }

    // ---- DR-A8: 正数 tabindex（tabindex 只用 0 / -1）----
    for (const ln of grepLines(c, /tabindex\s*=\s*["'{]?\s*[1-9]/i)) {
      findings.push({
        gate: "DR-A8",
        rule: "positive-tabindex",
        severity: "error",
        message: `正数 tabindex（第 ${ln} 行）。它把元素提到 DOM 顺序之外，键盘 Tab 顺序会按数字大小漂移。只用 tabindex="0"（可聚焦）或 "-1"（程序聚焦）。`,
        location: loc(f.path, ln),
      });
    }

    // ---- DR-A7: 有 <nav> 但无 skip link（WCAG 2.4.1 bypass blocks）----
    if (/<nav\b|role\s*=\s*["']navigation/i.test(c)) {
      const hasSkip =
        /skip[-_ ]?to[-_ ]?(?:content|main)|skip[-_ ]?link|\.skip[-_]|href\s*=\s*["']#(?:main|content|maincontent)\b/i.test(c);
      if (!hasSkip) {
        findings.push({
          gate: "DR-A7",
          rule: "missing-skip-link",
          severity: "warn",
          message: "页面有 <nav> 但无 skip-to-content 链接。键盘用户每次跳转都要重新 Tab 过整个导航。",
          location: loc(f.path),
        });
      }
    }

    // ---- DR-A5: :hover 改变可见性/几何但未限定输入设备 ----
    // 只拦「靠 hover 显现」的规则（改 opacity/visibility/display/transform/尺寸）；
    // 纯变色/加下划线的 hover 在触屏上不触发也无害，不报（否则满屏噪音）。
    const cssA5 = extractCss(c, f.path, f.kind);
    if (cssA5) {
      const HOVER_REVEAL = /(?:^|[;{\s])(opacity|visibility|display|transform|height|max-height|width|max-width)\s*:/i;
      const bare = parseCss(cssA5).rules.filter(
        (r) => /:hover/.test(r.selector) && HOVER_REVEAL.test(r.decls) && !r.at.some((a) => /hover\s*:\s*(hover|none)/i.test(a)),
      );
      if (bare.length) {
        findings.push({
          gate: "DR-A5",
          rule: "hover-reveal-without-hover-media",
          severity: "warn",
          message: `${bare.length} 条 :hover 规则改变了可见性/几何（${bare.slice(0, 3).map((r) => r.selector).join("、")}${bare.length > 3 ? " …" : ""}）但未包 @media (hover: hover)。触屏上这些悬停态会粘住且无法取消。`,
          location: loc(f.path, bare[0].line),
        });
      }
    }
  }

  return findings;
}
