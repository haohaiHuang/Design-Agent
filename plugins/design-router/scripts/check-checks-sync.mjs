#!/usr/bin/env node
/**
 * check-checks-sync.mjs — 核对 pi 版 checks（TS）与 DSH 版 checks（MJS）的 gate 覆盖一致性
 *
 * 背景：design-router 的 checks/ 由 my-pi-skills/extensions/design-router/checks/ 移植（TS→MJS）。
 * 未来 pi 版更新检查器时，阈值细节无法逐行 diff，容易漏同步。本脚本从两版提取
 * 实际使用的 gate 号（排除类型定义里的字符串），对比覆盖是否一致。
 *
 * 2026-09-30 补漏：只比数字 gate 会漏掉带前缀的规则族（DR-* / KS-* / CS-* / EM-*）。
 * 实测过由此产生的假绿——上游 a11y 有 DR-A3/A4/A5/A7/A8，DSH 的 a11y.mjs 没有，
 * 脚本当时仍打印"gate 覆盖一致"。现在数字 gate 按文件比、带前缀的规则族按**全体并集**比
 * （文件重组不该造成假差异：DSH 把 EM-2/3/5 放在 layout.mjs，上游放在 motion.ts）。
 * 已登记差异放 KNOWN_RULE_GAPS（登记会腐烂：不再差异时要报"登记过期"）。
 *
 * 同时做**技能树指纹对账**：`skills/design-references/` 的内容指纹在三处（DSH 仓库 / pi 仓库 /
 * 已安装 ~/.agents/skills）必须相同——这是"资源目录必须一致"的机械保证（manifest.designReferencesHash
 * 就是同一个值）。路由短名单（ROUTES）有意分叉，不参与该项比对。
 *
 * 用法：
 *   node plugins/design-router/scripts/check-checks-sync.mjs
 *   node plugins/design-router/scripts/check-checks-sync.mjs /path/to/my-pi-skills/extensions/design-router/checks
 *
 * 退出码：0 = 全部一致；1 = 存在差异（CI 可挂）
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { skillTreeHash } from "./skill-hash.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DSH_CHECKS = join(HERE, "../checks");
// 默认 ~/my-pi-skills（可用 PI_SKILLS_CHECKS 环境变量或显式路径参数覆盖）
const PI_CHECKS =
  process.env.PI_SKILLS_CHECKS ||
  process.argv[2] ||
  join(homedir(), "my-pi-skills", "extensions", "design-router", "checks");

/**
 * 已登记的规则族差异（登记会腐烂：不再差异时脚本报"登记过期"）。
 *
 * 2026-09-30 两份登记先后清空，可作范式：
 *   · DR-A3/A4/A5/A7/A8 —— DSH 移植补齐后删除（a11y.mjs）
 *   · EM-1/EM-4/EM-5/EM-17 —— 上游 `e4ae451` 按共享 workflow.md 改号后（EM-1→EM-3、EM-4→EM-5、
 *     will-change→EM-17）两侧编号完全一致，四条登记一并删除。
 * 注意本表只登记**编号集合**差异；文档层面的"某条 EM 没有机器 gate"（如 EM-1 由 gate 10 覆盖、
 * EM-4/EM-6~EM-10 属视觉层自查）不是集合差异，记在 docs/cross-repo/README.md 的「已知差异」表里。
 */
const KNOWN_RULE_GAPS = {};

/**
 * 提取实际使用的 gate 标识（排除类型定义、注释里的字符串）。
 * 返回 { numeric: ["24", …], prefixed: ["DR-A3", …] }：
 * 数字 gate 全局唯一，按文件比；带前缀的规则族（DR-* / KS-* / CS-* / EM-*）按全体并集比。
 */
function extractGates(content) {
  const numeric = new Set();
  const prefixed = new Set();
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
    if (/^\s*(interface|type|export interface|export type)\b/.test(trimmed)) continue;
    // 带前缀规则族：代码形状两侧不同 —— DSH 移植版写对象字面量 `gate: "EM-2"`，
    // 上游 TS 走 `report("EM-1", …)` 之类的调用，所以这里按**字符串字面量**取，
    // 不要求出现在 gate: 后面（注释行与测试文件已排除，不会误收文档里的提及）。
    for (const m0 of trimmed.matchAll(/["']([A-Z]{2,3}-[A-Z]?\d+[a-z]?)["']/g)) prefixed.add(m0[1]);
    const m = trimmed.match(/gate[\s:]*["']?(\d+)[a-z-]*["']?/i) || trimmed.match(/["']gate\s+(\d+)["']/i);
    if (m) numeric.add(m[1]);
  }
  return {
    numeric: [...numeric].sort((a, b) => Number(a) - Number(b)),
    prefixed: [...prefixed],
  };
}

function checkDir(label, dir, base) {
  if (!existsSync(dir)) {
    console.log(`⚠️  ${label} 目录不存在: ${dir}`);
    return null;
  }
  const out = { numeric: {}, prefixed: new Set() };
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".ts") && !f.endsWith(".mjs")) continue;
    // 排除测试与运行器：它们扫描的 gate 号取决于测试怎么写（如 kill-slop.test 顺带断言
    // typography 的 gate 1/38），与"检查器覆盖"无关 —— 早先它会报出两条假差异。
    if (/\.test\.(ts|mjs)$/.test(f) || /^run-tests\./.test(f)) continue;
    const content = readFileSync(join(dir, f), "utf8");
    const { numeric, prefixed } = extractGates(content);
    const name = f.replace(/\.(ts|mjs)$/, "");
    if (numeric.length) out.numeric[name] = numeric;
    for (const id of prefixed) out.prefixed.add(id);
  }
  return out;
}

const pi = checkDir("pi", PI_CHECKS);
const dsh = checkDir("dsh", DSH_CHECKS);
if (!pi || !dsh) process.exit(1);

const allFiles = new Set([...Object.keys(pi.numeric), ...Object.keys(dsh.numeric)]);
let fail = 0;
for (const f of [...allFiles].sort()) {
  const p = pi.numeric[f] || [];
  const d = dsh.numeric[f] || [];
  const same = JSON.stringify(p) === JSON.stringify(d);
  if (same) {
    console.log(`✅ ${f}: ${p.length ? p.join(",") : "(纯类型/工具，无 gate)"}`);
  } else {
    fail++;
    console.log(`⚠️  ${f}: pi=[${p.join(",")}] dsh=[${d.join(",")}] — 需要同步`);
  }
}

// 带前缀规则族：按全体并集比（文件重组不算差异），已知缺口走登记表
const onlyPi = [...pi.prefixed].filter((x) => !dsh.prefixed.has(x)).sort();
const onlyDsh = [...dsh.prefixed].filter((x) => !pi.prefixed.has(x)).sort();
const unregistered = [];
for (const id of onlyPi) {
  if (KNOWN_RULE_GAPS[id]) console.log(`⚠️  ${id}: ${KNOWN_RULE_GAPS[id]}`);
  else unregistered.push(`pi 有 dsh 无: ${id}`);
}
for (const id of onlyDsh) {
  if (KNOWN_RULE_GAPS[id]) console.log(`⚠️  ${id}: ${KNOWN_RULE_GAPS[id]}`);
  else unregistered.push(`dsh 有 pi 无: ${id}`);
}
// 登记过期：登记过的 id 若已两侧都有（或差异消失），登记要删
const stale = Object.keys(KNOWN_RULE_GAPS).filter(
  (id) => !onlyPi.includes(id) && !onlyDsh.includes(id),
);
for (const id of stale) console.log(`⚠️  登记过期：${id} 两侧已一致，请从 KNOWN_RULE_GAPS 删除`);
if (onlyPi.length === 0 && onlyDsh.length === 0) {
  console.log(`✅ 规则族并集一致（${dsh.prefixed.size} 项）`);
}

console.log("");
if (fail || unregistered.length || stale.length) {
  if (fail) console.log(`❌ ${fail} 个文件数字 gate 覆盖不一致——对照 pi 版检查移植是否完整。`);
  for (const u of unregistered) console.log(`❌ 未登记差异 ${u}`);
  if (stale.length) console.log(`❌ ${stale.length} 条登记过期`);
  fail += unregistered.length + stale.length;
} else {
  console.log("✅ 数字 gate 按文件一致；规则族差异均已登记。");
}

// ---------- 技能树指纹对账（所有存在的副本必须相同）----------
// 平台目录约定取自上游 `docs/skill-sync-map.md`（pi 的规范路径是 ~/.pi/agent/skills，不是 ~/.pi/skills）。
const SKILL_COPIES = [
  ["DSH 仓库", join(HERE, "../../../skills/design-references")],              // plugins/design-router/scripts → 仓库根
  ["pi 仓库", join(PI_CHECKS, "../../../skills/design-references")],           // <pi>/extensions/design-router/checks → <pi>
  ["pi", join(homedir(), ".pi", "agent", "skills", "design-references")],
  ["共享层", join(homedir(), ".agents", "skills", "design-references")],
  ["workbuddy", join(homedir(), ".workbuddy", "skills", "design-references")],
  ["codex", join(homedir(), ".codex", "skills", "design-references")],
  ["claude", join(homedir(), ".claude", "skills", "design-references")],
  ["trae-ide", join(homedir(), ".trae-cn", "skills", "design-references")],
  ["trae-work", join(homedir(), ".trae", "skills", "design-references")],
];

console.log("\n技能树指纹（skills/design-references 全树，各副本必须一致）：");
const hashes = [];
const missing = [];
for (const [label, dir] of SKILL_COPIES) {
  if (!existsSync(dir)) {
    missing.push(label);
    continue;
  }
  const h = skillTreeHash(dir);
  hashes.push([label, h]);
  console.log(`  ${label.padEnd(12)} ${h}`);
}
const uniq = new Set(hashes.map(([, h]) => h));
if (hashes.length === 0) {
  fail++;
  console.log("  ❌ 一个技能副本都没找到——检查路径或参数");
} else if (uniq.size === 1) {
  console.log(`✅ ${hashes.length} 处技能副本内容一致${missing.length ? `（未安装：${missing.join(" / ")}）` : ""}。`);
} else {
  fail++;
  console.log(`❌ 技能副本内容不一致（${uniq.size} 种指纹）——资源目录必须一致：改 registry.md 后整文件复制到其余副本。`);
  const byHash = {};
  for (const [label, h] of hashes) (byHash[h] ||= []).push(label);
  for (const [h, labels] of Object.entries(byHash)) console.log(`   ${h}: ${labels.join(", ")}`);
}

console.log("");
if (fail) process.exit(1);
