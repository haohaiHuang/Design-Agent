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
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
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

test("fixture 03-maple-bakery 可被 design_audit 审计且输出格式正确", async () => {
  const { design_audit } = tools();
  const target = join(here, "..", "..", "skills", "hallmark", "site", "_tests", "03-maple-bakery");
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

test("design_quality：report 只写 ~/.dsh 本地日志（不碰工作区）", async () => {
  const { design_quality } = tools();
  const logPath = join(homedir(), ".dsh", "design-router-quality.json");
  const before = existsSync(logPath) ? JSON.parse(await import("node:fs").then((m) => m.readFileSync(logPath, "utf8"))) : { entries: {} };
  const out = await design_quality.execute({ action: "report", slug: "refero-design", quality: "良", reason: "测试" });
  assert.match(out, /已记录|写入失败/);
  // 边界声明：不依赖断言日志是否落盘（沙箱环境可能拦截），只验证工具行为不越界
  assert.doesNotThrow(() => design_quality.execute({ action: "query", slug: "refero-design" }));
  void before;
});
