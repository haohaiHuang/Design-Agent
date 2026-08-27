/**
 * checks/a11y.mjs — 可访问性纪律检查（移植自 design-router checks/a11y.ts）
 *
 * 覆盖 hallmark gate 26 / 27 / 33 / 39（文本可判定子集）。
 * gate 40-41 对比度在 contrast.mjs 单独算。
 */
import { loc, grepLines } from "./types.mjs";

export function runA11yChecks(files) {
  const findings = [];

  for (const f of files) {
    const c = f.content;
    const hasInteractive = /<(button|a\b|input|select|textarea|summary|label\b)/i.test(c);

    // ---- gate 26: 交互元素缺 :focus-visible ----
    if (hasInteractive && !/:focus-visible/.test(c)) {
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
  }

  return findings;
}
