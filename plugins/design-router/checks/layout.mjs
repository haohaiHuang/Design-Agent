/**
 * checks/layout.mjs — 布局/视觉纪律检查（移植自 design-router checks/layout.ts）
 *
 * 覆盖 hallmark gate 2 / 10 / 14 / 24 / 34 / 50 / 51 + design-references 环节4 圆角/渐变扫描。
 * 全部为文本可判定；渲染类（gate 6/35/36/44/45）不在本模块。
 */
import { loc, grepLines } from "./types.mjs";

const SPACING_OK = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96, 128, 160, 192];
const RADIUS_OK = new Set([0, 2, 4, 6, 8, 12, 16, 24, 32, 999, 9999]);

export function runLayoutChecks(files) {
  const findings = [];
  const isPage = files.some((f) => f.kind === "html" || /\.html?$/.test(f.path));

  for (const f of files) {
    const c = f.content;

    // ---- gate 2: 渐变（含 gradient-text）----
    for (const ln of grepLines(c, /(linear|radial|conic)-gradient|background-clip\s*:\s*text/i)) {
      const line = c.split("\n")[ln - 1];
      const isText = /background-clip\s*:\s*text/i.test(line) || /background-image[^;]*(linear|radial|conic)-gradient/i.test(line);
      findings.push({
        gate: "2",
        rule: "gradient",
        severity: isText ? "error" : "warn",
        message: isText
          ? "渐变文字（background-clip: text + gradient）。任何流派都禁止渐变文字。"
          : "检测到渐变。无流派允许渐变文字；背景渐变需有约束集背书。",
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
    for (const ln of grepLines(c, /(padding|gap|margin)\s*:\s*[^;]*\b\d{1,3}px\b/i)) {
      const line = c.split("\n")[ln - 1];
      const vals = line.match(/(\d{1,3})px/g);
      if (!vals) continue;
      const bad = vals.filter((v) => {
        const n = parseInt(v);
        return n !== 0 && !SPACING_OK.includes(n);
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

    // ---- gate 34: 缺 overflow-x: clip（页面级，html/body）----
    if (isPage && !/overflow-x\s*:\s*clip/i.test(c)) {
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

    // ---- gate 51: display 标题缺 overflow-wrap ----
    const hasDisplayHead = /(h1|hero|display|title)[\w-]*\s*[,{]/i.test(c);
    if (hasDisplayHead && !/overflow-wrap\s*:\s*anywhere/.test(c)) {
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
        const n = parseFloat(v);
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
  }

  return findings;
}
