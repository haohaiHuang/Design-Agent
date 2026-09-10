/**
 * checks/kill-slop.mjs — kill-ai-slop 转译子集（KS-*）
 *
 * 来源: https://github.com/yetone/kill-ai-slop（skill/references/detection.md，Apache-2.0，零依赖转译）
 * 只转译 hallmark 58 gates / 现有 checks 未覆盖、且文本可低误报判定的 tells：
 *   KS-03  cozy 暖洗色（amber/orange wash + beige 底）——品牌真暖色可豁免
 *   KS-04  默认语义彩虹（框架 stock 蓝/绿/红/琥珀 tint 同屏 ≥3 hue）
 *   KS-05  单色状态框（同行同 hue 占满 bg+border+text 三角）——bg-50 tint + 同 hue 文字无 border 的合法单一语义 chip 不报
 *   KS-08  衬线乱入 UI/正文（Playfair/Lora/Cormorant 等）——编辑出版语境可豁免
 *   KS-14  AI 文案腔（英文模式按原仓库 + 中文 AI 词组补充）
 * 未转译的 tells：与现有 gates 重复（01/02→gate 2、07→38a、15→30、17→5、26→11-13、29→46、
 * 30→54、31→4、33 字体栈→typography gate 1）；或需渲染级视觉判定（06 渐变氛围/16 发光点/19-22 圆角阴影
 * 嵌套/24 AI 画 icon/27 spinner 摆轴）；或高误报不值机器化（09/13 视觉装饰、12 层级、18/25 icon tile、
 * 23 badge 轰炸、28/35 语境型、32 单间距）。
 * 全部命中为"疑似"（severity warn）：由模型按流程人工 Triage，品牌/语境合法则豁免。
 * 面向 Tailwind/utility-class 与 CSS 声明；raw CSS 的单色框（border+background+color 手写 hex）不在机器范围。
 */
import { loc } from "./types.mjs";

// ---------- KS-03 模式 ----------
// beige wash 签名底（kill 原样）
const BEIGE_WASH = /bg-\[#(fdf6ec|fef3e2|faf3e8|fff7ed|fdf4e3)\]/i;
// 暖色 tint 角色收集（stone 太常作中性面，剔除降误报——偏离原仓库处）
const warmRolesOf = (line) =>
  new Set([...line.matchAll(/(?:^|[\s"'])(bg|border|text)-(amber|orange)-\d+/gi)].map((m) => m[1]));
// 默认灰文字落在暖 tint 面（kill 的 sibling tell）
const GRAY_ON_WARM_TINT =
  /(?:text|bg|border)-(gray|slate|zinc|neutral)-(400|500)\b[^"'\n]{0,80}(?:bg|border)-(amber|orange)\b/i;

// ---------- KS-04 模式（stock 语义 hue：info/tip/success/error）----------
// tint 底：bg/border-<hue>-50|100；文字/描边强色：text-<hue>-600|700
const stockHuesOf = (line) => {
  const hues = new Set();
  for (const m of line.matchAll(/(?:bg|border)-(blue|indigo|amber|green|emerald|red)-(?:50|100)\b|text-(blue|indigo|amber|green|emerald|red)-(?:600|700)\b/gi)) {
    const hue = m[0].match(/(blue|indigo|amber|green|emerald|red)/)?.[1];
    if (hue) hues.add(hue);
  }
  return hues;
};

// ---------- KS-05 模式 ----------
// 同行内同 hue 的角色集合。触发：同 hue 占满 bg/border/text 三角——默认"红/黄/绿/蓝一体"状态框。
// 单 hue chip（bg-*-50 或 bg-*-500/10 + 同 hue 文字，无 border）是合法单一语义色，不报。
const statusRolesOf = (line) => {
  const map = new Map();
  for (const m of line.matchAll(/(?:^|[\s"'])(bg|border|text)-(red|amber|yellow|green|emerald|blue)-\d+(?:\/\d+)?/gi)) {
    const hue = m[2];
    if (!map.has(hue)) map.set(hue, new Set());
    map.get(hue).add(m[1]);
  }
  return map;
};

// ---------- KS-08 模式 ----------
// 显示衬线默认脸（kill 名单 + 当前 AI 编辑衬线常用脸），只匹配 font-family 声明值
const SLOP_SERIF =
  /["']?(playfair(?:\s+display)?|cormorant(?:\s+garamond)?|\blora\b|dm\s+serif(?: text)?|libre\s+baskerville|fraunces|instrument\s+serif)["']?/i;
// 排除令牌定义行（--font-*: ...）与令牌引用（var(...)）——那是有意设计系统，不报警
const TOKEN_DEF_LINE = /^\s*--[\w-]+\s*:/;
const serifValueOf = (line) => {
  if (TOKEN_DEF_LINE.test(line)) return null;
  const m = line.match(/font-(?:family|Family)\s*:\s*([^;}]+)/i);
  if (!m || /var\(|inherit|system-ui/i.test(m[1])) return null;
  return SLOP_SERIF.test(m[1]) ? m[1].trim().slice(0, 70) : null;
};

// ---------- KS-14 模式 ----------
const AI_VOICE_EN = [
  /not just .{1,50}\bit'?s\b/i, // "It's not just X — it's Y"
  /\bsay goodbye to\b/i,
  /\bunlock the power\b/i,
  /\bsupercharge\w*\b/i,
  /\bgame[- ]changer\b/i,
  /\bnext[- ]level\b/i,
  /\bblazing[- ]fast\b/i,
  /\bseamless(?:ly)?\b/i,
  /\beffortless(?:ly)?\b/i,
];
// 中文 AI 文案腔（自有补充，高精度词组；单字"极致/赋能/闭环"仅在复合词组里报）
const AI_VOICE_CN = /一站式|重新定义|颠覆式|无缝(?:衔接|体验)?|极致体验|丝滑(?:体验|流畅)?|降本增效|提质增效|体验闭环|业务闭环/;

const FIRST_EN_PHRASE = (line) => {
  for (const re of AI_VOICE_EN) {
    const m = line.match(re);
    if (m) return m[0].trim().slice(0, 60);
  }
  return null;
};

function scanLines(content, test) {
  const lines = content.split("\n");
  const state = { count: 0, firstLine: 0, sample: "" };
  lines.forEach((line, i) => {
    if (test(line)) {
      state.count++;
      if (!state.firstLine) {
        state.firstLine = i + 1;
        state.sample = line.trim().slice(0, 70);
      }
    }
  });
  return state;
}

export function runKillSlopChecks(files) {
  const findings = [];

  for (const f of files) {
    const c = f.content;

    // ---- KS-03: cozy 暖洗色（聚合）----
    const warm = scanLines(c, (line) => {
      if (BEIGE_WASH.test(line) || GRAY_ON_WARM_TINT.test(line)) return true;
      return warmRolesOf(line).size >= 2; // 同行使 amber/orange 占 ≥2 角色（bg+border+text）
    });
    if (warm.count) {
      findings.push({
        gate: "KS-03",
        rule: "cozy-warm-wash",
        severity: "warn",
        message: `cozy 暖洗色 ${warm.count} 处（amber/orange tint / beige wash / 灰字落暖面）：「${warm.sample}」。确认品牌是否真暖色——否则中性底 + 至多 1 个暖强调色，暖意来自文字。`,
        location: loc(f.path, warm.firstLine),
      });
    }

    // ---- KS-04: 默认语义彩虹（≥3 种 stock hue 才报）----
    const hues = new Set();
    for (const line of c.split("\n")) for (const h of stockHuesOf(line)) hues.add(h);
    if (hues.size >= 3) {
      findings.push({
        gate: "KS-04",
        rule: "semantic-rainbow",
        severity: "warn",
        message: `框架默认语义色 ${hues.size} 种同屏（${[...hues].join("/")} 的 50-tint 底或 600/700 文字）——默认彩虹。收敛：中性 + 至多 1-2 个品牌派生的语义色，多数提示不需要颜色。`,
        location: loc(f.path),
      });
    }

    // ---- KS-05: 单色状态框（同 hue 占满 bg/border/text 三角才报）----
    const status = scanLines(c, (line) => {
      for (const rs of statusRolesOf(line).values()) if (rs.size >= 3) return true;
      return false;
    });
    if (status.count) {
      findings.push({
        gate: "KS-05",
        rule: "one-hue-status-box",
        severity: "warn",
        message: `单色状态框 ${status.count} 处（同 hue 同时当 bg/border/text）：「${status.sample}」。状态先用文字 + 字重表达（加粗 "Error" 比颜色先被读到）；要上色只给 1 个 muted accent 放中性面。`,
        location: loc(f.path, status.firstLine),
      });
    }

    // ---- KS-08: 衬线乱入（聚合；令牌定义/引用豁免）----
    const serif = scanLines(c, (line) => serifValueOf(line) !== null);
    if (serif.count) {
      findings.push({
        gate: "KS-08",
        rule: "serif-in-ui",
        severity: "warn",
        message: `直接声明显示衬线 ${serif.count} 处（Playfair/Lora/Cormorant/DM Serif 等）：「${serif.sample}」。SaaS/工具页面是 slop 默认；编辑出版语境可保留，但正文用衬线要能说出理由。令牌（--font-*）定义/引用豁免。`,
        location: loc(f.path, serif.firstLine),
      });
    }

    // ---- KS-14: AI 文案腔（聚合，报首例词）----
    const voice = scanLines(c, (line) => {
      if (AI_VOICE_CN.test(line)) return true;
      return AI_VOICE_EN.some((re) => re.test(line));
    });
    if (voice.count) {
      const enPhrase = FIRST_EN_PHRASE(voice.sample);
      const cnPhrase = voice.sample.match(AI_VOICE_CN)?.[0] || "";
      findings.push({
        gate: "KS-14",
        rule: "ai-copy-voice",
        severity: "warn",
        message: `AI 文案腔 ${voice.count} 处（首例："${enPhrase || cnPhrase}"）——"not just X—it's Y"/supercharge/无缝/赋能 类空话。说具体的事，删套话；真引用/讨论这些词的文档可豁免。`,
        location: loc(f.path, voice.firstLine),
      });
    }
  }

  return findings;
}
