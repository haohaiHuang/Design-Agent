/**
 * checks/typography.mjs — 字体纪律检查（移植自 design-router checks/typography.ts）
 *
 * 覆盖 hallmark gate 1 / 37 / 38a + design-references 环节4 字重扫描。
 * 全部为文本可判定；视觉/上下文类判定不在本模块。
 */
import { loc, grepLines } from "./types.mjs";

const DEFAULT_FONTS = /\b(Inter|Roboto|Open Sans|Poppins|Lato|Arial|Helvetica|Times New Roman)\b/i;

export function runTypographyChecks(files) {
  const findings = [];

  for (const f of files) {
    const c = f.content;

    // ---- gate 1: 默认 AI 字体 ----
    for (const ln of grepLines(c, /font-family\s*:/i)) {
      const line = c.split("\n")[ln - 1];
      const m = line.match(/font-family\s*:\s*([^;]+)/i);
      if (m && DEFAULT_FONTS.test(m[1])) {
        findings.push({
          gate: "1",
          rule: "default-font",
          severity: "warn",
          message: `默认字体被直接使用：${m[1].trim()}。换成设计令牌 var(--font-*) 或品牌字体。`,
          location: loc(f.path, ln),
        });
      }
    }

    // ---- gate 37: 字体家族数 > 3 ----
    const families = new Set();
    for (const ln of grepLines(c, /font-family\s*:/i)) {
      const line = c.split("\n")[ln - 1];
      const m = line.match(/font-family\s*:\s*([^;]+)/i);
      if (!m) continue;
      // 忽略 var() 引用（令牌）
      if (m[1].includes("var(")) continue;
      const names = m[1]
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter((s) => s && !s.startsWith("var("));
      for (const n of names) families.add(n);
    }
    if (families.size > 3) {
      findings.push({
        gate: "37",
        rule: "font-family-count",
        severity: "error",
        message: `${families.size} 个字体家族（2+1 规则上限 3）：${[...families].join(" / ")}。拆掉一个回 body 或 display。`,
        location: loc(f.path),
      });
    }

    // ---- gate 38a: 标题斜体 ----
    // 标题选择器 + font-style: italic 同规则块；或 <em>/<i> 出现在标题标签内
    const headingSelectorRe = /(^|,|\.|:)\s*[\w.-]*?(h[1-6]|title|hero|display|heading|wordmark|stat|masthead)[\w.-]*$/i;
    const blocks = c.split(/}/);
    blocks.forEach((block, bi) => {
      const sel = (block.split("{")[0] || "").trim();
      if (headingSelectorRe.test(sel) && /font-style\s*:\s*italic/i.test(block)) {
        findings.push({
          gate: "38a",
          rule: "italic-heading",
          severity: "error",
          message: `标题选择器 ${sel.trim().slice(0, 60)} 使用 font-style: italic。标题必须 roman（font-style: normal），强调用字重/强调色/下划线。`,
          location: loc(f.path, bi + 1),
        });
      }
    });
    const emInHeading = c.match(/<(h[1-6])[^>]*>[\s\S]{0,200}?<(em|i)\b/i);
    if (emInHeading) {
      findings.push({
        gate: "38a",
        rule: "italic-in-heading",
        severity: "error",
        message: `标题 <${emInHeading[1]}> 内使用了 <${emInHeading[2]}> 斜体强调词。正文斜体只允许在段落文本中。`,
        location: loc(f.path),
      });
    }

    // ---- DR 环节4: 字重扫描（700/600/450 需约束允许，默认告警） ----
    for (const ln of grepLines(c, /font-weight\s*:\s*(700|600|450)\b/)) {
      findings.push({
        gate: "DR-4",
        rule: "font-weight-heavy",
        severity: "info",
        message: `字重 700/600/450 出现（Kami 约束常禁加粗，除非约束集明确允许）。`,
        location: loc(f.path, ln),
      });
    }
  }

  return findings;
}
