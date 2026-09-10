/**
 * checks/kill-slop.test.mjs — KS-* 转译子集回归测试（零依赖）
 *
 * 运行: node checks/kill-slop.test.mjs（node ≥ v23.6 原生 type-stripping）
 * 正例应全部命中、反例（令牌/合法单一语义色）应静默。任何 KS 规则改动后先跑这个。
 */
import { runKillSlopChecks } from "./kill-slop.mjs";
import { runTypographyChecks } from "./typography.mjs";

const pos = `/* ===== 应命中 KS 的样例 ===== */
<div class="bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-4">warm box</div>
<div class="bg-[#fdf6ec] text-stone-600">cozy wash</div>
<div class="text-neutral-500 bg-amber-100">gray on tint</div>

<div class="bg-blue-50 text-blue-700">Info</div>
<div class="bg-green-50 text-green-700">Success</div>
<div class="bg-red-50 text-red-700">Error</div>
<div class="bg-amber-50 text-amber-700">Warning</div>

<div class="border border-red-500 bg-red-500/10 text-red-600 rounded p-3">one-hue box</div>

h2 { font-family: "Playfair Display", serif; }
.hero { font-family: Lora, serif; }
body { font-family: "Space Grotesk", sans-serif; }

<p>It's not just a tool — it's a platform. Say goodbye to complexity. Supercharge your workflow.</p>
<p>一站式解决方案，重新定义效率，丝滑体验，降本增效。</p>
`;

const neg = `/* ===== 不应命中（令牌/合法语境） ===== */
:root { --font-display: "Fraunces", Georgia, serif; }   /* 令牌定义豁免 */
h1 { font-family: var(--font-display); }               /* 令牌引用豁免 */
p  { font-family: "Noto Serif SC", serif; }            /* 不在名单 */
h1 { font-family: Charter, serif; }                    /* Kami 衬线，不在名单 */

/* 单 hue chip 合法（bg-50 tint + text-700，无 border）不触发 KS-05 */
<div class="bg-emerald-50 text-emerald-700">one status color</div>
/* 半透明底 + 同 hue 文字无 border（bg-red-500/10 + text-red-700）也是合法 chip，不触发 KS-05 */
<div class="bg-red-500/10 text-red-700">translucent chip</div>
/* 正文字体 serif（Merriweather/PT Serif）不在 KS-08 名单，不触发 */
p { font-family: "Merriweather", serif; }
/* 不同 hue 的状态条不触发 KS-05 */
<div class="border-blue-500 bg-white text-red-600">border 与 text 不同 hue</div>
`;

const files = [
  { path: "pos.html", content: pos, kind: "html" },
  { path: "neg.css", content: neg, kind: "css" },
];

const ks = runKillSlopChecks(files);
const ty = runTypographyChecks(files);

const byGate = new Map();
for (const f of ks) byGate.set(f.gate, (byGate.get(f.gate) || 0) + 1);

let failed = false;
const check = (cond, name) => {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  if (!cond) failed = true;
};

check(byGate.get("KS-03") === 1, "KS-03 cozy 暖洗聚合 1 条");
check(byGate.get("KS-04") === 1, "KS-04 语义彩虹（≥3 hue）命中");
check(byGate.get("KS-05") === 1, "KS-05 单色框命中，合法单 hue chip 不误报");
check(byGate.get("KS-08") === 1, "KS-08 衬线命中，令牌定义/引用豁免");
check(byGate.get("KS-14") === 1, "KS-14 AI 文案腔中英聚合 1 条");
check(ks.find((f) => f.gate === "KS-08").location.startsWith("pos.html"), "KS-08 只命中 pos 文件");
check(!ks.some((f) => f.location.startsWith("neg.css")), "neg.css 无 KS 命中");
check(ty.some((f) => f.rule === "default-font" && f.location.startsWith("pos.html")), "typography gate1 命中 Space Grotesk");

process.exit(failed ? 1 : 0);
