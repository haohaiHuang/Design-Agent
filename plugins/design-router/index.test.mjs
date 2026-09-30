/**
 * design-router 工具测试（node --test）
 *
 * 覆盖：插件注册、fixture 审计、默认字体 gate 触发、需求路由、候选差异度、
 * 质量日志边界（写入仅限 ~/.dsh 本地日志）。
 *
 * 运行：node --test plugins/design-router/index.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const plugin = await import(join(here, "index.mjs"));

/** 注册插件并返回按名索引的工具表 */
function tools() {
  const reg = [];
  plugin.apply({ tools: { register: (d) => reg.push(d) } });
  return Object.fromEntries(reg.map((t) => [t.name, t]));
}

test("注册 6 个工具，5 只读 + 1 写入", () => {
  const byName = tools();
  const names = Object.keys(byName).sort();
  assert.deepEqual(names, [
    "design_audit",
    "design_contrast",
    "design_diversity",
    "design_lookup",
    "design_quality",
    "design_route",
  ]);
  // 除 design_quality 外无 writeFileSync 语义（description 声明边界）
  assert.match(byName.design_quality.description, /写入边界|~\/\.dsh\/design-router-quality\.json/);
});

test("fixture 03-maple-bakery 可被 design_audit 审计且输出格式正确", async (t) => {
  const { design_audit } = tools();
  // 该 fixture 在仓库里（plugins/../../skills/hallmark/…）；装到预设目录后仓库根不存在
  // （skills 在 ~/.agents/skills），此时跳过而不是误报失败。
  const candidates = [
    join(here, "..", "..", "skills", "hallmark", "site", "_tests", "03-maple-bakery"),
    join(here, "..", "..", "..", "..", "agents", "skills", "hallmark", "site", "_tests", "03-maple-bakery"),
  ];
  const target = candidates.find((c) => existsSync(c));
  if (!target) {
    t.skip("仓库外的安装副本里没有 hallmark fixture，跳过");
    return;
  }
  const out = await design_audit.execute({ target });
  assert.match(out, /检出 \d+ 项（error \d+ \/ warn \d+ \/ info \d+）/);
  assert.match(out, /\[gate \d+\]/);
});

test("默认字体（Arial）触发 gate 1", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-test-"));
  try {
    writeFileSync(join(dir, "bad.html"), '<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif}</style></head><body><h1>Hi</h1></body></html>');
    const out = await design_audit.execute({ target: join(dir, "bad.html") });
    assert.match(out, /\[gate 1\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("动效 EM-2/3/5 机器 gates 触发", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-em-"));
  try {
    writeFileSync(
      join(dir, "bad.css"),
      "@keyframes enter { from { transform: scale(0); } to { transform: scale(1); } }\n" +
        ".btn { animation-timing-function: ease-in; }\n" +
        ".panel { transition-duration: 500ms; }\n",
    );
    const out = await design_audit.execute({ target: dir });
    assert.match(out, /\[gate EM-2\]/);
    assert.match(out, /\[gate EM-3\]/);
    assert.match(out, /\[gate EM-5\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 回归：真机测试暴露的四类误报（见仓库 docs/test-results.md）----

test("回归 F4：注释内容不参与判定（注释里写规范说明不该被判违规）", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-f4-"));
  try {
    writeFileSync(
      join(dir, "page.html"),
      `<!DOCTYPE html><html><head><style>
:root { --ink:#0f1011; }
/* 约束10 · 不编造「Trusted by 50,000+」，禁止 transition: all，删掉「一站式」AI 腔 */
body { color: var(--ink); overflow-x: clip; }
h1 { overflow-wrap: anywhere; text-wrap: balance; }
*:focus-visible { outline: 2px solid var(--ink); }
</style></head><body><h1>标题</h1><button>按钮</button></body></html>`,
    );
    const out = await design_audit.execute({ target: join(dir, "page.html") });
    assert.doesNotMatch(out, /\[gate 46\]/, "注释里的 50,000 不该判编造指标");
    assert.doesNotMatch(out, /KS-14/, "注释里的「一站式」不该判 AI 文案腔");
    assert.doesNotMatch(out, /\[gate 10\]/, "注释里的 transition: all 不该判 transition-all");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 F1：var() 引用的圆角不判档位异常，裸值仍判", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-f1-"));
  try {
    writeFileSync(join(dir, "tokens.css"), ":root { --r-md: 12px; }\n.card { border-radius: var(--r-md); }\n");
    const ok = await design_audit.execute({ target: join(dir, "tokens.css") });
    assert.doesNotMatch(ok, /border-radius 档位异常/, "var(--r-md)=12px 在档位内，不该报警");
    writeFileSync(join(dir, "bad.css"), ".card { border-radius: 13px; }\n");
    const bad = await design_audit.execute({ target: join(dir, "bad.css") });
    assert.match(bad, /border-radius 档位异常/, "裸值 13px 仍应报警");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 F3：同一行的 border:1px 与 sr-only 惯用法不判间距违规，真超标仍判", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-f3-"));
  try {
    writeFileSync(
      join(dir, "a.css"),
      ".btn{height:40px;padding:0 16px;border-radius:8px;border:1px solid transparent}\n" +
        ".sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0)}\n",
    );
    const ok = await design_audit.execute({ target: join(dir, "a.css") });
    assert.doesNotMatch(ok, /\[gate 24\]/, "边框 1px 与 sr-only 不该判间距不在 4pt 刻度");
    writeFileSync(join(dir, "b.css"), ".card{padding:13px 7px}\n");
    const bad = await design_audit.execute({ target: join(dir, "b.css") });
    assert.match(bad, /\[gate 24\]/, "真实超标值 13px/7px 仍应报警");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 F2：外链样式表里的规则算数（页面级缺失类检查不误报）", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-f2-"));
  try {
    writeFileSync(join(dir, "styles.css"), "html,body{overflow-x:clip}\n*:focus-visible{outline:2px solid #000}\nh1{overflow-wrap:anywhere;text-wrap:balance}\nbody{-webkit-font-smoothing:antialiased}\n");
    writeFileSync(
      join(dir, "page.html"),
      '<!DOCTYPE html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>标题</h1><button>按钮</button></body></html>',
    );
    const out = await design_audit.execute({ target: join(dir, "page.html") });
    for (const g of ["26", "34", "51", "CS-3", "CS-7"]) {
      assert.doesNotMatch(out, new RegExp(`\\[gate ${g}\\]`), `外链样式表已提供 gate ${g} 所需的规则，不该报缺失`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 CS-4：含字母 p 的类名不是文本元素（.spin/.pill/.input 不误报）", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-cs4-"));
  try {
    writeFileSync(join(dir, "a.css"), ".spin{width:14px;height:14px}\n.pill{width:64px;height:24px}\n.input{height:40px}\n");
    const ok = await design_audit.execute({ target: join(dir, "a.css") });
    assert.doesNotMatch(ok, /\[gate CS-4\]/, ".spin/.pill/.input 是装饰或控件，不该判文本元素固定尺寸");
    // 后代/子代组合要能命中（原先只在选择器末尾匹配，`.card p` 永远漏判）
    writeFileSync(join(dir, "b.css"), ".card p{width:100px}\n.hero > h1{height:20px}\n");
    const desc = await design_audit.execute({ target: join(dir, "b.css") });
    assert.match(desc, /\[gate CS-4\]/, "后代/子代选择器里的文本元素应被命中");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 F5/DR-5：注释定界符自毁与未定义变量被抓出", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-dr5-"));
  try {
    // 注释里再写 /* → 第一个 */ 提前闭合，吞掉后面的 :root
    writeFileSync(
      join(dir, "boom.html"),
      '<!DOCTYPE html><html><head><style>\n/* 说明：禁止 /* 嵌套写法\n:root{--ink:#0f1011}\nbody{color:var(--ink)}\n</style></head><body><h1>标题</h1></body></html>',
    );
    const out1 = await design_audit.execute({ target: join(dir, "boom.html") });
    assert.match(out1, /\[gate DR-5\]/, "未闭合注释应报 DR-5");

    rmSync(join(dir, "boom.html"));
    writeFileSync(join(dir, "undef.css"), ".card{color:var(--nope);background:var(--ok)}\n:root{--ok:#fff}\n");
    const out2 = await design_audit.execute({ target: join(dir, "undef.css") });
    assert.match(out2, /--nope/, "未定义且无 fallback 的变量应报 DR-5");
    assert.doesNotMatch(out2, /--ok\b.*未定义/, "已定义变量不该报");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 F6：slop-ignore 标记可豁免该行/该块（且必须带理由）", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-f6-"));
  try {
    writeFileSync(
      join(dir, "evidence.html"),
      `<!DOCTYPE html><html><head><style>
:root{--ink:#0f1011}
/* 引用证据：以下是原项目缺陷的复现，slop-ignore: 现状复现，作正误对照用 */
.legacy{font-family:'Inter';border-radius:13px;font-style:italic}
body{color:var(--ink);overflow-x:clip}
h1{overflow-wrap:anywhere;text-wrap:balance}
*:focus-visible{outline:2px solid #000}
</style></head><body><h1>标题</h1></body></html>`,
    );
    const out = await design_audit.execute({ target: join(dir, "evidence.html") });
    assert.doesNotMatch(out, /border-radius 档位异常/, "带 slop-ignore 的块内圆角不该报");
    assert.match(out, /被 `slop-ignore` 标记豁免/, "应报告豁免了几项");

    // 空理由不算豁免
    writeFileSync(join(dir, "no-reason.css"), ".card{border-radius:13px /* slop-ignore: */}\n");
    const out2 = await design_audit.execute({ target: join(dir, "no-reason.css") });
    assert.match(out2, /border-radius 档位异常/, "空理由不应豁免");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 F7/DR-6：控件边界与填充同时失效时报 info（且可 slop-ignore 豁免）", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-dr6-"));
  try {
    writeFileSync(
      join(dir, "bad.html"),
      `<!DOCTYPE html><html><head><style>
:root{ --paper:#f5f4ed; --border:#e8e6dc }
body{ background:var(--paper); color:#0f1011 }
input{ background:var(--paper); border:1px solid var(--border); padding:8px 12px }
</style></head><body><h1>t</h1><input></body></html>`,
    );
    const out = await design_audit.execute({ target: join(dir, "bad.html") });
    assert.match(out, /\[gate DR-6\]/, "边界与填充同时 1.1:1 的控件应报 DR-6");
    assert.match(out, /WCAG 1\.4\.11/, "应说明依据");

    // 负例：边界升档到 5:1 → 不报
    writeFileSync(
      join(dir, "good.html"),
      `<!DOCTYPE html><html><head><style>
:root{ --paper:#f5f4ed; --bs:#6b6a64 }
body{ background:var(--paper) }
input{ background:var(--paper); border:1px solid var(--bs) }
</style></head><body><input></body></html>`,
    );
    const out2 = await design_audit.execute({ target: join(dir, "good.html") });
    assert.doesNotMatch(out2, /\[gate DR-6\]/, "边界 5:1 时不该报");

    // 负例：该规则既没边界也没填充（外观继承自基类）→ 不报
    writeFileSync(join(dir, "inherit.css"), ".btn:active{transform:translateY(1px)}\n:root{--bg:#f5f4ed}\nbody{background:var(--bg)}\n");
    const out3 = await design_audit.execute({ target: join(dir, "inherit.css") });
    assert.doesNotMatch(out3, /\[gate DR-6\]/, "未声明边界/填充的规则不该报");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---- Phase 6 D4 + 池作用域：任务相关池不得泄漏进 design_lookup，且池内每项都要有人消费 ----

test("回归 D4：V（校验标准）类资源不得零挂载", async () => {
  const reg = JSON.parse(readFileSync(join(here, "data", "registry.json"), "utf8"));
  const mounted = new Set([
    ...Object.values(reg.routes).flatMap((st) => Object.values(st).flat()),
    ...Object.values(reg.logoExtra || {}).flat(),
    ...Object.values(reg.hallmarkExtra || {}).flat(),
    ...Object.values(reg.cheatExtra || {}).flat(),
  ]);
  const zero = reg.resources.filter((r) => r.role === "V" && !mounted.has(r.slug)).map((r) => r.slug);
  assert.deepEqual(zero, [], `V 类资源不得零挂载（校验方法不能登记后无人调用）：${zero.join(", ")}`);
});

test("回归 Phase6-池作用域：logoExtra 只在 design_route 消费，36 格 design_lookup 零泄漏", async () => {
  const { design_route, design_lookup } = tools();
  const reg = JSON.parse(readFileSync(join(here, "data", "registry.json"), "utf8"));
  const nameOf = (slug) => reg.resources.find((r) => r.slug === slug)?.name ?? `（缺 slug：${slug}）`;
  const poolNames = Object.values(reg.logoExtra).flat().map(nameOf);

  // ① 键语义：1 调研源 / 2 转译原则 / 4 验收底线
  assert.deepEqual(Object.keys(reg.logoExtra), ["1", "2", "4"], "logoExtra 键应为 1/2/4");
  assert.deepEqual(reg.logoExtra["1"], ["logggos", "logo-archive", "logoinspo", "logosystem", "logobook"], "键 1 应为 5 个 R 调研源");

  // ② 正面：logo 任务从 design_route 拿得到**池内每一项**（取子集会让成员失可达）
  const logo = await design_route.execute({ query: "logo 设计" });
  assert.match(logo, /专项资源（logo 任务必查）/, "design_route(logo) 应含专项资源段");
  const missing = poolNames.filter((n) => !logo.includes(n));
  assert.deepEqual(missing, [], `专项段应列出池内全部 ${poolNames.length} 项，缺：${missing.join(", ")}`);

  // ③ 反面：任务相关池绝不进 design_lookup（9 分支 × 4 环节 = 36 格）
  const leaks = [];
  for (const b of ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"]) {
    for (const st of [1, 2, 3, 4]) {
      const out = await design_lookup.execute({ branch: b, stage: st });
      for (const n of poolNames) if (out.includes(n)) leaks.push(`${b}·${st}←${n}`);
    }
  }
  assert.deepEqual(leaks, [], `design_lookup 36 格不得含任务相关池：${leaks.join(" | ")}`);

  // ④ 别过度修正：通用质量清单仍按环节合并；D2 环节 4 校验清单成对
  const lk2 = await design_lookup.execute({ branch: "A2", stage: 2 });
  assert.ok(lk2.includes(nameOf("hallmark-anti-patterns")), "环节 2 仍应合并 hallmarkExtra");
  assert.ok(lk2.includes(nameOf("interfaces-cheat-sheet")), "环节 2 仍应合并 cheatExtra");
  const lk4 = await design_lookup.execute({ branch: "A2", stage: 4 });
  assert.ok(lk4.includes(nameOf("kill-ai-slop")) && lk4.includes(nameOf("hallmark-slop-test")), "环节 4 校验清单应成对");

  // ⑤ 有意排除要有守门：logo-background-styles 只在 B1·2（海报），不进 logo 池
  assert.ok(!logo.includes(nameOf("logo-background-styles")), "logo-background-styles 应有意排除出 logo 池");
  assert.ok((reg.routes.B1?.["2"] || []).includes("logo-background-styles"), "logo-background-styles 应仍在 B1·2");
});

test("design_route：SaaS 需求命中路由表并返回主桶", async () => {
  const { design_route } = tools();
  const out = await design_route.execute({ query: "SaaS 落地页" });
  assert.match(out, /匹配模式: saas/);
  assert.match(out, /主桶（必查/);
  assert.match(out, /minimal/);
});

test("design_route：logo 需求命中专项资源", async () => {
  const { design_route } = tools();
  const out = await design_route.execute({ query: "帮我设计一个 logo" });
  assert.match(out, /专项资源（logo 任务必查）/);
  assert.match(out, /Logggos|Logobook|logoinspo/);
});

test("design_diversity：同质候选 FAIL", async () => {
  const { design_diversity } = tools();
  const out = await design_diversity.execute({
    c1: "色#4F46E5系/Inter/间距4pt/极简 | 桶minimal/refero",
    c2: "色#4338CA系/Inter/间距4pt/极简 | 桶minimal/aceternity",
    c3: "色#6366F1系/Inter/间距4pt/极简 | 桶minimal/minimal-gallery",
  });
  assert.match(out, /❌ FAIL/);
});

test("design_diversity：异构候选 PASS", async () => {
  const { design_diversity } = tools();
  const out = await design_diversity.execute({
    c1: "色#4F46E5系/Inter/极简留白 | 桶minimal/refero",
    c2: "色#1B365D墨蓝/衬线宋体/暖纸底 | 桶warmpaper/kami-skeleton",
    c3: "色#FF5C00橙/黑体展示/暗底霓虹 | 桶darktech/hallmark-cobalt",
  });
  assert.match(out, /✅ PASS/);
});

test("design_quality：report 只写本地日志（路径可注入 temp dir，不碰真实 ~/.dsh）", async () => {
  const { design_quality } = tools();
  // 隔离：日志路径指向 temp dir，测试后清理，绝不动真实 ~/.dsh/design-router-quality.json
  const tmp = mkdtempSync(join(tmpdir(), "dr-quality-"));
  const logPath = join(tmp, "quality.json");
  process.env.DSH_DESIGN_ROUTER_QUALITY_LOG = logPath;
  try {
    assert.equal(existsSync(logPath), false, "temp 日志初始不存在");
    const out = await design_quality.execute({ action: "report", slug: "refero-design", quality: "良", reason: "测试" });
    assert.match(out, /✅ 已记录/);
    assert.equal(existsSync(logPath), true, "report 应写入注入的 temp 路径");
    const written = JSON.parse(readFileSync(logPath, "utf8"));
    assert.equal(written.entries["refero-design"].quality, "良");
    // query 读同一注入路径
    const q = await design_quality.execute({ action: "query", slug: "refero-design" });
    assert.match(q, /良/);
  } finally {
    delete process.env.DSH_DESIGN_ROUTER_QUALITY_LOG;
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ---- 2026-09-30 真实产物复盘回归：gate 2 误报 / gate 24 噪音 ----

test("回归 gate 2：纹理渐变只 warn，只有 background-clip:text 才是渐变文字（error）", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-grad-"));
  const page = (css) =>
    `<!DOCTYPE html><html><head><style>html{overflow-x:clip}\nbody{font-family:Inter Tight,sans-serif}\n${css}\n</style></head><body><p>x</p></body></html>`;
  try {
    // ① 斜纹纹理（信源条/付费标记那类）：gate 2 应报 warn，不得报"渐变文字"
    writeFileSync(join(dir, "texture.html"), page(".bar{background-image:repeating-linear-gradient(135deg, #000 0 5px, transparent 5px 10px);}"));
    const tex = await design_audit.execute({ target: join(dir, "texture.html") });
    const texLine = tex.split("\n").find((l) => /\[gate 2\]/.test(l)) ?? "";
    assert.notEqual(texLine, "", "纹理渐变仍应被 gate 2 提示");
    assert.doesNotMatch(texLine, /🔴|background-clip: text \+ gradient/, `纹理渐变不应判为渐变文字（error）：${texLine}`);
    assert.match(texLine, /🟡/, `纹理渐变应为 warn：${texLine}`);

    // ② 真渐变文字惯用法：background-clip:text + 渐变 → 仍必须 error
    writeFileSync(join(dir, "textgrad.html"), page(".hero{-webkit-background-clip:text;background-clip:text;background-image:linear-gradient(90deg,#111,#999);color:transparent;}"));
    const tg = await design_audit.execute({ target: join(dir, "textgrad.html") });
    const tgLine = tg.split("\n").find((l) => /\[gate 2\]/.test(l)) ?? "";
    assert.match(tgLine, /渐变文字/, `clip:text 惯用法必须报渐变文字：${tgLine}`);
    assert.match(tgLine, /🔴/, `clip:text 惯用法应为 error：${tgLine}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 gate 24：<8px 元件内微调豁免，布局级非 4 倍数仍报", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-space-"));
  const page = (css) =>
    `<!DOCTYPE html><html><head><style>html{overflow-x:clip}\nbody{font-family:Inter Tight,sans-serif}\n${css}\n</style></head><body><p>x</p></body></html>`;
  try {
    writeFileSync(join(dir, "micro.html"), page(".badge{padding:2px 6px;gap:3px;margin-top:5px}"));
    const micro = await design_audit.execute({ target: join(dir, "micro.html") });
    assert.doesNotMatch(micro, /\[gate 24\]/, `≤7px 微调不应报 gate 24：\n${micro}`);

    writeFileSync(join(dir, "offscale.html"), page(".section{padding:20px 18px;gap:14px}"));
    const off = await design_audit.execute({ target: join(dir, "offscale.html") });
    const offLine = off.split("\n").find((l) => /\[gate 24\]/.test(l)) ?? "";
    assert.match(offLine, /18px|14px/, `布局级非 4 倍数仍应报 gate 24：${offLine}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("环节 4 输出含人工核对硬规则（图表读数一致性）", async () => {
  const { design_lookup } = tools();
  const out = await design_lookup.execute({ branch: "A2", stage: 4 });
  assert.match(out, /环节 4 校验硬规则/);
  assert.match(out, /图上读数逐项对齐/);
  assert.match(out, /百分比 × 360°/);
  // 其它环节不应带上这段
  const s1 = await design_lookup.execute({ branch: "A2", stage: 1 });
  assert.doesNotMatch(s1, /图上读数逐项对齐/);
});

// ---- 工具级冒烟（补"调用了未 import 的 *Checks"这一类只有真跑才炸的漏洞）----
// 上游 2026-09-30 在 index.ts 里发现 runNonTextContrastChecks 被调用但从未 import → design_audit
// 一调就 ReferenceError，而静态覆盖比对看不出来。这里对**每个**工具都真跑一次（不是只查注册表）。

test("冒烟：6 个工具逐个真调，均返回非空文本且不抛异常", async () => {
  const T = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-smoke-"));
  const logPath = join(dir, "quality.json");
  process.env.DSH_DESIGN_ROUTER_QUALITY_LOG = logPath;
  const html = join(dir, "ok.html");
  const css = join(dir, "ok.css");
  writeFileSync(html, '<!DOCTYPE html><html><head><style>html{overflow-x:clip}\nbody{font-family:Inter Tight,sans-serif}\n.a{padding:16px;gap:8px}\n</style></head><body><p>x</p></body></html>');
  writeFileSync(css, ".a{color:#111827;background:#ffffff}\n");
  try {
    const calls = {
      design_route: { query: "做一个 SaaS 落地页" },
      design_lookup: { branch: "A2", stage: 1 },
      design_diversity: {
        c1: "色#4F46E5/Inter/8pt | 桶minimal/refero",
        c2: "色#111111/衬线/杂志栏 | 桶editorial/zine",
        c3: "色#FF6B00/等宽/粗野栅格 | 桶brutalist/logggos",
      },
      design_audit: { target: html },
      design_contrast: { target: css },
      design_quality: { action: "query", slug: "all" },
    };
    for (const [name, args] of Object.entries(calls)) {
      assert.equal(typeof T[name].execute, "function", `${name}.execute 应为函数`);
      const out = await T[name].execute(args);
      assert.equal(typeof out, "string", `${name} 应返回文本`);
      assert.ok(out.trim().length > 0, `${name} 返回了空文本`);
    }
  } finally {
    delete process.env.DSH_DESIGN_ROUTER_QUALITY_LOG;
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---- 2026-09-30 补齐：DR-A 家族（移植自上游 a11y.ts）+ EM-17（will-change）----

test("回归 DR-A 家族：5 条检查正例命中、反例静默", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-dra-"));
  const page = (css, body) =>
    `<!DOCTYPE html><html><head><style>html{overflow-x:clip}\nbody{font-family:Inter Tight,sans-serif}\n:focus-visible{outline:2px solid #4F46E5}\n${css}\n</style></head><body>${body}</body></html>`;
  try {
    // 正例：图标按钮无 accessible name；div 绑 onclick 无 role/tabindex；有 nav 无 skip；正数 tabindex
    writeFileSync(
      join(dir, "bad.html"),
      page(
        ".btn{padding:8px}",
        // 逐元素分行：DR-A4 是行级判定，同一行里出现 tabindex/role 会整行跳过
        //（上游同实现；minified 单行 HTML 会漏报，已在交接清单里登记为已知限制）
        '<nav><a href="#x">x</a></nav>\n'
          + '<button class="btn"><svg viewBox="0 0 24 24"><path d="M0 0"/></svg></button>\n'
          + '<div onclick="go()">点我</div>\n<span tabindex="3">顺序外</span>',
      ),
    );
    const bad = await design_audit.execute({ target: join(dir, "bad.html") });
    for (const g of ["DR-A3", "DR-A4", "DR-A7", "DR-A8"]) {
      assert.match(bad, new RegExp(`\\[gate ${g}\\]`), `应命中 ${g}：\n${bad}`);
    }

    // 反例：命名按钮 + role/tabindex 齐的非原生元素 + nav 配 skip 链接 + tabindex="0"
    writeFileSync(
      join(dir, "ok.html"),
      page(
        ".btn{padding:8px}",
        '<a class="skip" href="#main">跳到主内容</a><nav><a href="#x">x</a></nav>'
          + '<button class="btn" aria-label="关闭"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0"/></svg></button>'
          + '<div role="button" tabindex="0" onclick="go()">点我</div><main id="main">正文</main>',
      ),
    );
    const ok = await design_audit.execute({ target: join(dir, "ok.html") });
    assert.doesNotMatch(ok, /\[gate DR-A/, `反例不该命中 DR-A 家族：\n${ok}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 EM-17：will-change 用在非合成属性才报", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-wc-"));
  const page = (css) =>
    `<!DOCTYPE html><html><head><style>html{overflow-x:clip}\nbody{font-family:Inter Tight,sans-serif}\n${css}\n</style></head><body><p>x</p></body></html>`;
  try {
    writeFileSync(join(dir, "bad.html"), page(".a{will-change:left,transform}"));
    const bad = await design_audit.execute({ target: join(dir, "bad.html") });
    assert.match(bad, /\[gate EM-17\]/, `will-change:left 应命中 EM-17：\n${bad}`);
    assert.match(bad, /left/);

    writeFileSync(join(dir, "ok.html"), page(".a{will-change:transform;opacity:.9}"));
    const ok = await design_audit.execute({ target: join(dir, "ok.html") });
    assert.doesNotMatch(ok, /\[gate EM-17\]/, `合成属性不该命中 EM-17：\n${ok}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 CS-2 与 DR-A4 分工：role=button → CS-2；无 role 的 onclick → DR-A4（不重叠）", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-cs2-"));
  const page = (body) =>
    `<!DOCTYPE html><html><head><style>html{overflow-x:clip}\nbody{font-family:Inter Tight,sans-serif}\n:focus-visible{outline:2px solid #4F46E5}\n</style></head><body>\n${body}\n</body></html>`;
  try {
    writeFileSync(join(dir, "role.html"), page('<div role="button" tabindex="0">x</div>'));
    const a = await design_audit.execute({ target: join(dir, "role.html") });
    assert.match(a, /\[gate CS-2\]/, `role=button 应命中 CS-2：\n${a}`);
    assert.doesNotMatch(a, /\[gate DR-A4\]/, `有 role 时不该再报 DR-A4：\n${a}`);

    writeFileSync(join(dir, "bare.html"), page('<div onclick="go()">x</div>'));
    const b = await design_audit.execute({ target: join(dir, "bare.html") });
    assert.match(b, /\[gate DR-A4\]/, `裸 onclick 应命中 DR-A4：\n${b}`);
    assert.doesNotMatch(b, /\[gate CS-2\]/, `裸 onclick 不该报 CS-2（与 DR-A4 重叠）：\n${b}`);

    // 元素级判定：minified 单行 HTML 里，旁边元素带 tabindex 也不该让 DR-A4 漏报（旧行级实现会漏）
    writeFileSync(
      join(dir, "minified.html"),
      '<!DOCTYPE html><html><head><style>html{overflow-x:clip}:focus-visible{outline:2px solid #111}</style></head>'
        + '<body><div onclick="go()">x</div><span tabindex="3">y</span></body></html>',
    );
    const c = await design_audit.execute({ target: join(dir, "minified.html") });
    assert.match(c, /\[gate DR-A4\]/, `minified 单行里 DR-A4 不该漏报：\n${c}`);
    assert.match(c, /\[gate DR-A8\]/, `同一行的正数 tabindex 也应照报：\n${c}`);

    // 属性正则三种形态（2026-09-30 与上游对齐）：
    //   Vue `@click` 必须命中（旧 `\b@click` 永不成立 → 漏报）
    //   `data-onclick` 不得误命中（否定式后顾）
    //   大写 `ONCLICK` 必须命中（/i）
    writeFileSync(join(dir, "vue.html"), page('<div @click="go()">x</div>'));
    assert.match(await design_audit.execute({ target: join(dir, "vue.html") }), /\[gate DR-A4\]/, "Vue @click 应命中 DR-A4");
    writeFileSync(join(dir, "dataattr.html"), page('<div data-onclick="go()">x</div>'));
    assert.doesNotMatch(await design_audit.execute({ target: join(dir, "dataattr.html") }), /\[gate DR-A4\]/, "data-onclick 不该命中 DR-A4");
    writeFileSync(join(dir, "upper.html"), page('<DIV ONCLICK="go()">x</DIV>'));
    assert.match(await design_audit.execute({ target: join(dir, "upper.html") }), /\[gate DR-A4\]/, "大写 ONCLICK 应命中 DR-A4");

    // JSX 形态：onClick={() => go()} 内含 ">"，属性扫描不该被截断
    writeFileSync(join(dir, "jsx.tsx"), 'export const A = () => <div onClick={() => go()} role="button">x</div>;\n');
    const d = await design_audit.execute({ target: join(dir, "jsx.tsx") });
    assert.doesNotMatch(d, /\[gate DR-A4\]/, `带 role 的 JSX div 不该报 DR-A4：\n${d}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("回归 gate 14：transition 简写也认（含 border- 守卫与 accordion 豁免）", async () => {
  const { design_audit } = tools();
  const dir = mkdtempSync(join(tmpdir(), "dr-g14-"));
  const page = (css) =>
    `<!DOCTYPE html><html><head><style>html{overflow-x:clip}\nbody{font-family:Inter Tight,sans-serif}\n${css}\n</style></head><body><p>x</p></body></html>`;
  try {
    // 正例：简写 transition 动画 width（旧实现只认 transition-property，会漏）
    writeFileSync(join(dir, "shorthand.html"), page(".card{transition:width .3s ease}"));
    const a = await design_audit.execute({ target: join(dir, "shorthand.html") });
    assert.match(a, /\[gate 14\]/, `transition 简写动画 width 应命中 gate 14：\n${a}`);

    // 正例：@keyframes 帧内动画 height（非 accordion）
    writeFileSync(join(dir, "kf.html"), page("@keyframes grow{from{height:0}to{height:120px}}\n.panel{animation:grow .4s}"));
    const b = await design_audit.execute({ target: join(dir, "kf.html") });
    assert.match(b, /\[gate 14\]/, `keyframes 动画 height 应命中 gate 14：\n${b}`);

    // 反例：border-width（?<!border- 守卫）与 accordion 的 height 豁免
    writeFileSync(join(dir, "ok.html"), page(".input{transition:border-width .2s}\n.accordion-panel{transition:height .3s}"));
    const c = await design_audit.execute({ target: join(dir, "ok.html") });
    assert.doesNotMatch(c, /\[gate 14\]/, `border-width / accordion height 不该命中 gate 14：\n${c}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
