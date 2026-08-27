/**
 * checks/copy.mjs — 文案/内容纪律检查（启发式，移植自 design-router checks/copy.ts）
 *
 * 覆盖 hallmark gate 19 / 30 / 46 / 47。全部是模式匹配，判定为"疑似"，
 * 由模型人工确认（编造指标这类需要语义判断，工具只给证据）。
 */
import { loc, grepLines } from "./types.mjs";

const PLACEHOLDER_NAMES = /\b(Jane Doe|John Smith|Acme|Nexus|Seamless|Unleash|Lorem ipsum|Example Inc|Company Name)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
const EMOJI_TELLS = /[\u2728\u{1F680}\u26A1\u{1F525}\u{1F3AF}\u2705\u{2728}]/u; // ✨🚀⚡🔥🎯✅
// 编造指标启发式："+47% conversion" / "10× faster" / "trusted by 50,000+ teams" / "99.9% uptime"
const INVENTED_METRIC =
  /\+\s*\d{1,3}\s*%|\d+\s*[×xX]\s*(faster|quicker|speed|更快|提升|倍)|trusted\s*by\s*[\d,]+|[\d,.]+\+?\s*(users|teams|customers|downloads|developers)|99\.\d\s*%\s*uptime/i;

export function runCopyChecks(files) {
  const findings = [];

  for (const f of files) {
    const c = f.content;

    // ---- gate 19: 占位名/创业梗 ----
    for (const ln of grepLines(c, PLACEHOLDER_NAMES)) {
      const line = c.split("\n")[ln - 1];
      const m = line.match(PLACEHOLDER_NAMES);
      findings.push({
        gate: "19",
        rule: "placeholder-cliche",
        severity: "warn",
        message: `占位名/创业梗："${m?.[1]}"。替换为真实内容或删除。`,
        location: loc(f.path, ln),
      });
    }

    // ---- gate 30: emoji 图标 ----
    const emojiHits = grepLines(c, EMOJI_TELLS);
    if (emojiHits.length > 0) {
      findings.push({
        gate: "30",
        rule: "emoji-icon",
        severity: "error",
        message: `发现 emoji 图标（✨🚀⚡🔥🎯✅）${emojiHits.length} 处。用 Lucide/Heroicons 或自定义 SVG，或纯文字。`,
        location: loc(f.path, emojiHits[0]),
      });
    } else if (EMOJI.test(c)) {
      const first = grepLines(c, EMOJI);
      findings.push({
        gate: "30",
        rule: "emoji-present",
        severity: "info",
        message: "发现 emoji 字符（需确认是否用作图标/装饰，若是不允许）。",
        location: loc(f.path, first[0]),
      });
    }

    // ---- gate 46: 编造指标（启发式，需人工确认）----
    for (const ln of grepLines(c, INVENTED_METRIC)) {
      const line = c.split("\n")[ln - 1];
      const m = line.match(INVENTED_METRIC);
      findings.push({
        gate: "46",
        rule: "invented-metric",
        severity: "error",
        message: `疑似编造指标："${m?.[0]?.trim()}"。用户未提供的数字必须用 — + 灰色占位块，或问用户确认。`,
        location: loc(f.path, ln),
      });
    }

    // ---- gate 47: 重绘浏览器/手机 chrome（启发式模式）----
    const chromePatterns = [
      [/traffic[- ]?light|window[- ]?control|browser[- ]?bar|mac[- ]?window/i, "假浏览器栏/红绿灯点"],
      [/(phone|mobile)[-\s]*(frame|mockup)|notch|speaker[- ]?slit/i, "假手机框/刘海"],
      [/(code|terminal|ide)[-\s]*(frame|window|chrome)|file[- ]?tabs?|activity[- ]?bar/i, "假代码窗口/IDE chrome"],
    ];
    for (const [re, desc] of chromePatterns) {
      const hits = grepLines(c, re);
      if (hits.length) {
        findings.push({
          gate: "47",
          rule: "redrawn-chrome",
          severity: "warn",
          message: `${desc}（${hits.length} 处）。不要手绘浏览器/手机/代码窗口 chrome——用真实截图包 <figure> 或不画 chrome。`,
          location: loc(f.path, hits[0]),
        });
      }
    }
  }

  return findings;
}
