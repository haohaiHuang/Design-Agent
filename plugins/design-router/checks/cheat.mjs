/**
 * checks/cheat.mjs — interfaces.dev Interface Cheat Sheet 机器化子集（移植自 design-router checks/cheat.ts）
 *
 * 来源: https://interfaces.dev/cheat-sheet（转译，跟随其维护）
 * 只收录低误报、文本可判定的条目；severity 分级控制（error 明确违规 / warn 建议 / info 提示）。
 */
import { loc, grepLines, pageText } from "./types.mjs";

// 文本元素选择器判定：关键词必须是**独立的标签/类名 token**，且允许后代/子代组合。
// 两处历史缺陷都在这条正则上：
//   ① 裸 `p` 会把任何含字母 p 的类名当文本元素（.spin/.pill/.input/.spec-table 全误报）→ 加边界与前视；
//   ② 只在选择器**末尾**匹配，导致 `.card p { ... }` 这类后代选择器永远漏判 → 改为扫描任一段。
const TEXT_TOKEN_RE = /(^|[\s>+~,.&])(h[1-6]|\bp\b|title|hero|display|heading|caption|label|button|\ba\b)(?![\w-])/i;
const TEXT_ELEMENT_RE = TEXT_TOKEN_RE; // 保留旧名，避免其它引用处失配
function isTextSelector(sel) {
  return TEXT_TOKEN_RE.test(sel);
}

export function runCheatChecks(files) {
  const findings = [];

  for (const f of files) {
    const c = f.content;

    // ---- 1. 只用 .woff2（禁 .ttf/.otf）----
    for (const ln of grepLines(c, /\.(ttf|otf)(\?|["')]|$)/i)) {
      findings.push({
        gate: "CS-1",
        rule: "non-woff2-font",
        severity: "warn",
        message: "引用 .ttf/.otf 字体。Web 只用 .woff2（体积小、压缩好）。",
        location: loc(f.path, ln),
      });
    }

    // ---- 2. <div> 当按钮（onclick 或 role=button）----
    for (const ln of grepLines(c, /<div[^>]*\b(onclick|role=["']button)/i)) {
      findings.push({
        gate: "CS-2",
        rule: "div-as-button",
        severity: "warn",
        message: "<div> 当按钮用。用原生 <button>（免费获得键盘/语义/焦点行为）。",
        location: loc(f.path, ln),
      });
    }

    // ---- 3. 缺 -webkit-font-smoothing: antialiased（根级一次性）----
    if (/h[1-6]|body|\./i.test(c) && !/-webkit-font-smoothing\s*:\s*antialiased/i.test(pageText(f))) {
      findings.push({
        gate: "CS-3",
        rule: "missing-antialiased",
        severity: "info",
        message: "未见 -webkit-font-smoothing: antialiased（应写在根元素一次，macOS 上文字更锐利）。",
        location: loc(f.path),
      });
    }

    // ---- 4. 文本元素固定宽高 ----
    const blocks = c.split(/}/);
    blocks.forEach((block, bi) => {
      const sel = (block.split("{")[0] || "").trim();
      if (!isTextSelector(sel)) return;
      if (/(^|[;{]\s*)(width|height)\s*:\s*\d+(px|rem|em|vw|%)/i.test(block)) {
        findings.push({
          gate: "CS-4",
          rule: "fixed-size-text",
          severity: "warn",
          message: `文本元素 ${sel.slice(0, 40)} 设了固定宽/高。文本容器用 min/max + 自然流，禁固定尺寸（长内容会溢出/截断）。`,
          location: loc(f.path, bi + 1),
        });
      }
    });

    // ---- 5. :hover 未包 @media (hover: hover) ----
    if (/:hover\s*[,{]/.test(c) && !/@media\s*\(hover:\s*hover\)/.test(c)) {
      findings.push({
        gate: "CS-5",
        rule: "hover-not-guarded",
        severity: "info",
        message: "存在 :hover 样式但无 @media (hover: hover) 包裹。触摸设备上 :hover 会粘滞（点击后保持选中态）。",
        location: loc(f.path),
      });
    }

    // ---- 6. 直引号（智能标点；限定 HTML 可见文本，排除标签属性）----
    if (f.kind === "html") {
      const bodyText = c
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ");
      const straight = bodyText.match(/["']/g);
      if (straight && straight.length >= 2) {
        findings.push({
          gate: "CS-6",
          rule: "straight-quotes",
          severity: "warn",
          message: `可见文本含 ${straight.length} 个直引号。用智能标点：弯引号 “”‘’、短横 –、长横 —、省略号 …（AI 生成文本的常见 tell）。`,
          location: loc(f.path),
        });
      }
    }

    // ---- 7. 标题缺 text-wrap: balance ----
    if (/h[1-6]|title|hero|display/i.test(c) && !/text-wrap\s*:\s*balance/i.test(pageText(f))) {
      findings.push({
        gate: "CS-7",
        rule: "missing-text-wrap-balance",
        severity: "info",
        message: "有标题类元素但未见 text-wrap: balance（标题换行更均衡，视觉更精致）。描述类用 text-wrap: pretty。",
        location: loc(f.path),
      });
    }

    // ---- 8. 逻辑属性提示（margin-left/right 大量使用）----
    const logical = (c.match(/(margin|padding)-(left|right)\s*:/gi) || []).length;
    if (logical >= 3) {
      const first = grepLines(c, /(margin|padding)-(left|right)\s*:/i)[0];
      findings.push({
        gate: "CS-8",
        rule: "physical-logical-props",
        severity: "info",
        message: `使用 ${logical} 处 margin/padding-left/right（物理属性）。RTL 场景用逻辑属性 margin-inline-start/end。`,
        location: loc(f.path, first),
      });
    }
  }

  return findings;
}
